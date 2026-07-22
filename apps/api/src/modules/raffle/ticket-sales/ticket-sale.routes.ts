import { FastifyInstance } from "fastify";
import { ticketSaleService } from "./ticket-sale.service";
import { TicketStatus } from "@prisma/client-raffle";
import { z } from "zod";
import { mpService } from "../../store/payments/mercadopago.service";
import { customerPhoneSchema } from "../../../utils/customer-phone";

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

  server.patch("/admin/participations/:participationId/status", { preHandler: [server.authenticate] }, async (request, reply) => {
    const schema = z.object({ paymentStatus: z.enum(["PAID", "CANCELLED"]) });
    try {
      const { participationId } = request.params as { participationId: string };
      const { paymentStatus } = schema.parse(request.body);
      const participation = await ticketSaleService.updateParticipationStatus(
        rafflePrisma,
        participationId,
        paymentStatus,
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
      const { participationId } = request.params as { participationId: string };
      const data = schema.parse(request.body);
      const participation = await ticketSaleService.updateParticipationParticipant(
        rafflePrisma,
        participationId,
        data,
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

  server.post("/admin/participations/:participationId/refund", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { participationId } = request.params as { participationId: string };
    try {
      return await mpService.refundRaffleParticipation(participationId);
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

  server.delete("/admin/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await ticketSaleService.delete(rafflePrisma, parseInt(id));
    return { success: true };
  });
}
