import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { raffleService } from "./raffle.service";
import { TicketAvailabilityConflictError, ticketSaleService } from "../ticket-sales/ticket-sale.service";
import { RaffleCouponError } from "../coupons/raffle-coupon.service";
import {
  subscribeToAllTicketAvailability,
  subscribeToTicketAvailability,
} from "../ticket-sales/ticket-availability.events";
import {
  createRaffleSchema,
  isClosedRaffleUniverse,
  updateRaffleSchema,
  updateRafflePublicationSchema,
  updateRaffleFeaturedSchema,
  reorderFeaturedRafflesSchema,
  updateRaffleStatusSchema,
  validateParticipationWindow,
} from "./raffle.schema";
import { canParticipateInRaffle, getRaffleParticipationState } from "./raffle-access";
import { rafflePaymentHoldService } from "../ticket-sales/raffle-payment-hold.service";
import {
  reconcileRaffleOpeningNotifications,
  scheduleRaffleOpeningSubscription,
} from "../../../services/raffle-opening-notification.service";

const reserveTicketsBodySchema = z.object({
  tickets: z.array(z.string().regex(/^\d+$/, "Ticket numbers must be numeric")).min(1, "At least one ticket is required"),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerState: z.string().optional(),
  paymentMethod: z.enum(["TRANSFER", "MERCADOPAGO"]).optional().default("TRANSFER"),
  couponCode: z.string().trim().min(1).max(40).optional(),
  earlyAccessToken: z.string().min(1).optional(),
});

const earlyAccessBodySchema = z.object({
  code: z.string().trim().min(4).max(64),
});

const openingReminderBodySchema = z.object({
  phone: z.string().trim().min(10).max(24),
});

const convertPaymentHoldSchema = z.object({
  customerPhone: z.string().trim().min(1),
});

const normalizeReminderPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) return digits.slice(3);
  if (digits.startsWith("52") && digits.length === 12) return digits.slice(2);
  return digits;
};

const normalizeWinningNumber = (
  value: string,
  ticketQuantity: number,
  opportunities: number,
) => {
  const universe = ticketQuantity * opportunities;
  const isPowerOfTen = universe >= 10 && /^10*$/.test(String(universe));
  const digits = isPowerOfTen ? Math.log10(universe) : String(universe).length;
  if (value.length > digits) return null;

  const normalized = value.padStart(digits, "0");
  const numericValue = Number(normalized);
  const minimum = isPowerOfTen ? 0 : 1;
  const maximum = isPowerOfTen ? universe - 1 : universe;
  if (!Number.isInteger(numericValue) || numericValue < minimum || numericValue > maximum) return null;
  return normalized;
};

const getSseHeaders = (origin?: string) => ({
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
  ...(origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
      }
    : {}),
});

