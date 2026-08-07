import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { raffleService } from "./raffle.service";
import {
  TicketAvailabilityConflictError,
  ticketSaleService,
} from "../ticket-sales/ticket-sale.service";
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
import {
  canParticipateInRaffle,
  getRaffleParticipationState,
  toPublicRaffle,
} from "./raffle-access";
import { rafflePaymentHoldService } from "../ticket-sales/raffle-payment-hold.service";
import {
  reconcileRaffleOpeningNotifications,
  scheduleRaffleOpeningSubscription,
} from "../../../services/raffle-opening-notification.service";
import {
  customerPhoneCandidates,
  customerPhoneSchema,
} from "../../../utils/customer-phone";
import { requireAdminActor } from "../../../utils/admin-authorization";
import { raffleResultService } from "./raffle-result.service";
import { raffleResultCommunicationService } from "./raffle-result-communication.service";
import { raffleDrawReminderService } from "./raffle-draw-reminder.service";
import { raffleInvitationCampaignService } from "./raffle-invitation-campaign.service";
import { getRaffleParticipationAccess } from "../ticket-sales/raffle-participation-access.service";

const reserveTicketsBodySchema = z.object({
  tickets: z
    .array(z.string().regex(/^\d+$/, "Ticket numbers must be numeric"))
    .min(1, "At least one ticket is required"),
  customerName: z.string().min(1),
  customerPhone: customerPhoneSchema,
  customerState: z.string().optional(),
  paymentMethod: z
    .enum(["TRANSFER", "MERCADOPAGO"])
    .optional()
    .default("TRANSFER"),
  couponCode: z.string().trim().min(1).max(40).optional(),
  earlyAccessToken: z.string().min(1).optional(),
  marketingConsent: z.boolean().optional().default(false),
});

const earlyAccessBodySchema = z.object({
  code: z.string().trim().min(4).max(64),
});

const openingReminderBodySchema = z.object({
  phone: customerPhoneSchema,
});

const convertPaymentHoldSchema = z.object({
  customerPhone: customerPhoneSchema,
});

const raffleResultParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const rafflePrizeResultDraftParamsSchema = raffleResultParamsSchema.extend({
  prizeId: z.coerce.number().int().positive(),
});

const rafflePrizeResultDraftBodySchema = z.object({
  referenceNumber: z.string().trim().regex(/^\d{1,20}$/),
});

const raffleResultBodySchema = z
  .object({
    results: z
      .array(
        z.object({
          prizeId: z.coerce.number().int().positive(),
          referenceNumber: z
            .string()
            .trim()
            .regex(/^\d{3,20}$/),
        }),
      )
      .min(1)
      .max(10),
  })
  .superRefine(({ results }, context) => {
    const prizeIds = results.map((result) => result.prizeId);
    if (new Set(prizeIds).size !== prizeIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["results"],
        message: "Cada premio debe aparecer una sola vez.",
      });
    }
  });

const raffleResultCampaignBodySchema = z.object({
  audience: z.enum(["WINNERS", "PARTICIPANTS"]),
});

const raffleDrawReminderScheduleBodySchema = z.object({
  scheduledFor: z.string().datetime(),
});

const raffleResultCampaignParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  campaignId: z.string().uuid(),
});

const raffleInvitationQuerySchema = z.object({
  audienceId: z.string().uuid().optional(),
  audiencePreset: z.enum(["PAID_PARTICIPANTS", "AUTHORIZED_PARTICIPANTS"]).optional(),
  frequencyWindowDays: z.coerce.number().int().min(0).max(365).default(0),
});

const raffleInvitationCampaignBodySchema = z.object({
  audienceId: z.string().uuid().nullable().optional(),
  audiencePreset: z.enum(["PAID_PARTICIPANTS", "AUTHORIZED_PARTICIPANTS"]).optional(),
  frequencyWindowDays: z.number().int().min(0).max(365).default(0),
});

const rafflePrizeFulfillmentParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  prizeId: z.coerce.number().int().positive(),
});

