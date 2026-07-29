import { FastifyInstance } from "fastify";
import { z } from "zod";
import { dashboardService } from "./dashboard.service";

const salesOverviewQuerySchema = z.object({
  period: z.enum(["TODAY", "7D", "30D", "MONTH", "ALL"]).default("30D"),
});

export async function dashboardRoutes(server: FastifyInstance) {
  server.get("/stats", { preHandler: [server.authenticate] }, async () => {
    return dashboardService.getStats();
  });

  server.get(
    "/sales-overview",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const query = salesOverviewQuerySchema.parse(request.query);
        return dashboardService.getSalesOverview(query.period);
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
