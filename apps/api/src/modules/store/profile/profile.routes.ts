import { FastifyInstance } from "fastify";
import {
  changeOwnPasswordSchema,
  updateContactProfileSchema,
  updateOwnNotificationsSchema,
  updateOwnProfileSchema,
} from "./profile.schema";
import { profileService } from "./profile.service";

function sendRouteError(error: any, reply: any) {
  if (error?.issues) {
    return reply.status(400).send({ message: "Validation error", errors: error.issues });
  }
  return reply.status(error?.statusCode || 500).send({
    message: error?.message || "No se pudo completar la operacion.",
  });
}

export async function ownProfileRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/profile", async (request, reply) => {
    const userId = Number((request.user as any).id);
    const profile = await profileService.getOwnProfile(userId);
    if (!profile) return reply.status(404).send({ message: "Usuario no encontrado." });
    return profile;
  });

  server.put("/profile", async (request, reply) => {
    try {
      const data = updateOwnProfileSchema.parse(request.body);
      return await profileService.updateOwnProfile(Number((request.user as any).id), data);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/notifications", async (request, reply) => {
    try {
      const data = updateOwnNotificationsSchema.parse(request.body);
      return await profileService.updateOwnNotifications(Number((request.user as any).id), data);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/contact", async (request, reply) => {
    try {
      const data = updateContactProfileSchema.parse(request.body);
      const role = String((request.user as any).role || "").toUpperCase();
      return await profileService.updateContactProfile(
        Number((request.user as any).id),
        data,
        role === "ADMIN" || role === "SUPERADMIN",
      );
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/password", async (request, reply) => {
    try {
      const data = changeOwnPasswordSchema.parse(request.body);
      return await profileService.changeOwnPassword(
        Number((request.user as any).id),
        data.currentPassword,
        data.newPassword,
      );
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });
}

export async function publicContactRoutes(server: FastifyInstance) {
  server.get("/", async () => profileService.getPublicContacts());
}