export async function raffleRoutes(server: FastifyInstance) {
  // Safe access to prisma
  const getPrisma = () => {
    if (!server.rafflePrisma) {
      throw new Error("Raffle Prisma client is not initialized. Is RAFFLE_ENABLED=true?");
    }
    return server.rafflePrisma;
  };

  // Public Routes
  server.get("/", async () => {
    return raffleService.getAllActive(getPrisma());
  });

  server.get("/results/recent", async () => {
    return raffleService.getRecentResults(getPrisma());
  });

  server.get("/ticket-availability/events", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, getSseHeaders(request.headers.origin));
    reply.raw.write("event: ready\ndata: {}\n\n");

    const unsubscribe = subscribeToAllTicketAvailability((event) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => reply.raw.write(": keepalive\n\n"), 25_000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  server.post("/:id/early-access", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes",
      },
    },
  }, async (request, reply) => {
    const raffleId = Number((request.params as { id: string }).id);
    let body;
    try {
      body = earlyAccessBodySchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }

    const raffle = await getPrisma().raffle.findFirst({
      where: { id: raffleId, status: "ACTIVE", published: true },
      select: {
        id: true,
        status: true,
        published: true,
        participationStartsAt: true,
        participationEndsAt: true,
        earlyAccessEnabled: true,
        earlyAccessCodeHash: true,
      },
    });
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });
    if (getRaffleParticipationState(raffle) !== "EARLY_ACCESS" || !raffle.earlyAccessCodeHash) {
      return reply.status(409).send({ message: "El acceso anticipado no está disponible", code: "EARLY_ACCESS_UNAVAILABLE" });
    }

    const isValid = await bcrypt.compare(body.code, raffle.earlyAccessCodeHash);
    if (!isValid) {
      return reply.status(401).send({ message: "El código de acceso no es válido", code: "INVALID_EARLY_ACCESS_CODE" });
    }

    const secondsUntilPublicOpening = Math.max(
      60,
      Math.ceil(((raffle.participationStartsAt?.getTime() ?? Date.now()) - Date.now()) / 1000) + 300,
    );
    const accessToken = server.jwt.sign(
      { scope: "raffle-early-access", raffleId },
      { expiresIn: secondsUntilPublicOpening },
    );
    return {
      accessToken,
      expiresAt: raffle.participationStartsAt?.toISOString() ?? null,
    };
  });

  server.post("/:id/opening-reminders", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "10 minutes",
      },
    },
  }, async (request, reply) => {
    const raffleId = Number((request.params as { id: string }).id);
    if (!Number.isInteger(raffleId)) {
      return reply.status(400).send({ message: "Identificador de rifa inválido" });
    }

    let body;
    try {
      body = openingReminderBodySchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }

    const phone = normalizeReminderPhone(body.phone);
    if (phone.length < 10 || phone.length > 15) {
      return reply.status(400).send({
        message: "Ingresa un número de WhatsApp válido",
        code: "INVALID_PHONE",
      });
    }

    const raffle = await getPrisma().raffle.findFirst({
      where: { id: raffleId, status: "ACTIVE", published: true },
      select: {
        id: true,
        status: true,
        published: true,
        participationStartsAt: true,
        participationEndsAt: true,
        earlyAccessEnabled: true,
      },
    });
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });

    const participationState = getRaffleParticipationState(raffle);
    if (
      !raffle.participationStartsAt ||
      !["UPCOMING", "EARLY_ACCESS"].includes(participationState)
    ) {
      return reply.status(409).send({
        message: participationState === "CLOSED"
          ? "La participación en esta rifa ya cerró"
          : "La rifa ya está disponible",
        code: "OPENING_REMINDER_UNAVAILABLE",
      });
    }

    const existing = await getPrisma().raffleOpeningSubscription.findUnique({
      where: { raffleId_phone: { raffleId, phone } },
    });
    const alreadyRegistered = Boolean(
      existing && ["PENDING", "PROCESSING", "SENT"].includes(existing.status),
    );

    const subscription = await getPrisma().raffleOpeningSubscription.upsert({
      where: { raffleId_phone: { raffleId, phone } },
      create: {
        raffleId,
        phone,
        status: "PENDING",
      },
      update: alreadyRegistered
        ? { consentAt: new Date() }
        : {
            status: "PENDING",
            consentAt: new Date(),
            lastError: null,
          },
    });

    await scheduleRaffleOpeningSubscription(subscription.id);

    return {
      success: true,
      alreadyRegistered,
      message: alreadyRegistered
        ? "Ya registramos este número para avisarte"
        : "Te avisaremos por WhatsApp cuando la rifa esté disponible",
    };
  });

  server.get("/:id/ticket-availability/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    const raffle = await raffleService.getPublicById(getPrisma(), raffleId);
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });

    reply.hijack();
    reply.raw.writeHead(200, getSseHeaders(request.headers.origin));
    reply.raw.write("event: ready\ndata: {}\n\n");

    const unsubscribe = subscribeToTicketAvailability(raffleId, (event) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => reply.raw.write(": keepalive\n\n"), 25_000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffle = await raffleService.getPublicById(getPrisma(), parseInt(id));
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });
    return raffle;
  });

  server.get("/:id/occupied-tickets", async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    const raffle = await raffleService.getPublicById(getPrisma(), raffleId);
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });

    const [occupied, held] = await Promise.all([
      getPrisma().ticketSale.findMany({
        where: { raffleId, paymentStatus: { in: ["PAID", "PENDING"] } },
        select: { ticketNumber: true },
      }),
      getPrisma().rafflePaymentHoldTicket.findMany({
        where: { raffleId, hold: { status: { in: ["ACTIVE", "PROCESSING"] }, expiresAt: { gt: new Date() } } },
        select: { ticketNumber: true },
      }),
    ]);

    return Array.from(new Set([...occupied, ...held].map((entry) => entry.ticketNumber)));
  });

  server.get("/:id/ticket-availability", async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    const raffle = await raffleService.getPublicById(getPrisma(), raffleId);
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });

    const [occupied, held] = await Promise.all([
      getPrisma().ticketSale.findMany({
        where: { raffleId, paymentStatus: { in: ["PAID", "PENDING"] } },
        select: { ticketNumber: true, paymentStatus: true },
      }),
      getPrisma().rafflePaymentHoldTicket.findMany({
        where: { raffleId, hold: { status: { in: ["ACTIVE", "PROCESSING"] }, expiresAt: { gt: new Date() } } },
        select: { ticketNumber: true },
      }),
    ]);
    const availability = new Map<string, "PAID" | "RESERVED">();
    held.forEach((entry: { ticketNumber: string }) => availability.set(entry.ticketNumber, "RESERVED"));
    occupied.forEach((sale: { ticketNumber: string; paymentStatus: "PAID" | "PENDING" }) => availability.set(sale.ticketNumber, sale.paymentStatus === "PAID" ? "PAID" : "RESERVED"));
    return Array.from(availability, ([ticketNumber, status]) => ({ ticketNumber, status }));
  });

  server.post("/:id/tickets", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    const raffle = await raffleService.getById(getPrisma(), raffleId);
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });

    try {
      const body = reserveTicketsBodySchema.parse(request.body);
      let earlyAccessAuthorized = false;
      if (body.earlyAccessToken) {
        try {
          const payload = server.jwt.verify<{ scope?: string; raffleId?: number }>(body.earlyAccessToken);
          earlyAccessAuthorized = payload.scope === "raffle-early-access" && payload.raffleId === raffleId;
        } catch {
          earlyAccessAuthorized = false;
        }
      }
      if (!canParticipateInRaffle(raffle, earlyAccessAuthorized)) {
        const participationState = getRaffleParticipationState(raffle);
        return reply.status(409).send({
          message: participationState === "CLOSED"
            ? "La participación en esta rifa ya cerró"
            : "La participación en esta rifa todavía no está disponible",
          code: participationState === "CLOSED" ? "RAFFLE_PARTICIPATION_CLOSED" : "RAFFLE_PARTICIPATION_NOT_STARTED",
        });
      }
      return await ticketSaleService.reserveTickets(getPrisma(), server.storePrisma, {
        ...body,
        raffleId,
        earlyAccessAuthorized,
      });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      if (error instanceof TicketAvailabilityConflictError) {
        return reply.status(409).send({
          message: "One or more selected tickets are no longer available",
          code: "TICKETS_UNAVAILABLE",
          ticketNumbers: error.ticketNumbers,
        });
      }
      if (error instanceof RaffleCouponError) {
        return reply.status(400).send({ message: error.message, code: "RAFFLE_COUPON_INVALID" });
      }
      if (error.message === "INVALID_TICKET_NUMBERS") {
        return reply.status(400).send({ message: "One or more ticket numbers are invalid for this raffle" });
      }
      if (error.message === "RAFFLE_UNAVAILABLE") {
        return reply.status(409).send({ message: "This raffle is not available" });
      }
      throw error;
    }
  });

  server.post("/:id/payment-holds", {
    config: { rateLimit: { max: 8, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const raffleId = Number((request.params as { id: string }).id);
    try {
      const body = reserveTicketsBodySchema.parse(request.body);
      if (body.paymentMethod !== "MERCADOPAGO") {
        return reply.status(400).send({ message: "Una retención de pago requiere Mercado Pago." });
      }
      const raffle = await raffleService.getById(getPrisma(), raffleId);
      if (!raffle) return reply.status(404).send({ message: "Raffle not found" });
      let earlyAccessAuthorized = false;
      if (body.earlyAccessToken) {
        try {
          const payload = server.jwt.verify<{ scope?: string; raffleId?: number }>(body.earlyAccessToken);
          earlyAccessAuthorized = payload.scope === "raffle-early-access" && payload.raffleId === raffleId;
        } catch {
          earlyAccessAuthorized = false;
        }
      }
      return await rafflePaymentHoldService.create(getPrisma(), server.storePrisma, {
        ...body,
        raffleId,
        earlyAccessAuthorized,
      });
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      if (error instanceof TicketAvailabilityConflictError) {
        return reply.status(409).send({ message: "One or more selected tickets are no longer available", code: "TICKETS_UNAVAILABLE", ticketNumbers: error.ticketNumbers });
      }
      if (error instanceof RaffleCouponError) return reply.status(400).send({ message: error.message, code: "RAFFLE_COUPON_INVALID" });
      if (error?.message === "INVALID_TICKET_NUMBERS") return reply.status(400).send({ message: "One or more ticket numbers are invalid for this raffle" });
      if (error?.message === "RAFFLE_UNAVAILABLE") return reply.status(409).send({ message: "This raffle is not available" });
      throw error;
    }
  });

  server.post("/:id/payment-holds/:holdId/transfer", async (request, reply) => {
    const raffleId = Number((request.params as { id: string }).id);
    const { holdId } = request.params as { holdId: string };
    try {
      const body = convertPaymentHoldSchema.parse(request.body);
      return await rafflePaymentHoldService.convertToTransfer(
        getPrisma(),
        server.storePrisma,
        raffleId,
        holdId,
        body.customerPhone,
      );
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      return reply.status(error?.statusCode || 400).send({
        message: error?.message || "No se pudo cambiar el método de pago.",
        code: error?.code,
      });
    }
  });

  // Admin Routes
  server.get("/admin", { preHandler: [server.authenticate] }, async () => {
    return raffleService.getAllAdmin(getPrisma());
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    let validated;
    try {
      validated = createRaffleSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
    if (validated.winningNumber) {
      if (validated.status !== "FINISHED") {
        return reply.status(400).send({
          message: "El número ganador solo puede publicarse en una rifa finalizada",
          code: "RAFFLE_RESULT_REQUIRES_FINISHED_STATUS",
        });
      }
      const normalizedWinningNumber = normalizeWinningNumber(
        validated.winningNumber,
        validated.ticketQuantity,
        validated.opportunities,
      );
      if (!normalizedWinningNumber) {
        return reply.status(400).send({
          message: "El número ganador no pertenece al universo de la rifa",
          code: "INVALID_WINNING_NUMBER",
        });
      }
      validated.winningNumber = normalizedWinningNumber;
    }
    return raffleService.create(getPrisma(), validated);
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    let validated;
    try {
      validated = updateRaffleSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }

    const current = await getPrisma().raffle.findUnique({ where: { id: raffleId } });
    if (!current) return reply.status(404).send({ message: "Raffle not found" });

    const combinedWindow = {
      drawDate: validated.drawDate !== undefined ? validated.drawDate : current.drawDate?.toISOString() ?? null,
      participationStartsAt: validated.participationStartsAt !== undefined
        ? validated.participationStartsAt
        : current.participationStartsAt?.toISOString() ?? null,
      participationEndsAt: validated.participationEndsAt !== undefined
        ? validated.participationEndsAt
        : current.participationEndsAt?.toISOString() ?? null,
      earlyAccessEnabled: validated.earlyAccessEnabled ?? current.earlyAccessEnabled,
      earlyAccessCode: validated.earlyAccessCode,
    };
    const windowValidation = z.object({}).superRefine((_data, context) => {
      validateParticipationWindow(
        combinedWindow,
        context,
        combinedWindow.earlyAccessEnabled && !current.earlyAccessCodeHash,
      );
    }).safeParse({});
    if (!windowValidation.success) {
      return reply.status(400).send({ message: "Validation error", errors: windowValidation.error.issues });
    }

    const nextTicketQuantity = validated.ticketQuantity ?? current.ticketQuantity;
    const nextOpportunities = validated.opportunities ?? current.opportunities;
    if (!isClosedRaffleUniverse(nextTicketQuantity, nextOpportunities)) {
      return reply.status(400).send({
        message: "Las rifas simples requieren 100, 1000 o una potencia exacta de 10. Las rifas de oportunidades también admiten 99, 999 y potencias de 10 menos uno",
        code: "INVALID_RAFFLE_UNIVERSE",
      });
    }

    if (validated.winningNumber) {
      const nextStatus = validated.status ?? current.status;
      if (nextStatus !== "FINISHED") {
        return reply.status(400).send({
          message: "El número ganador solo puede publicarse en una rifa finalizada",
          code: "RAFFLE_RESULT_REQUIRES_FINISHED_STATUS",
        });
      }
      const normalizedWinningNumber = normalizeWinningNumber(
        validated.winningNumber,
        nextTicketQuantity,
        nextOpportunities,
      );
      if (!normalizedWinningNumber) {
        return reply.status(400).send({
          message: "El número ganador no pertenece al universo de la rifa",
          code: "INVALID_WINNING_NUMBER",
        });
      }
      validated.winningNumber = normalizedWinningNumber;
    }

    const universeFieldsChanged =
      nextTicketQuantity !== current.ticketQuantity ||
      nextOpportunities !== current.opportunities ||
      (validated.distribution !== undefined && validated.distribution !== current.distribution);

    if (universeFieldsChanged) {
      const activeSalesCount = await getPrisma().ticketSale.count({
        where: {
          raffleId,
          paymentStatus: { in: ["PAID", "PENDING"] },
        },
      });
      if (activeSalesCount > 0) {
        return reply.status(409).send({
          message: "Cannot modify universe fields while active ticket sales exist",
          code: "UNIVERSE_LOCKED",
        });
      }
    }

    const updated = await raffleService.update(getPrisma(), raffleId, validated);
    await reconcileRaffleOpeningNotifications(raffleId);
    return updated;
  });

  server.patch("/:id/status", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    let validated;
    try {
      validated = updateRaffleStatusSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
    const raffleId = parseInt(id);
    const updated = await raffleService.update(
      getPrisma(),
      raffleId,
      validated.status === "ACTIVE"
        ? validated
        : { ...validated, featured: false, featuredOrder: null },
    );
    await reconcileRaffleOpeningNotifications(raffleId);
    return updated;
  });

  server.patch("/:id/publication", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    let validated;
    try {
      validated = updateRafflePublicationSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
    const raffleId = parseInt(id);
    const updated = await raffleService.update(
      getPrisma(),
      raffleId,
      validated.published
        ? validated
        : { ...validated, featured: false, featuredOrder: null },
    );
    await reconcileRaffleOpeningNotifications(raffleId);
    return updated;
  });

  server.patch("/:id/featured", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    let validated;
    try {
      validated = updateRaffleFeaturedSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }

    try {
      const updated = await raffleService.updateFeatured(
        getPrisma(),
        parseInt(id),
        validated.featured,
        validated.featuredOrder,
      );
      if (!updated) return reply.status(404).send({ message: "Raffle not found" });
      return updated;
    } catch (error: any) {
      if (error?.message === "FEATURED_RAFFLE_LIMIT") {
        return reply.status(409).send({
          message: "Solo puedes destacar hasta tres rifas",
          code: "FEATURED_RAFFLE_LIMIT",
        });
      }
      if (error?.message === "RAFFLE_NOT_ELIGIBLE_FOR_FEATURED") {
        return reply.status(409).send({
          message: "Solo puedes destacar rifas activas y publicadas",
          code: "RAFFLE_NOT_ELIGIBLE_FOR_FEATURED",
        });
      }
      throw error;
    }
  });

  server.put("/featured/reorder", { preHandler: [server.authenticate] }, async (request, reply) => {
    let validated;
    try {
      validated = reorderFeaturedRafflesSchema.parse(request.body);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }

    try {
      return await raffleService.reorderFeatured(getPrisma(), validated.ids);
    } catch (error: any) {
      if (error?.message === "INVALID_FEATURED_RAFFLE_ORDER") {
        return reply.status(409).send({
          message: "El orden solo puede incluir rifas destacadas, activas y publicadas",
          code: "INVALID_FEATURED_RAFFLE_ORDER",
        });
      }
      throw error;
    }
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await raffleService.delete(getPrisma(), parseInt(id));
    return { success: true };
  });
}
