import { FastifyInstance } from "fastify";
import { ticketSaleService } from "./ticket-sale.service";
import { updateTicketStatusSchema } from "./ticket-sale.schema";
import { TicketStatus } from "@prisma/client-raffle";

export async function ticketSaleRoutes(server: FastifyInstance) {
  const rafflePrisma = server.rafflePrisma;
  const storePrisma = server.storePrisma;

  // Admin Routes
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

  server.patch("/:id/status", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { paymentStatus } = updateTicketStatusSchema.parse(request.body);
    return ticketSaleService.updateStatus(rafflePrisma, parseInt(id), paymentStatus);
  });

  server.delete("/admin/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await ticketSaleService.delete(rafflePrisma, parseInt(id));
    return { success: true };
  });
}
