import { FastifyInstance } from "fastify";
import { raffleService } from "./raffle.service";
import { createRaffleSchema, updateRaffleSchema, updateRaffleStatusSchema } from "./raffle.schema";

export async function raffleRoutes(server: FastifyInstance) {
  const prisma = server.rafflePrisma;

  // Public Routes
  server.get("/", async () => {
    return raffleService.getAllActive(prisma);
  });

  server.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const raffle = await raffleService.getById(prisma, parseInt(id));
    if (!raffle) return reply.status(404).send({ message: "Raffle not found" });
    return raffle;
  });

  // Admin Routes
  server.get("/admin", { preHandler: [server.authenticate] }, async () => {
    return raffleService.getAllAdmin(prisma);
  });

  server.post("/admin", { preHandler: [server.authenticate] }, async (request) => {
    const validated = createRaffleSchema.parse(request.body);
    return raffleService.create(prisma, validated);
  });

  server.put("/admin/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateRaffleSchema.parse(request.body);
    return raffleService.update(prisma, parseInt(id), validated);
  });

  server.patch("/admin/:id/status", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateRaffleStatusSchema.parse(request.body);
    return raffleService.update(prisma, parseInt(id), validated);
  });

  server.delete("/admin/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await raffleService.delete(prisma, parseInt(id));
    return { success: true };
  });
}
