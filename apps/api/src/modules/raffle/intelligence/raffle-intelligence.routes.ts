import { FastifyInstance } from "fastify";
import { z } from "zod";
import { raffleIntelligenceService } from "./raffle-intelligence.service";
import {
  raffleAudienceInputSchema,
  raffleAudiencePreviewSchema,
  raffleAudienceRulesSchema,
} from "./raffle-audience.schema";
import { raffleAudienceService } from "./raffle-audience.service";

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

const audienceParamsSchema = z.object({
  id: z.string().uuid(),
});

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

  server.get("/audiences", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (_request, reply) => {
    return getPrisma().raffleAudience.findMany({
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });
  });

  server.get("/audiences/options", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (_request, reply) => {
    const prisma = getPrisma();
    const [raffles, states] = await Promise.all([
      prisma.raffle.findMany({
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.ticketSale.findMany({
        where: { customerState: { not: null } },
        distinct: ["customerState"],
        select: { customerState: true },
        orderBy: { customerState: "asc" },
      }),
    ]);
    return {
      raffles,
      states: states.map((item: any) => item.customerState).filter(Boolean),
    };
  });

  server.post("/audiences/preview", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const input = raffleAudiencePreviewSchema.parse(request.body);
      let rules = input.rules;
      if (input.audienceId) {
        const audience = await getPrisma().raffleAudience.findUnique({
          where: { id: input.audienceId },
          select: { rules: true },
        });
        if (!audience) return reply.status(404).send({ message: "Audience not found" });
        rules = raffleAudienceRulesSchema.parse(audience.rules);
      }
      return raffleAudienceService.preview(getPrisma(), server.storePrisma, {
        rules: rules!,
        targetRaffleId: input.targetRaffleId,
        frequencyWindowDays: input.frequencyWindowDays,
      });
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.post("/audiences", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const input = raffleAudienceInputSchema.parse(request.body);
      const user = request.user as any;
      const audience = await getPrisma().raffleAudience.create({
        data: {
          name: input.name,
          description: input.description || null,
          rules: input.rules,
          active: input.active ?? true,
          createdByUserId: Number.isInteger(Number(user?.id)) ? Number(user.id) : null,
          createdByName: user?.name || user?.email || null,
          createdByRole: user?.role || null,
        },
      });
      return reply.status(201).send(audience);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.patch("/audiences/:id", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const { id } = audienceParamsSchema.parse(request.params);
      const input = raffleAudienceInputSchema.partial().parse(request.body);
      const existing = await getPrisma().raffleAudience.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ message: "Audience not found" });
      return getPrisma().raffleAudience.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
          ...(input.rules !== undefined ? { rules: input.rules } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.delete("/audiences/:id", { preHandler: [(request, reply) => requireSuperadmin(server, request, reply)] }, async (request, reply) => {
    try {
      const { id } = audienceParamsSchema.parse(request.params);
      const result = await getPrisma().raffleAudience.deleteMany({ where: { id } });
      if (!result.count) return reply.status(404).send({ message: "Audience not found" });
      return reply.status(204).send();
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });
}
