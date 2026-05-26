import { FastifyInstance } from "fastify";
import { z } from "zod";
import { raffleIntelligenceService } from "./raffle-intelligence.service";

const segmentSchema = z.enum([
  "VIP_PAYERS",
  "REPEAT_ACTIVE",
  "HIGH_VOLUME",
  "PROMISING_NEW",
  "DORMANT",
  "NON_PAYER",
  "LOW_ACTIVITY",
]);

const querySchema = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  segment: segmentSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const parseFilters = (query: unknown) => {
  const parsed = querySchema.parse(query);
  return {
    ...parsed,
    from: parsed.from ? new Date(parsed.from) : undefined,
    to: parsed.to ? new Date(parsed.to) : undefined,
  };
};

async function requireSuperadmin(server: FastifyInstance, request: any, reply: any) {
  await server.authenticate(request, reply);
  const role = String(request.user?.role || "").toUpperCase();
  if (role !== "SUPERADMIN") {
    return reply.status(403).send({ message: "Forbidden" });
  }
}

export async function raffleIntelligenceRoutes(server: FastifyInstance) {
  const getPrisma = () => {
    if (!server.rafflePrisma) {
      throw new Error("Raffle Prisma client is not initialized. Is RAFFLE_ENABLED=true?");
    }
    return server.rafflePrisma;
  };

  server.get("/overview", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const filters = parseFilters(request.query);
      return raffleIntelligenceService.getOverview(getPrisma(), filters);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.get("/segments", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const filters = parseFilters(request.query);
      return raffleIntelligenceService.getSegments(getPrisma(), filters);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.get("/participants", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const filters = parseFilters(request.query);
      return raffleIntelligenceService.getParticipants(getPrisma(), filters);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.get("/export", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const filters = parseFilters(request.query);
      const csv = await raffleIntelligenceService.exportParticipantsCsv(getPrisma(), filters);
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="raffle-intelligence-${Date.now()}.csv"`)
        .send(csv);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
}
