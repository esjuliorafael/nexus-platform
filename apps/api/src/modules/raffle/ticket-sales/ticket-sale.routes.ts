import { FastifyInstance } from "fastify";
import {
  TicketAvailabilityConflictError,
  ticketSaleService,
} from "./ticket-sale.service";
import { TicketStatus } from "@prisma/client-raffle";
import { z } from "zod";
import { mpService } from "../../store/payments/mercadopago.service";
import { customerPhoneSchema } from "../../../utils/customer-phone";
import { requireAdminActor } from "../../../utils/admin-authorization";
import { RaffleCouponError } from "../coupons/raffle-coupon.service";
import { getRaffleMetaMessagingCostOverview } from "./raffle-meta-messaging-cost.service";

export async function ticketSaleRoutes(server: FastifyInstance) {
  const rafflePrisma = server.rafflePrisma;
  const storePrisma = server.storePrisma;

  const attachWhatsappLogs = async (
    participation: NonNullable<Awaited<ReturnType<typeof ticketSaleService.getParticipationAdmin>>>,
  ) => {
    const whatsappLogs = await storePrisma.whatsappMessageLog.findMany({
      where: { ticketSaleId: { in: participation.ticketSaleIds } },
      orderBy: { sentAt: "desc" },
    });

    return { ...participation, whatsappLogs };
  };

  // Admin Routes
  server.get("/admin/participations", { preHandler: [server.authenticate] }, async () => {
    return ticketSaleService.getAllParticipationsAdmin(rafflePrisma);
  });

  server.get("/admin/participations/:participationId", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { participationId } = request.params as { participationId: string };
    const participation = await ticketSaleService.getParticipationAdmin(rafflePrisma, participationId);
    if (!participation) return reply.status(404).send({ message: "Raffle participation not found" });

    return attachWhatsappLogs(participation);
  });

  server.get("/admin/raffles/:raffleId/overview", { preHandler: [server.authenticate] }, async (request, reply) => {
    const paramsSchema = z.object({
      raffleId: z.coerce.number().int().positive(),
    });
    try {
      const { raffleId } = paramsSchema.parse(request.params);
      const [overview, messagingCost] = await Promise.all([
        ticketSaleService.getRaffleOverviewAdmin(rafflePrisma, raffleId),
        getRaffleMetaMessagingCostOverview({
          rafflePrisma,
          storePrisma,
          raffleId,
        }),
      ]);
      if (!overview) {
        return reply.status(404).send({ message: "Raffle not found" });
      }
      return { ...overview, messagingCost };
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      throw error;
    }
  });

  server.post("/admin/raffles/:raffleId/participations", { preHandler: [server.authenticate] }, async (request, reply) => {
    const paramsSchema = z.object({
      raffleId: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      tickets: z
        .array(z.string().regex(/^\d+$/, "Ticket numbers must be numeric"))
        .min(1, "At least one ticket is required"),
      customerName: z.string().trim().min(2).max(120),
      customerPhone: customerPhoneSchema,
      customerState: z.string().trim().max(80).nullable().optional(),
      couponCode: z.string().trim().min(1).max(40).nullable().optional(),
    });

    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { raffleId } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const reservation = await ticketSaleService.reserveTickets(
        rafflePrisma,
        storePrisma,
        {
          ...body,
          raffleId,
          paymentMethod: "TRANSFER",
          administrativeOverride: true,
          actor,
        },
      );
      const participation = await ticketSaleService.getParticipationAdmin(
        rafflePrisma,
        reservation.reservationId,
      );
      return reply.status(201).send(participation);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      if (error instanceof TicketAvailabilityConflictError) {
        return reply.status(409).send({
          message: "Uno o más boletos ya no están disponibles.",
          code: "TICKETS_UNAVAILABLE",
          ticketNumbers: error.ticketNumbers,
        });
      }
      if (error instanceof RaffleCouponError) {
        return reply.status(400).send({
          message: error.message,
          code: "RAFFLE_COUPON_INVALID",
        });
      }
      if (error?.message === "INVALID_TICKET_NUMBERS") {
        return reply.status(400).send({
          message: "Uno o más números no pertenecen a esta rifa.",
        });
      }
      if (error?.message === "RAFFLE_UNAVAILABLE") {
        return reply.status(409).send({
          message: "La rifa ya no admite participaciones.",
        });
      }
      throw error;
    }
  });

  server.patch("/admin/participations/:participationId/status", { preHandler: [server.authenticate] }, async (request, reply) => {
    const schema = z.object({ paymentStatus: z.enum(["PAID", "CANCELLED"]) });
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { participationId } = request.params as { participationId: string };
      const { paymentStatus } = schema.parse(request.body);
      const participation = await ticketSaleService.updateParticipationStatus(
        rafflePrisma,
        participationId,
        paymentStatus,
        actor,
      );
      if (!participation) return reply.status(409).send({ message: "La participación ya no está pendiente." });
      return attachWhatsappLogs(participation);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      if (error?.message === "MERCADOPAGO_PAYMENT_REQUIRES_WEBHOOK") {
        return reply.status(409).send({
          message: "Los pagos con tarjeta solo pueden confirmarse mediante Mercado Pago.",
        });
      }
      if (error?.message === "RAFFLE_RESULT_ALREADY_PUBLISHED") {
        return reply.status(409).send({
          message: "El resultado ya fue publicado; no es posible confirmar pagos posteriores a la rifa.",
        });
      }
      throw error;
    }
  });

  server.post("/admin/participations/:participationId/restore", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { participationId } = request.params as { participationId: string };
      const participation = await ticketSaleService.restoreParticipation(
        rafflePrisma,
        storePrisma,
        participationId,
        actor,
      );
      if (!participation) {
        return reply.status(409).send({
          message: "La participación ya no está cancelada o no puede restaurarse.",
        });
      }
      return attachWhatsappLogs(participation);
    } catch (error: any) {
      if (error instanceof TicketAvailabilityConflictError) {
        return reply.status(409).send({
          message: `No se puede restaurar: ${error.ticketNumbers.length === 1 ? "el boleto" : "los boletos"} ${error.ticketNumbers.join(", ")} ${error.ticketNumbers.length === 1 ? "ya no está disponible" : "ya no están disponibles"}.`,
          code: "TICKETS_UNAVAILABLE",
          ticketNumbers: error.ticketNumbers,
        });
      }
      if (error?.message === "RAFFLE_RESULT_ALREADY_PUBLISHED") {
        return reply.status(409).send({
          message: "Los resultados ya fueron publicados; no es posible restaurar esta participación.",
        });
      }
      if (error?.message === "MERCADOPAGO_PARTICIPATION_CANNOT_BE_RESTORED") {
        return reply.status(409).send({
          message: "Una participación de Mercado Pago no puede restaurarse como pagada sin una transacción aprobada.",
        });
      }
      if (error?.message === "PARTICIPATION_RESTORE_CONFLICT") {
        return reply.status(409).send({
          message: "La participación cambió mientras se restauraba. Actualiza la pantalla e inténtalo nuevamente.",
        });
      }
      throw error;
    }
  });

  server.post("/admin/participations/:participationId/restore-paid", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { participationId } = request.params as { participationId: string };
      const participation = await ticketSaleService.restoreParticipation(
        rafflePrisma,
        storePrisma,
        participationId,
        actor,
        true,
      );
      if (!participation) {
        return reply.status(409).send({
          message: "La participación ya no está cancelada o no puede restaurarse.",
        });
      }
      return attachWhatsappLogs(participation);
    } catch (error: any) {
      if (error instanceof TicketAvailabilityConflictError) {
        return reply.status(409).send({
          message: `No se puede restaurar: ${error.ticketNumbers.length === 1 ? "el boleto" : "los boletos"} ${error.ticketNumbers.join(", ")} ${error.ticketNumbers.length === 1 ? "ya no está disponible" : "ya no están disponibles"}.`,
          code: "TICKETS_UNAVAILABLE",
          ticketNumbers: error.ticketNumbers,
        });
      }
      if (error?.message === "RAFFLE_RESULT_ALREADY_PUBLISHED") {
        return reply.status(409).send({
          message: "Los resultados ya fueron publicados; no es posible restaurar esta participación.",
        });
      }
      if (error?.message === "MERCADOPAGO_PARTICIPATION_CANNOT_BE_RESTORED") {
        return reply.status(409).send({
          message: "Una participación de Mercado Pago no puede restaurarse como pagada sin una transacción aprobada.",
        });
      }
      if (error?.message === "PARTICIPATION_RESTORE_CONFLICT") {
        return reply.status(409).send({
          message: "La participación cambió mientras se restauraba. Actualiza la pantalla e inténtalo nuevamente.",
        });
      }
      throw error;
    }
  });

  server.patch("/admin/participations/:participationId/participant", { preHandler: [server.authenticate] }, async (request, reply) => {
    const schema = z.object({
      customerName: z.string().trim().min(2).max(120),
      customerPhone: customerPhoneSchema,
      customerState: z.string().trim().max(80).nullable().optional(),
    });

    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { participationId } = request.params as { participationId: string };
      const data = schema.parse(request.body);
      const participation = await ticketSaleService.updateParticipationParticipant(
        rafflePrisma,
        participationId,
        data,
        actor,
      );
      if (!participation) {
        return reply.status(404).send({ message: "Raffle participation not found" });
      }
      return attachWhatsappLogs(participation);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.post("/admin/participations/:participationId/resend-whatsapp", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { participationId } = request.params as { participationId: string };
      return await ticketSaleService.resendParticipationNotification(
        rafflePrisma,
        storePrisma,
        participationId,
        actor,
      );
    } catch (error: any) {
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.post("/admin/participations/:participationId/refund", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { participationId } = request.params as { participationId: string };
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      return await mpService.refundRaffleParticipation(participationId, actor);
    } catch (error: any) {
      return reply.status(error?.statusCode || 500).send({
        message: error?.message || "No se pudo devolver el pago de la participación.",
      });
    }
  });

  server.get("/admin", { preHandler: [server.authenticate] }, async (request) => {
    const { raffleId, status, search } = request.query as any;
    return ticketSaleService.getAllAdmin(rafflePrisma, {
      raffleId: raffleId ? parseInt(raffleId) : undefined,
      status: status as TicketStatus,
      search,
    });
  });

  server.get("/admin/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const sale = await ticketSaleService.getById(rafflePrisma, parseInt(id));
    if (!sale) return reply.status(404).send({ message: "Ticket sale not found" });
    return sale;
  });

  server.delete("/admin/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const actor = await requireAdminActor(server, request, reply);
    if (!actor) return;
    const { id } = request.params as { id: string };
    await ticketSaleService.delete(rafflePrisma, parseInt(id), actor);
    return { success: true };
  });
}
