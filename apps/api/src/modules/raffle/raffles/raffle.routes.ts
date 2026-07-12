import { FastifyInstance } from "fastify";
import { z } from "zod";
import { raffleService } from "./raffle.service";
import { ticketSaleService } from "../ticket-sales/ticket-sale.service";
import {
  createRaffleSchema,
  isClosedRaffleUniverse,
  updateRaffleSchema,
  updateRafflePublicationSchema,
  updateRaffleStatusSchema,
} from "./raffle.schema";

const reserveTicketsBodySchema = z.object({
  tickets: z.array(z.string().regex(/^\d+$/, "Ticket numbers must be numeric")).min(1, "At least one ticket is required"),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerState: z.string().optional(),
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

    const occupied = await getPrisma().ticketSale.findMany({
      where: {
        raffleId,
        paymentStatus: { in: ["PAID", "PENDING"] },
      },
      select: { ticketNumber: true },
    });

    return occupied.map((s: { ticketNumber: string }) => s.ticketNumber);
  });

  server.get("/:id/tickets", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffleId = parseInt(id);
    const raffle = await raffleService.getById(getPrisma(), raffleId);
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });
    return getPrisma().ticketSale.findMany({
      where: { raffleId },
      orderBy: { createdAt: "desc" },
    });
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
      return await ticketSaleService.reserveTickets(getPrisma(), server.storePrisma, {
        ...body,
        raffleId,
      });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      if (error.message === "ALL_TICKETS_REJECTED") {
        return reply.status(400).send({ message: "All selected tickets are already taken" });
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

    const nextTicketQuantity = validated.ticketQuantity ?? current.ticketQuantity;
    const nextOpportunities = validated.opportunities ?? current.opportunities;
    if (!isClosedRaffleUniverse(nextTicketQuantity, nextOpportunities)) {
      return reply.status(400).send({
        message: "Las rifas simples requieren 100, 1000 o una potencia exacta de 10. Las rifas de oportunidades también admiten 99, 999 y potencias de 10 menos uno",
        code: "INVALID_RAFFLE_UNIVERSE",
      });
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

    return raffleService.update(getPrisma(), raffleId, validated);
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
    return raffleService.update(getPrisma(), parseInt(id), validated);
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
    return raffleService.update(getPrisma(), parseInt(id), validated);
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await raffleService.delete(getPrisma(), parseInt(id));
    return { success: true };
  });
}
