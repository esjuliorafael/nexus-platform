import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { updateShippingZoneSchema } from "../shared.schema";

export async function shippingZoneRoutes(server: FastifyInstance) {
  // Public Route for Checkout
  server.get("/public", async () => {
    return storePrisma.shippingZone.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
  });

  server.get("/", { preHandler: [server.authenticate] }, async () => {
    return storePrisma.shippingZone.findMany();
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateShippingZoneSchema.parse(request.body);
    return storePrisma.shippingZone.update({
      where: { id: parseInt(id) },
      data: validated,
    });
  });
}
