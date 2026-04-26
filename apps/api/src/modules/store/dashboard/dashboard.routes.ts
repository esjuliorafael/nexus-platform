import { FastifyInstance } from "fastify";
import { dashboardService } from "./dashboard.service";

export async function dashboardRoutes(server: FastifyInstance) {
  server.get("/stats", { preHandler: [server.authenticate] }, async () => {
    return dashboardService.getStats();
  });
}
