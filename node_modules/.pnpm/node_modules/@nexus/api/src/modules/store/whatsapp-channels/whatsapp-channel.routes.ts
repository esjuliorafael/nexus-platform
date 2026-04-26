import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { whatsappChannelSchema } from "../shared.schema";

export async function whatsappChannelRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return storePrisma.whatsappChannel.findMany();
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request) => {
    const validated = whatsappChannelSchema.parse(request.body);
    return storePrisma.whatsappChannel.create({ data: validated });
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = whatsappChannelSchema.parse(request.body);
    return storePrisma.whatsappChannel.update({
      where: { id: parseInt(id) },
      data: validated,
    });
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return storePrisma.whatsappChannel.delete({ where: { id: parseInt(id) } });
  });
}
