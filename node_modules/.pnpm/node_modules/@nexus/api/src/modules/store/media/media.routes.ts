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

  server.post("/", { preHandler: [server.authenticate] }, async (request) => {
    const validated = createMediaSchema.parse(request.body);
    return mediaService.create(validated);
  });

  server.put("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const validated = updateMediaSchema.parse(request.body);
    return mediaService.update(parseInt(id), validated);
  });

  server.delete("/:id", { preHandler: [server.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return mediaService.delete(parseInt(id));
  });
}
