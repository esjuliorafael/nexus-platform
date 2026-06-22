import { FastifyInstance } from "fastify";
import { homeSlideService } from "./home-slide.service";
import {
  createHomeSlideSchema,
  reorderHomeSlidesSchema,
  updateHomeSlideSchema,
} from "./home-slide.schema";

export async function homeSlidePublicRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return homeSlideService.getPublic();
  });
}

export async function homeSlideAdminRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async () => {
    return homeSlideService.getAdmin();
  });

  server.post("/", async (request, reply) => {
    try {
      const validated = createHomeSlideSchema.parse(request.body);
      return await homeSlideService.create(validated);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.put("/reorder", async (request, reply) => {
    try {
      const validated = reorderHomeSlidesSchema.parse(request.body);
      return await homeSlideService.reorder(validated.ids);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const slideId = Number(id);
      if (!Number.isInteger(slideId)) {
        return reply.status(400).send({ message: "Id de slide invalido." });
      }
      const validated = updateHomeSlideSchema.parse(request.body);
      return await homeSlideService.update(slideId, validated);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const slideId = Number(id);
    if (!Number.isInteger(slideId)) {
      const error = new Error("Id de slide invalido.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }
    await homeSlideService.delete(slideId);
    return { success: true };
  });
}
