import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { whatsappChannelSchema } from "../shared.schema";

export async function whatsappChannelRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return storePrisma.whatsappChannel.findMany({
      include: { templates: true }
    });
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request) => {
    const validated = whatsappChannelSchema.parse(request.body);
    return storePrisma.whatsappChannel.create({ 
      data: {
        ...validated,
        template: validated.template || "",
        updated_at: new Date()
      },
      include: { templates: true }
    });
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = whatsappChannelSchema.parse(request.body);
    return storePrisma.whatsappChannel.update({
      where: { id: parseInt(id) },
      data: {
        ...validated,
        template: validated.template || "",
        updated_at: new Date()
      },
      include: { templates: true }
    });
  });

  // New endpoint for upserting templates
  server.post("/:id/templates", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { type, content } = request.body as { type: "RESERVATION" | "RELEASE", content: string };
    
    return storePrisma.whatsappTemplate.upsert({
      where: {
        channelId_type: {
          channelId: parseInt(id),
          type
        }
      },
      update: { content, updated_at: new Date() },
      create: {
        channelId: parseInt(id),
        type,
        content,
        updated_at: new Date()
      }
    });
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return storePrisma.whatsappChannel.delete({ where: { id: parseInt(id) } });
  });
}
