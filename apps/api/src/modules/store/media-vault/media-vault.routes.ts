import { FastifyInstance } from "fastify";
import {
  mediaVaultIdSchema,
  mediaVaultListSchema,
  mediaVaultUploadSchema,
} from "./media-vault.schema";
import { mediaVaultService } from "./media-vault.service";
import { actorHasPermission } from "../../../utils/user-permissions";
import type { PermissionId } from "@nexus/types";

function rejectUnlessAdmin(request: any, reply: any, permission: PermissionId) {
  if (!actorHasPermission(request, permission)) {
    reply.status(403).send({ message: "No tienes permiso para realizar esta acción en la bóveda." });
    return true;
  }
  return false;
}

function sendError(error: any, reply: any) {
  if (error?.issues) {
    return reply.status(400).send({ message: "Validation error", errors: error.issues });
  }
  return reply.status(error?.statusCode || 500).send({
    message: error?.message || "No se pudo completar la operación.",
  });
}

export async function mediaVaultRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply, "media.vault.view")) return;
    try {
      return await mediaVaultService.list(mediaVaultListSchema.parse(request.query));
    } catch (error) {
      return sendError(error, reply);
    }
  });

  server.post("/uploads", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply, "media.vault.upload")) return;
    try {
      const body = mediaVaultUploadSchema.parse(request.body);
      const userId = Number((request.user as any).id);
      const user = await server.storePrisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });
      if (!user) return reply.status(401).send({ message: "Usuario no encontrado." });
      return await mediaVaultService.beginUpload(body, user);
    } catch (error) {
      return sendError(error, reply);
    }
  });

  server.post("/:id/complete", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply, "media.vault.upload")) return;
    try {
      const { id } = mediaVaultIdSchema.parse(request.params);
      return await mediaVaultService.completeUpload(id);
    } catch (error) {
      return sendError(error, reply);
    }
  });

  server.post("/:id/download", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply, "media.vault.view")) return;
    try {
      const { id } = mediaVaultIdSchema.parse(request.params);
      return await mediaVaultService.createDownload(id);
    } catch (error) {
      return sendError(error, reply);
    }
  });

  server.post("/:id/extend", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply, "media.vault.upload")) return;
    try {
      const { id } = mediaVaultIdSchema.parse(request.params);
      return await mediaVaultService.extend(id);
    } catch (error) {
      return sendError(error, reply);
    }
  });

  server.delete("/:id", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply, "media.vault.delete")) return;
    try {
      const { id } = mediaVaultIdSchema.parse(request.params);
      return await mediaVaultService.delete(id);
    } catch (error) {
      return sendError(error, reply);
    }
  });
}