const rafflePrizeFulfillmentBodySchema = z.object({
  status: z.enum([
    "PENDING_CONTACT",
    "CONTACTED",
    "DELIVERY_COORDINATED",
    "DELIVERED",
    "NOT_CLAIMED",
    "NOT_APPLICABLE",
  ]),
  notes: z.string().trim().max(1000).optional().nullable(),
});

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
      throw new Error(
        "Raffle Prisma client is not initialized. Is RAFFLE_ENABLED=true?",
      );
    }
    return server.rafflePrisma;
  };

  // Public Routes
  server.get("/", async () => {
    return raffleService.getAllActive(getPrisma());
  });

  server.get("/catalog", async () => {
    return raffleService.getAllActive(getPrisma(), { catalogOnly: true });
  });

  server.get("/results/recent", async () => {
    return raffleService.getRecentResults(getPrisma());
  });

  server.get("/ticket-availability/events", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, getSseHeaders(request.headers.origin));
    reply.raw.write("event: ready\ndata: {}\n\n");

    const unsubscribe = subscribeToAllTicketAvailability((event) => {
      reply.raw.write(
        `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
      );
    });
    const heartbeat = setInterval(
      () => reply.raw.write(": keepalive\n\n"),
      25_000,
    );

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  server.post(
    "/:id/early-access",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
        },
      },
    },
    async (request, reply) => {
      const raffleId = Number((request.params as { id: string }).id);
      let body;
      try {
        body = earlyAccessBodySchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
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
      if (!raffle)
        return reply.status(404).send({ message: "Raffle not found" });
      if (
        getRaffleParticipationState(raffle) !== "EARLY_ACCESS" ||
        !raffle.earlyAccessCodeHash
      ) {
        return reply.status(409).send({
          message: "El acceso anticipado no está disponible",
          code: "EARLY_ACCESS_UNAVAILABLE",
        });
      }

      const isValid = await bcrypt.compare(
        body.code,
        raffle.earlyAccessCodeHash,
      );
      if (!isValid) {
        return reply.status(401).send({
          message: "El código de acceso no es válido",
          code: "INVALID_EARLY_ACCESS_CODE",
        });
      }

      const secondsUntilPublicOpening = Math.max(
        60,
        Math.ceil(
          ((raffle.participationStartsAt?.getTime() ?? Date.now()) -
            Date.now()) /
            1000,
        ) + 300,
      );
      const accessToken = server.jwt.sign(
        { scope: "raffle-early-access", raffleId },
        { expiresIn: secondsUntilPublicOpening },
      );
      return {
        accessToken,
        expiresAt: raffle.participationStartsAt?.toISOString() ?? null,
      };
    },
  );

  server.post(
    "/:id/opening-reminders",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
        },
      },
    },
    async (request, reply) => {
      const raffleId = Number((request.params as { id: string }).id);
      if (!Number.isInteger(raffleId)) {
        return reply
          .status(400)
          .send({ message: "Identificador de rifa inválido" });
      }

      let body;
      try {
        body = openingReminderBodySchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        throw error;
      }

      const phone = body.phone;

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
      if (!raffle)
        return reply.status(404).send({ message: "Raffle not found" });

      const participationState = getRaffleParticipationState(raffle);
      if (
        !raffle.participationStartsAt ||
        !["UPCOMING", "EARLY_ACCESS"].includes(participationState)
      ) {
        return reply.status(409).send({
          message:
            participationState === "CLOSED"
              ? "La participación en esta rifa ya cerró"
              : "La rifa ya está disponible",
          code: "OPENING_REMINDER_UNAVAILABLE",
        });
      }

      const existing = await getPrisma().raffleOpeningSubscription.findFirst({
        where: { raffleId, phone: { in: customerPhoneCandidates(phone) } },
      });
      const alreadyRegistered = Boolean(
        existing && ["PENDING", "PROCESSING", "SENT"].includes(existing.status),
      );

      const subscription = existing
        ? await getPrisma().raffleOpeningSubscription.update({
            where: { id: existing.id },
            data: alreadyRegistered
              ? { consentAt: new Date() }
              : { status: "PENDING", consentAt: new Date(), lastError: null },
          })
        : await getPrisma().raffleOpeningSubscription.create({
            data: {
              raffleId,
              phone,
              status: "PENDING",
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
    },
  );

  server.get(
    "/participations/:token",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "10 minutes" },
      },
    },
    async (request, reply) => {
      const tokenSchema = z.object({ token: z.string().min(32).max(180) });
      try {
        const { token } = tokenSchema.parse(request.params);
        const access = await getRaffleParticipationAccess(getPrisma(), token);
        if (!access) {
          return reply.status(404).send({
            message: "La consulta privada no est\u00e1 disponible o ha vencido.",
          });
        }
        reply.header("Cache-Control", "private, no-store");
        return access;
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
    },
  );

  server.get("/:id/ticket-availability/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    const raffle = await raffleService.getPublicById(getPrisma(), raffleId);
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });

    reply.hijack();
    reply.raw.writeHead(200, getSseHeaders(request.headers.origin));
    reply.raw.write("event: ready\ndata: {}\n\n");

    const unsubscribe = subscribeToTicketAvailability(raffleId, (event) => {
      reply.raw.write(
        `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
      );
    });
    const heartbeat = setInterval(
      () => reply.raw.write(": keepalive\n\n"),
      25_000,
    );

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
        where: {
          raffleId,
          hold: {
            status: { in: ["ACTIVE", "PROCESSING"] },
            expiresAt: { gt: new Date() },
          },
        },
        select: { ticketNumber: true },
      }),
    ]);

    return Array.from(
      new Set([...occupied, ...held].map((entry) => entry.ticketNumber)),
    );
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
        where: {
          raffleId,
          hold: {
            status: { in: ["ACTIVE", "PROCESSING"] },
            expiresAt: { gt: new Date() },
          },
        },
        select: { ticketNumber: true },
      }),
    ]);
    const availability = new Map<string, "PAID" | "RESERVED">();
    held.forEach((entry: { ticketNumber: string }) =>
      availability.set(entry.ticketNumber, "RESERVED"),
    );
    occupied.forEach(
      (sale: { ticketNumber: string; paymentStatus: "PAID" | "PENDING" }) =>
        availability.set(
          sale.ticketNumber,
          sale.paymentStatus === "PAID" ? "PAID" : "RESERVED",
        ),
    );
    return Array.from(availability, ([ticketNumber, status]) => ({
      ticketNumber,
      status,
    }));
  });

  server.post(
    "/:id/tickets",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const raffleId = parseInt(id);
      const raffle = await raffleService.getById(getPrisma(), raffleId);
      if (!raffle)
        return reply.status(404).send({ message: "Raffle not found" });

      try {
        const body = reserveTicketsBodySchema.parse(request.body);
        let earlyAccessAuthorized = false;
        if (body.earlyAccessToken) {
          try {
            const payload = server.jwt.verify<{
              scope?: string;
              raffleId?: number;
            }>(body.earlyAccessToken);
            earlyAccessAuthorized =
              payload.scope === "raffle-early-access" &&
              payload.raffleId === raffleId;
          } catch {
            earlyAccessAuthorized = false;
          }
        }
        if (!canParticipateInRaffle(raffle, earlyAccessAuthorized)) {
          const participationState = getRaffleParticipationState(raffle);
          return reply.status(409).send({
            message:
              participationState === "CLOSED"
                ? "La participación en esta rifa ya cerró"
                : "La participación en esta rifa todavía no está disponible",
            code:
              participationState === "CLOSED"
                ? "RAFFLE_PARTICIPATION_CLOSED"
                : "RAFFLE_PARTICIPATION_NOT_STARTED",
          });
        }
        return await ticketSaleService.reserveTickets(
          getPrisma(),
          server.storePrisma,
          {
            ...body,
            raffleId,
            earlyAccessAuthorized,
          },
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        if (error instanceof TicketAvailabilityConflictError) {
          return reply.status(409).send({
            message: "One or more selected tickets are no longer available",
            code: "TICKETS_UNAVAILABLE",
            ticketNumbers: error.ticketNumbers,
          });
        }
        if (error instanceof RaffleCouponError) {
          return reply
            .status(400)
            .send({ message: error.message, code: "RAFFLE_COUPON_INVALID" });
        }
        if (error.message === "INVALID_TICKET_NUMBERS") {
          return reply.status(400).send({
            message: "One or more ticket numbers are invalid for this raffle",
          });
        }
        if (error.message === "RAFFLE_UNAVAILABLE") {
          return reply
            .status(409)
            .send({ message: "This raffle is not available" });
        }
        throw error;
      }
    },
  );

  server.post(
    "/:id/payment-holds",
    {
      config: { rateLimit: { max: 8, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const raffleId = Number((request.params as { id: string }).id);
      try {
        const body = reserveTicketsBodySchema.parse(request.body);
        if (body.paymentMethod !== "MERCADOPAGO") {
          return reply
            .status(400)
            .send({ message: "Una retención de pago requiere Mercado Pago." });
        }
        const raffle = await raffleService.getById(getPrisma(), raffleId);
        if (!raffle)
          return reply.status(404).send({ message: "Raffle not found" });
        let earlyAccessAuthorized = false;
        if (body.earlyAccessToken) {
          try {
            const payload = server.jwt.verify<{
              scope?: string;
              raffleId?: number;
            }>(body.earlyAccessToken);
            earlyAccessAuthorized =
              payload.scope === "raffle-early-access" &&
              payload.raffleId === raffleId;
          } catch {
            earlyAccessAuthorized = false;
          }
        }
        return await rafflePaymentHoldService.create(
          getPrisma(),
          server.storePrisma,
          {
            ...body,
            raffleId,
            earlyAccessAuthorized,
          },
        );
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        if (error instanceof TicketAvailabilityConflictError) {
          return reply.status(409).send({
            message: "One or more selected tickets are no longer available",
            code: "TICKETS_UNAVAILABLE",
            ticketNumbers: error.ticketNumbers,
          });
        }
        if (error instanceof RaffleCouponError)
          return reply
            .status(400)
            .send({ message: error.message, code: "RAFFLE_COUPON_INVALID" });
        if (error?.message === "INVALID_TICKET_NUMBERS")
          return reply.status(400).send({
            message: "One or more ticket numbers are invalid for this raffle",
          });
        if (error?.message === "RAFFLE_UNAVAILABLE")
          return reply
            .status(409)
            .send({ message: "This raffle is not available" });
        throw error;
      }
    },
  );

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
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
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

  server.get(
    "/admin/:id/ticket-assignments",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const { id } = raffleResultParamsSchema.parse(request.params);
        const raffle = await getPrisma().raffle.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!raffle) {
          return reply.status(404).send({ message: "La rifa no existe." });
        }

        const assignments = await getPrisma().raffleOpportunity.findMany({
          where: { raffleId: id },
          select: {
            mainTicketNumber: true,
            extraOpportunities: true,
          },
          orderBy: { mainTicketNumber: "asc" },
        });

        return assignments.map(
          (assignment: {
            mainTicketNumber: string;
            extraOpportunities: unknown;
          }) => ({
            mainTicketNumber: assignment.mainTicketNumber,
            extraOpportunities: Array.isArray(assignment.extraOpportunities)
              ? assignment.extraOpportunities.map(String)
              : [],
          }),
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        throw error;
      }
    },
  );

  server.get(
    "/admin/:id/result",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const { id } = raffleResultParamsSchema.parse(request.params);
        const result = await raffleResultService.getAdmin(getPrisma(), id);
        if (!result)
          return reply.status(404).send({ message: "Raffle not found" });
        return result;
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/result/preview",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        const { results } = raffleResultBodySchema.parse(request.body);
        const preview = await raffleResultService.preview(
          getPrisma(),
          id,
          results,
        );
        if (!preview)
          return reply.status(404).send({ message: "Raffle not found" });
        return preview;
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, string> = {
          INVALID_RESULT_REFERENCE:
            "Uno de los resultados oficiales no contiene las cifras necesarias.",
          RAFFLE_HAS_NO_PRIZES:
            "La rifa no tiene premios configurados para resolver.",
          INCOMPLETE_PRIZE_RESULTS:
            "Debes capturar un resultado oficial para cada lugar configurado.",
        };
        if (errors[error?.message]) {
          return reply.status(400).send({
            message: errors[error.message],
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.patch(
    "/admin/:id/result/drafts/:prizeId",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id, prizeId } = rafflePrizeResultDraftParamsSchema.parse(
          request.params,
        );
        const { referenceNumber } = rafflePrizeResultDraftBodySchema.parse(
          request.body,
        );
        return await raffleResultService.saveDraft(
          getPrisma(),
          id,
          prizeId,
          referenceNumber,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_PRIZE_NOT_FOUND: {
            status: 404,
            message: "El premio no pertenece a esta rifa.",
          },
          INVALID_RESULT_REFERENCE: {
            status: 400,
            message:
              "El resultado oficial no contiene las cifras necesarias.",
          },
          RAFFLE_RESULT_ALREADY_PUBLISHED: {
            status: 409,
            message: "Los resultados de esta rifa ya fueron publicados.",
          },
          CANCELLED_RAFFLE_RESULT: {
            status: 409,
            message: "Una rifa cancelada no puede resolverse.",
          },
        };
        const known = errors[error?.message];
        if (known) {
          return reply
            .status(known.status)
            .send({ message: known.message, code: error.message });
        }
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/result",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        const { results } = raffleResultBodySchema.parse(request.body);
        const result = await raffleResultService.publish(
          getPrisma(),
          id,
          results,
          actor,
        );
        return {
          raffle: toPublicRaffle(result.raffle),
          preview: result.preview,
          resultPublishedAt: result.publishedAt,
        };
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          INVALID_RESULT_REFERENCE: {
            status: 400,
            message:
              "Uno de los resultados oficiales no contiene las cifras necesarias.",
          },
          RAFFLE_HAS_NO_PRIZES: {
            status: 400,
            message: "La rifa no tiene premios configurados para resolver.",
          },
          INCOMPLETE_PRIZE_RESULTS: {
            status: 400,
            message:
              "Debes capturar un resultado oficial para cada lugar configurado.",
          },
          RAFFLE_NOT_FOUND: {
            status: 404,
            message: "La rifa no existe.",
          },
          RAFFLE_RESULT_ALREADY_PUBLISHED: {
            status: 409,
            message: "El resultado de esta rifa ya fue publicado.",
          },
          CANCELLED_RAFFLE_RESULT: {
            status: 409,
            message:
              "No es posible publicar el resultado de una rifa cancelada.",
          },
          RAFFLE_RESULT_PAYMENT_REVIEW: {
            status: 409,
            message:
              "El número ganador pertenece a un pago en revisión. Espera la resolución de Mercado Pago.",
          },
        };
        const mapped = errors[error?.message];
        if (mapped) {
          return reply.status(mapped.status).send({
            message: mapped.message,
            code: error.message,
          });
        }
        request.log.error(
          { err: error, raffleId: (request.params as { id?: string })?.id },
          "Failed to publish raffle result",
        );
        return reply.status(500).send({
          message:
            "No se pudieron publicar los resultados. Intenta nuevamente.",
          code: "RAFFLE_RESULT_PUBLISH_FAILED",
        });
      }
    },
  );

  server.get(
    "/admin/:id/result/communication",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const { id } = raffleResultParamsSchema.parse(request.params);
        const overview = await raffleResultCommunicationService.getOverview(
          getPrisma(),
          server.storePrisma,
          id,
        );
        if (!overview) {
          return reply.status(404).send({ message: "La rifa no existe." });
        }
        return overview;
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/draw-reminder/campaign",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        return await raffleDrawReminderService.createCampaign(
          getPrisma(),
          server.storePrisma,
          id,
          actor,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({ message: "Validation error", errors: error.issues });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_NOT_FOUND: { status: 404, message: "La rifa no existe." },
          RAFFLE_DRAW_DATE_MISSING: { status: 409, message: "Configura la fecha de la rifa antes de enviar este aviso." },
          RAFFLE_DRAW_REMINDER_TEMPLATE_MISSING: { status: 409, message: "Configura la plantilla Recordatorio de la rifa antes de enviar." },
        };
        const mapped = errors[error?.message];
        if (mapped) return reply.status(mapped.status).send({ message: mapped.message, code: error.message });
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/draw-reminder/schedule",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        const { scheduledFor } = raffleDrawReminderScheduleBodySchema.parse(request.body);
        return await raffleDrawReminderService.scheduleCampaign(
          getPrisma(),
          server.storePrisma,
          id,
          new Date(scheduledFor),
          actor,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({ message: "Validation error", errors: error.issues });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_NOT_FOUND: { status: 404, message: "La rifa no existe." },
          RAFFLE_DRAW_DATE_MISSING: { status: 409, message: "Configura la fecha y hora de la rifa antes de programar el aviso." },
          RAFFLE_DRAW_REMINDER_TEMPLATE_MISSING: { status: 409, message: "Configura la plantilla Recordatorio de la rifa antes de programar." },
          RAFFLE_DRAW_REMINDER_SCHEDULE_IN_PAST: { status: 409, message: "Elige una hora futura para programar el aviso." },
          RAFFLE_DRAW_REMINDER_SCHEDULE_AFTER_DRAW: { status: 409, message: "El aviso debe programarse antes de la fecha y hora de la rifa." },
          RAFFLE_DRAW_REMINDER_ALREADY_DISPATCHED: { status: 409, message: "El aviso ya comenzó a enviarse y no puede reprogramarse." },
        };
        const mapped = errors[error?.message];
        if (mapped) return reply.status(mapped.status).send({ message: mapped.message, code: error.message });
        throw error;
      }
    },
  );

  server.delete(
    "/admin/:id/draw-reminder/schedule",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        await raffleDrawReminderService.cancelScheduledCampaign(getPrisma(), id, actor);
        return { cancelled: true };
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({ message: "Validation error", errors: error.issues });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_NOT_FOUND: { status: 404, message: "La rifa no existe." },
          RAFFLE_DRAW_REMINDER_NOT_SCHEDULED: { status: 409, message: "No existe una programación activa para este aviso." },
        };
        const mapped = errors[error?.message];
        if (mapped) return reply.status(mapped.status).send({ message: mapped.message, code: error.message });
        throw error;
      }
    },
  );

  server.get(
    "/admin/:id/draw-reminder",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const { id } = raffleResultParamsSchema.parse(request.params);
        const overview = await raffleDrawReminderService.getOverview(getPrisma(), server.storePrisma, id);
        if (!overview) return reply.status(404).send({ message: "La rifa no existe." });
        return overview;
      } catch (error: any) {
        if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/result/campaigns",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        const { audience } = raffleResultCampaignBodySchema.parse(request.body);
        return await raffleResultCommunicationService.createCampaign(
          getPrisma(),
          server.storePrisma,
          id,
          audience,
          actor,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_NOT_FOUND: { status: 404, message: "La rifa no existe." },
          RAFFLE_RESULT_NOT_PUBLISHED: {
            status: 409,
            message: "Primero debes publicar los resultados de la rifa.",
          },
          RAFFLE_RESULT_TEMPLATE_MISSING: {
            status: 409,
            message:
              "Configura la plantilla de WhatsApp correspondiente antes de iniciar la comunicación.",
          },
        };
        const mapped = errors[error?.message];
        if (mapped) {
          return reply.status(mapped.status).send({
            message: mapped.message,
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/result/campaigns/:campaignId/retry",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id, campaignId } = raffleResultCampaignParamsSchema.parse(
          request.params,
        );
        return await raffleResultCommunicationService.retryFailed(
          getPrisma(),
          server.storePrisma,
          id,
          campaignId,
          actor,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_RESULT_CAMPAIGN_NOT_FOUND: {
            status: 404,
            message: "La campaña de comunicación no existe.",
          },
          NO_RETRYABLE_RECIPIENTS: {
            status: 409,
            message:
              "No hay mensajes fallidos con un número válido para reintentar.",
          },
        };
        const mapped = errors[error?.message];
        if (mapped) {
          return reply.status(mapped.status).send({
            message: mapped.message,
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.get(
    "/admin/:id/invitations",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const { id } = raffleResultParamsSchema.parse(request.params);
        const query = raffleInvitationQuerySchema.parse(request.query);
        const overview = await raffleInvitationCampaignService.getOverview(
          getPrisma(),
          server.storePrisma,
          id,
          query.audienceId,
          query.frequencyWindowDays,
          query.audiencePreset,
        );
        if (!overview) {
          return reply.status(404).send({ message: "La rifa no existe." });
        }
        return overview;
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        if (error?.message === "RAFFLE_AUDIENCE_NOT_FOUND") {
          return reply.status(404).send({
            message: "La audiencia no existe o está pausada.",
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/invitations",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id } = raffleResultParamsSchema.parse(request.params);
        const input = raffleInvitationCampaignBodySchema.parse(request.body);
        return await raffleInvitationCampaignService.createCampaign(
          getPrisma(),
          server.storePrisma,
          id,
          input,
          actor,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_NOT_FOUND: { status: 404, message: "La rifa no existe." },
          RAFFLE_AUDIENCE_NOT_FOUND: {
            status: 404,
            message: "La audiencia no existe o está pausada.",
          },
          RAFFLE_INVITATION_TEMPLATE_MISSING: {
            status: 409,
            message:
              "Configura la plantilla Invitación a una nueva rifa antes de iniciar la campaña.",
          },
        };
        const mapped = errors[error?.message];
        if (mapped) {
          return reply.status(mapped.status).send({
            message: mapped.message,
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post(
    "/admin/:id/invitations/:campaignId/retry",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id, campaignId } = raffleResultCampaignParamsSchema.parse(
          request.params,
        );
        return await raffleInvitationCampaignService.retryFailed(
          getPrisma(),
          server.storePrisma,
          id,
          campaignId,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_INVITATION_CAMPAIGN_NOT_FOUND: {
            status: 404,
            message: "La campaña de invitación no existe.",
          },
          NO_RETRYABLE_RECIPIENTS: {
            status: 409,
            message: "No hay invitaciones fallidas para reintentar.",
          },
        };
        const mapped = errors[error?.message];
        if (mapped) {
          return reply.status(mapped.status).send({
            message: mapped.message,
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.patch(
    "/admin/:id/result/prizes/:prizeId/fulfillment",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const actor = await requireAdminActor(server, request, reply);
        if (!actor) return;
        const { id, prizeId } = rafflePrizeFulfillmentParamsSchema.parse(
          request.params,
        );
        const { status, notes } = rafflePrizeFulfillmentBodySchema.parse(
          request.body,
        );
        return await raffleResultCommunicationService.updatePrizeFulfillment(
          getPrisma(),
          id,
          prizeId,
          status,
          notes || null,
          actor,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        const errors: Record<string, { status: number; message: string }> = {
          RAFFLE_PRIZE_NOT_FOUND: {
            status: 404,
            message: "El premio no pertenece a esta rifa.",
          },
          RAFFLE_RESULT_NOT_PUBLISHED: {
            status: 409,
            message: "Primero debes publicar los resultados de la rifa.",
          },
          PRIZE_HAS_NO_ELIGIBLE_WINNER: {
            status: 409,
            message: "Este premio no tiene un ganador elegible.",
          },
        };
        const mapped = errors[error?.message];
        if (mapped) {
          return reply.status(mapped.status).send({
            message: mapped.message,
            code: error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post(
    "/",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let validated;
      try {
        validated = createRaffleSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        throw error;
      }
      if (validated.winningNumber || validated.status === "FINISHED") {
        return reply.status(400).send({
          message: "El resultado debe publicarse desde el Resumen de Rifa.",
          code: "RAFFLE_RESULT_MANAGED_OPERATIONALLY",
        });
      }
      return raffleService.create(getPrisma(), validated);
    },
  );

  server.put(
    "/:id",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const raffleId = parseInt(id);
      let validated;
      try {
        validated = updateRaffleSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        throw error;
      }

      const current = await getPrisma().raffle.findUnique({
        where: { id: raffleId },
      });
      if (!current)
        return reply.status(404).send({ message: "Raffle not found" });
      if (validated.winningNumber !== undefined) {
        return reply.status(400).send({
          message: "El resultado debe publicarse desde el Resumen de Rifa.",
          code: "RAFFLE_RESULT_MANAGED_OPERATIONALLY",
        });
      }
      if (validated.status === "FINISHED" && current.status !== "FINISHED") {
        return reply.status(400).send({
          message: "Finaliza la rifa publicando el resultado desde su resumen.",
          code: "RAFFLE_RESULT_MANAGED_OPERATIONALLY",
        });
      }
      if (current.resultPublishedAt && validated.prizes !== undefined) {
        return reply.status(409).send({
          message:
            "Los premios no pueden modificarse después de publicar el resultado.",
          code: "RAFFLE_PRIZES_LOCKED_BY_RESULT",
        });
      }

      const combinedWindow = {
        drawDate:
          validated.drawDate !== undefined
            ? validated.drawDate
            : (current.drawDate?.toISOString() ?? null),
        participationStartsAt:
          validated.participationStartsAt !== undefined
            ? validated.participationStartsAt
            : (current.participationStartsAt?.toISOString() ?? null),
        participationEndsAt:
          validated.participationEndsAt !== undefined
            ? validated.participationEndsAt
            : (current.participationEndsAt?.toISOString() ?? null),
        earlyAccessEnabled:
          validated.earlyAccessEnabled ?? current.earlyAccessEnabled,
        earlyAccessCode: validated.earlyAccessCode,
      };
      const windowValidation = z
        .object({})
        .superRefine((_data, context) => {
          validateParticipationWindow(
            combinedWindow,
            context,
            combinedWindow.earlyAccessEnabled && !current.earlyAccessCodeHash,
          );
        })
        .safeParse({});
      if (!windowValidation.success) {
        return reply.status(400).send({
          message: "Validation error",
          errors: windowValidation.error.issues,
        });
      }

      const nextTicketQuantity =
        validated.ticketQuantity ?? current.ticketQuantity;
      const nextOpportunities =
        validated.opportunities ?? current.opportunities;
      if (!isClosedRaffleUniverse(nextTicketQuantity, nextOpportunities)) {
        return reply.status(400).send({
          message:
            "Las rifas simples requieren 100, 1000 o una potencia exacta de 10. Las rifas de oportunidades también admiten 99, 999 y potencias de 10 menos uno",
          code: "INVALID_RAFFLE_UNIVERSE",
        });
      }

      const universeFieldsChanged =
        nextTicketQuantity !== current.ticketQuantity ||
        nextOpportunities !== current.opportunities ||
        (validated.distribution !== undefined &&
          validated.distribution !== current.distribution);

      if (universeFieldsChanged) {
        const activeSalesCount = await getPrisma().ticketSale.count({
          where: {
            raffleId,
            paymentStatus: { in: ["PAID", "PENDING"] },
          },
        });
        if (activeSalesCount > 0) {
          return reply.status(409).send({
            message:
              "Cannot modify universe fields while active ticket sales exist",
            code: "UNIVERSE_LOCKED",
          });
        }
      }

      const updated = await raffleService.update(
        getPrisma(),
        raffleId,
        validated,
      );
      await reconcileRaffleOpeningNotifications(raffleId);
      return updated;
    },
  );

  server.patch(
    "/:id/status",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      let validated;
      try {
        validated = updateRaffleStatusSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        throw error;
      }
      const raffleId = parseInt(id);
      if (validated.status === "FINISHED") {
        return reply.status(400).send({
          message: "Finaliza la rifa publicando el resultado desde su resumen.",
          code: "RAFFLE_RESULT_MANAGED_OPERATIONALLY",
        });
      }
      const updated = await raffleService.update(
        getPrisma(),
        raffleId,
        validated.status === "ACTIVE"
          ? validated
          : { ...validated, featured: false, featuredOrder: null },
      );
      await reconcileRaffleOpeningNotifications(raffleId);
      return updated;
    },
  );

  server.patch(
    "/:id/publication",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      let validated;
      try {
        validated = updateRafflePublicationSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
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
    },
  );

  server.patch(
    "/:id/featured",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      let validated;
      try {
        validated = updateRaffleFeaturedSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        throw error;
      }

      try {
        const updated = await raffleService.updateFeatured(
          getPrisma(),
          parseInt(id),
          validated.featured,
          validated.featuredOrder,
        );
        if (!updated)
          return reply.status(404).send({ message: "Raffle not found" });
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
    },
  );

  server.put(
    "/featured/reorder",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let validated;
      try {
        validated = reorderFeaturedRafflesSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues)
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        throw error;
      }

      try {
        return await raffleService.reorderFeatured(getPrisma(), validated.ids);
      } catch (error: any) {
        if (error?.message === "INVALID_FEATURED_RAFFLE_ORDER") {
          return reply.status(409).send({
            message:
              "El orden solo puede incluir rifas destacadas, activas y publicadas",
            code: "INVALID_FEATURED_RAFFLE_ORDER",
          });
        }
        throw error;
      }
    },
  );

  server.delete(
    "/:id",
    { preHandler: [server.authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      await raffleService.delete(getPrisma(), parseInt(id));
      return { success: true };
    },
  );
}
