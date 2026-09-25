import { FastifyInstance } from "fastify";
import { z } from "zod";
import { dashboardService } from "./dashboard.service";

const salesOverviewQuerySchema = z.object({
  period: z.enum(["TODAY", "7D", "15D", "MONTH", "ALL"]).default("MONTH"),
  productType: z.enum(["ALL", "BIRD", "ITEM"]).default("ALL"),
  paymentMethod: z.enum(["ALL", "TRANSFER", "MERCADOPAGO"]).default("ALL"),
  search: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(8),
});

const commercialOverviewQuerySchema = z.object({
  period: z.enum(["TODAY", "7D", "15D", "MONTH", "ALL"]).default("7D"),
  source: z.enum(["ALL", "STORE", "RAFFLES"]).default("ALL"),
  paymentMethod: z.enum(["ALL", "TRANSFER", "MERCADOPAGO"]).default("ALL"),
});

const revenueMilestoneParamsSchema = z.object({
  milestoneId: z.string().trim().min(1).max(64),
});

const adminRoleOf = (request: any) =>
  String(request.user?.role || "").toUpperCase();

export async function dashboardRoutes(server: FastifyInstance) {
  server.get("/stats", { preHandler: [server.authenticate] }, async (request) => {
    const role = adminRoleOf(request);
    const userId =
      role === "ADMIN" || role === "SUPERADMIN"
        ? Number((request.user as any)?.id)
        : undefined;

    return dashboardService.getStats(
      Number.isInteger(userId) ? userId : undefined,
    );
  });

  server.post(
    "/milestones/:milestoneId/acknowledge",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const role = adminRoleOf(request);
        if (role !== "ADMIN" && role !== "SUPERADMIN") {
          return reply.status(403).send({ message: "Acceso no autorizado." });
        }

        const userId = Number((request.user as any)?.id);
        if (!Number.isInteger(userId)) {
          return reply.status(401).send({ message: "Sesión no válida." });
        }

        const { milestoneId } = revenueMilestoneParamsSchema.parse(
          request.params,
        );
        const result = await dashboardService.acknowledgeMilestone(
          userId,
          milestoneId,
        );

        if (!result) {
          return reply.status(404).send({ message: "Hito no encontrado." });
        }

        if (!result.reached) {
          return reply
            .status(409)
            .send({ message: "El hito todavía no ha sido alcanzado." });
        }

        return result;
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
    },
  );

  server.get(
    "/commercial-overview",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const query = commercialOverviewQuerySchema.parse(request.query);
        return dashboardService.getCommercialOverview(
          query.period,
          query.source,
          query.paymentMethod,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
    },
  );

  server.get(
    "/sales-overview",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const query = salesOverviewQuerySchema.parse(request.query);
        return dashboardService.getSalesOverview(
          query.period,
          query.productType,
          query.paymentMethod,
          query.search,
          query.page,
          query.pageSize,
        );
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
    },
  );
}
