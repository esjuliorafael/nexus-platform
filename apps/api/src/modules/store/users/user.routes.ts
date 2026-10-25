import { FastifyInstance } from "fastify";
import { userService } from "./user.service";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { updateContactProfileSchema } from "../profile/profile.schema";
import { profileService } from "../profile/profile.service";

function rejectUnlessUsersManager(request: any, reply: any) {
  const permissions = request.user?.permissions || [];
  if (!permissions.includes("users.manage")) {
    reply.status(403).send({ message: "No tienes permiso para administrar usuarios." });
    return true;
  }
  return false;
}

function canAssignPermissions(actorPermissions: string[], requestedPermissions: string[]) {
  return requestedPermissions.every((permission) => actorPermissions.includes(permission));
}

function sendRouteError(error: any, reply: any) {
  if (error?.issues) {
    return reply.status(400).send({ message: "Validation error", errors: error.issues });
  }
  if (error?.code === "P2002") {
    return reply.status(409).send({ message: "El nombre de usuario ya esta en uso." });
  }
  return reply.status(error?.statusCode || 500).send({
    message: error?.message || "No se pudo completar la operacion.",
  });
}

export async function userRoutes(server: FastifyInstance) {
  server.addHook("preHandler", server.authenticate);

  server.get("/", async (request, reply) => {
    if (rejectUnlessUsersManager(request, reply)) return;
    return userService.getAll();
  });

  server.post("/", async (request, reply) => {
    if (rejectUnlessUsersManager(request, reply)) return;
    try {
      const validated = createUserSchema.parse(request.body);
      const actorPermissions = (request.user as any).permissions || [];
      if (!canAssignPermissions(actorPermissions, validated.permissions)) {
        return reply.status(403).send({ message: "No puedes asignar permisos que no tienes." });
      }
      return await userService.create(validated);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/:id", async (request, reply) => {
    if (rejectUnlessUsersManager(request, reply)) return;
    try {
      const { id } = request.params as { id: string };
      const target = await userService.getById(parseInt(id));
      if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
      const validated = updateUserSchema.parse(request.body);
      if (target.id === Number((request.user as any).id)) {
        return reply.status(409).send({ message: "Administra tu cuenta desde mi perfil." });
      }
      const actorPermissions = (request.user as any).permissions || [];
      const newlyGranted = validated.permissions?.filter(
        (permission) => !target.permissions.includes(permission),
      ) || [];
      if (!canAssignPermissions(actorPermissions, newlyGranted)) {
        return reply.status(403).send({ message: "No puedes asignar permisos que no tienes." });
      }
      return await userService.update(parseInt(id), validated);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/:id/contact", async (request, reply) => {
    if (rejectUnlessUsersManager(request, reply)) return;
    try {
      const { id } = request.params as { id: string };
      const target = await userService.getById(parseInt(id));
      if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
      const validated = updateContactProfileSchema.parse(request.body);
      return await profileService.updateContactProfile(parseInt(id), validated, true);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.delete("/:id", async (request, reply) => {
    if (rejectUnlessUsersManager(request, reply)) return;
    const { id } = request.params as { id: string };
    const targetId = parseInt(id);
    if (targetId === Number((request.user as any).id)) {
      return reply.status(409).send({ message: "No puedes eliminar tu propia cuenta." });
    }
    const target = await userService.getById(targetId);
    if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
    return userService.delete(targetId);
  });
}
