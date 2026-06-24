import { FastifyInstance } from "fastify";
import { mediaService } from "./media.service";
import { createMediaSchema, updateMediaSchema } from "./media.schema";
import { MediaType } from "@prisma/client-store";

function parseMediaFilters(query: any, onlyReadyMedia: boolean) {
  const { categoryId, subcategoryId, type } = query;
  return {
    categoryId: categoryId ? parseInt(categoryId) : undefined,
    subcategoryId: subcategoryId ? parseInt(subcategoryId) : undefined,
    type: type as MediaType,
    onlyReadyMedia,
  };
}

export async function mediaPublicRoutes(server: FastifyInstance) {
  server.get("/", async (request) => {
    return mediaService.getAll(parseMediaFilters(request.query as any, true));
  });
}

export async function mediaRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (request) => {
    return mediaService.getAll(parseMediaFilters(request.query as any, false));
  });

  server.post("/", async (request, reply) => {
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

  server.put("/:id", async (request, reply) => {
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

  server.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    return mediaService.delete(parseInt(id));
  });
}
