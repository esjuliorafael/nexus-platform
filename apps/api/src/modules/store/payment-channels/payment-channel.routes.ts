import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { paymentChannelSchema } from "../shared.schema";

export async function paymentChannelRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return storePrisma.paymentChannel.findMany();
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const validated = paymentChannelSchema.parse(request.body);
      return storePrisma.paymentChannel.create({ data: validated });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validated = paymentChannelSchema.parse(request.body);
      return storePrisma.paymentChannel.update({
        where: { id: parseInt(id) },
        data: validated,
      });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return storePrisma.paymentChannel.delete({ where: { id: parseInt(id) } });
  });
}
