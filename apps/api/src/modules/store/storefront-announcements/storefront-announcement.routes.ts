import { FastifyInstance } from "fastify";
import {
  createAnnouncementSchema,
  publicAnnouncementQuerySchema,
  updateAnnouncementSchema,
  updateAnnouncementStatusSchema,
} from "./storefront-announcement.schema";
import { storefrontAnnouncementService } from "./storefront-announcement.service";

const parseId = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error("Id de aviso inválido."), { statusCode: 400 });
  return id;
};

const handleError = (error: any, reply: any) => {
  if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
  if (error?.statusCode) return reply.status(error.statusCode).send({ message: error.message });
  throw error;
};

export async function storefrontAnnouncementPublicRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    try {
      const query = publicAnnouncementQuerySchema.parse(request.query);
      return storefrontAnnouncementService.getPublic(query.scope, query.targetId);
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

export async function storefrontAnnouncementAdminRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", () => storefrontAnnouncementService.getAdmin());

  server.post("/", async (request, reply) => {
    try {
      return await storefrontAnnouncementService.create(createAnnouncementSchema.parse(request.body));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.put("/:id", async (request, reply) => {
    try {
      return await storefrontAnnouncementService.update(
        parseId((request.params as { id: string }).id),
        updateAnnouncementSchema.parse(request.body),
      );
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.patch("/:id/status", async (request, reply) => {
    try {
      const { active } = updateAnnouncementStatusSchema.parse(request.body);
      return await storefrontAnnouncementService.updateStatus(
        parseId((request.params as { id: string }).id),
        active,
      );
    } catch (error) {
      return handleError(error, reply);
    }
  });

  server.delete("/:id", async (request, reply) => {
    try {
      return await storefrontAnnouncementService.remove(parseId((request.params as { id: string }).id));
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

