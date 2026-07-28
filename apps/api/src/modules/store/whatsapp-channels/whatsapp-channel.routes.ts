import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { whatsappChannelSchema } from "../shared.schema";

export async function whatsappChannelRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return storePrisma.whatsappChannel.findMany({
      include: { templates: true },
    });
  });

  server.post(
    "/",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let validated;
      try {
        validated = whatsappChannelSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
      return storePrisma.whatsappChannel.create({
        data: {
          ...validated,
          template: validated.template || "",
          updated_at: new Date(),
        },
        include: { templates: true },
      });
    },
  );

  server.put(
    "/:id",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      let validated;
      try {
        validated = whatsappChannelSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
      return storePrisma.whatsappChannel.update({
        where: { id: parseInt(id) },
        data: {
          ...validated,
          template: validated.template || "",
          updated_at: new Date(),
        },
        include: { templates: true },
      });
    },
  );

  // Kept as an explicit compatibility boundary for older Admin clients.
  // Template content is canonical and can only be edited in Canal Principal.
  server.post(
    "/:id/templates",
    { preHandler: [server.authenticate] },
    async (_request, reply) => {
      return reply.status(409).send({
        message:
          "Las plantillas se administran exclusivamente desde el Canal Principal.",
      });
    },
  );

  server.delete(
    "/:id",
    { preHandler: [server.authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      return storePrisma.whatsappChannel.delete({
        where: { id: parseInt(id) },
      });
    },
  );
}
