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

export async function dashboardRoutes(server: FastifyInstance) {
  server.get("/stats", { preHandler: [server.authenticate] }, async () => {
    return dashboardService.getStats();
  });

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
