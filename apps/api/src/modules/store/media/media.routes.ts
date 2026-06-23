import { FastifyInstance } from "fastify";
import { mediaService } from "./media.service";
import { createMediaSchema, updateMediaSchema } from "./media.schema";
import { MediaType } from "@prisma/client-store";

export async function mediaRoutes(server: FastifyInstance) {
  server.get("/", async (request) => {
    const { categoryId, subcategoryId, type } = request.query as any;
    return mediaService.getAll({
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      subcategoryId: subcategoryId ? parseInt(subcategoryId) : undefined,
      type: type as MediaType,
    });
  });

  server.post("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const validated = createMediaSchema.parse(request.body);
      return mediaService.create(validated);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const validated = updateMediaSchema.parse(request.body);
      return mediaService.update(parseInt(id), validated);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return mediaService.delete(parseInt(id));
  });
}
