import { FastifyInstance } from "fastify";
import { storeHeroService } from "./store-hero.service";
import {
  createStoreHeroSchema,
  reorderStoreHeroesSchema,
  storeHeroScopeSchema,
  updateStoreHeroSchema,
} from "./store-hero.schema";

export async function storeHeroPublicRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    try {
      const { scope } = request.query as { scope?: string };
      const parsedScope = scope ? storeHeroScopeSchema.parse(scope) : undefined;
      return storeHeroService.getPublic(parsedScope);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });
}

export async function storeHeroAdminRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (request, reply) => {
    try {
      const { scope } = request.query as { scope?: string };
      const parsedScope = scope ? storeHeroScopeSchema.parse(scope) : undefined;
      return storeHeroService.getAdmin(parsedScope);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.post("/", async (request, reply) => {
    try {
      const validated = createStoreHeroSchema.parse(request.body);
      return await storeHeroService.create(validated);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.put("/reorder", async (request, reply) => {
    try {
      const validated = reorderStoreHeroesSchema.parse(request.body);
      return await storeHeroService.reorder(validated.scope, validated.ids);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const heroId = Number(id);
      if (!Number.isInteger(heroId)) {
        return reply.status(400).send({ message: "Id de hero invalido." });
      }
      const validated = updateStoreHeroSchema.parse(request.body);
      return await storeHeroService.update(heroId, validated);
    } catch (error: any) {
      if (error?.issues) {
        return reply
          .status(400)
          .send({ message: "Validation error", errors: error.issues });
      }
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const heroId = Number(id);
    if (!Number.isInteger(heroId)) {
      const error = new Error("Id de hero invalido.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }
    await storeHeroService.delete(heroId);
    return { success: true };
  });
}
