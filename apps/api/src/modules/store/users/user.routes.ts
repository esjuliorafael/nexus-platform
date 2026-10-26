import { FastifyInstance } from "fastify";
import { userService } from "./user.service";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { updateContactProfileSchema } from "../profile/profile.schema";
import { profileService } from "../profile/profile.service";

function rejectUnlessPermission(request: any, reply: any, permission: string) {
  const permissions = request.user?.permissions || [];
  if (!permissions.includes(permission)) {
    reply.status(403).send({ message: "No tienes permiso para realizar esta acción." });
    return true;
  }
  return false;
}

function isSuperadmin(request: any) {
  return request.user?.role === "SUPERADMIN";
}

function containsSuperadminOnlyPermissions(permissions: string[]) {
  return permissions.some((permission) => [
    "platform.settings.view",
    "platform.settings.manage",
    "users.roles.manage",
  ].includes(permission));
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
    if (rejectUnlessPermission(request, reply, "users.view")) return;
    return userService.getAll();
  });

  server.post("/", async (request, reply) => {
    if (rejectUnlessPermission(request, reply, "users.create")) return;
    try {
      const validated = createUserSchema.parse(request.body);
      const actorPermissions = (request.user as any).permissions || [];
      if (rejectUnlessPermission(request, reply, "users.permissions.manage")) return;
      if (validated.role !== "STAFF" && (!isSuperadmin(request) || rejectUnlessPermission(request, reply, "users.roles.manage"))) {
        if (!reply.sent) return reply.status(403).send({ message: "Solo Superadmin puede asignar roles privilegiados." });
        return;
      }
      if (containsSuperadminOnlyPermissions(validated.permissions) && (validated.role !== "SUPERADMIN" || !isSuperadmin(request))) {
        return reply.status(403).send({ message: "Los permisos de plataforma y roles solo pueden asignarse a cuentas Superadmin." });
      }
      if (!canAssignPermissions(actorPermissions, validated.permissions)) {
        return reply.status(403).send({ message: "No puedes asignar permisos que no tienes." });
      }
      return await userService.create(validated);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/:id", async (request, reply) => {
    if (rejectUnlessPermission(request, reply, "users.update")) return;
    try {
      const { id } = request.params as { id: string };
      const target = await userService.getById(parseInt(id));
      if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
      const validated = updateUserSchema.parse(request.body);
      if (target.id === Number((request.user as any).id)) {
        return reply.status(409).send({ message: "Administra tu cuenta desde mi perfil." });
      }
      if (target.role === "SUPERADMIN" && !isSuperadmin(request)) {
        return reply.status(403).send({ message: "Solo Superadmin puede modificar otra cuenta Superadmin." });
      }
      const actorPermissions = (request.user as any).permissions || [];
      if (validated.permissions && rejectUnlessPermission(request, reply, "users.permissions.manage")) return;
      if (validated.role !== undefined && validated.role !== target.role) {
        if (!isSuperadmin(request)) {
          return reply.status(403).send({ message: "Solo Superadmin puede cambiar roles." });
        }
        if (rejectUnlessPermission(request, reply, "users.roles.manage")) return;
      }
      if (validated.permissions && containsSuperadminOnlyPermissions(validated.permissions) &&
        (target.role !== "SUPERADMIN" || !isSuperadmin(request))) {
        return reply.status(403).send({ message: "Los permisos de plataforma y roles solo pueden asignarse a cuentas Superadmin." });
      }
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
    if (rejectUnlessPermission(request, reply, "users.update")) return;
    try {
      const { id } = request.params as { id: string };
      const target = await userService.getById(parseInt(id));
      if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
      if (target.role === "SUPERADMIN" && !isSuperadmin(request)) {
        return reply.status(403).send({ message: "Solo Superadmin puede modificar otra cuenta Superadmin." });
      }
      const validated = updateContactProfileSchema.parse(request.body);
      return await profileService.updateContactProfile(parseInt(id), validated, true);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.delete("/:id", async (request, reply) => {
    if (rejectUnlessPermission(request, reply, "users.delete")) return;
    const { id } = request.params as { id: string };
    const targetId = parseInt(id);
    if (targetId === Number((request.user as any).id)) {
      return reply.status(409).send({ message: "No puedes eliminar tu propia cuenta." });
    }
    const target = await userService.getById(targetId);
    if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
    if (target.role === "SUPERADMIN" && !isSuperadmin(request)) {
      return reply.status(403).send({ message: "Solo Superadmin puede eliminar otra cuenta Superadmin." });
    }
    return userService.delete(targetId);
  });
}
