import { FastifyInstance } from "fastify";
import { userService } from "./user.service";
import { createUserSchema, updateUserSchema } from "./user.schema";
import { updateContactProfileSchema } from "../profile/profile.schema";
import { profileService } from "../profile/profile.service";

function roleOf(request: any) {
  return String(request.user?.role || "").toUpperCase();
}

function rejectUnlessAdmin(request: any, reply: any) {
  const role = roleOf(request);
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    reply.status(403).send({ message: "No tienes permisos para administrar usuarios." });
    return true;
  }
  return false;
}

function canManageTarget(actorRole: string, targetRole: string) {
  return actorRole === "SUPERADMIN" || targetRole === "STAFF";
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
    if (rejectUnlessAdmin(request, reply)) return;
    return userService.getAll();
  });

  server.post("/", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply)) return;
    try {
      const validated = createUserSchema.parse(request.body);
      if (roleOf(request) !== "SUPERADMIN" && validated.role !== "STAFF") {
        return reply.status(403).send({ message: "Solo Superadmin puede crear administradores." });
      }
      return await userService.create(validated);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/:id", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply)) return;
    try {
      const { id } = request.params as { id: string };
      const target = await userService.getById(parseInt(id));
      if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
      const actorRole = roleOf(request);
      if (!canManageTarget(actorRole, target.role)) {
        return reply.status(403).send({ message: "No puedes modificar este usuario." });
      }
      const validated = updateUserSchema.parse(request.body);
      if (actorRole !== "SUPERADMIN" && validated.role && validated.role !== "STAFF") {
        return reply.status(403).send({ message: "Solo Superadmin puede asignar ese rol." });
      }
      return await userService.update(parseInt(id), validated);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.put("/:id/contact", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply)) return;
    try {
      const { id } = request.params as { id: string };
      const target = await userService.getById(parseInt(id));
      if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
      if (!canManageTarget(roleOf(request), target.role)) {
        return reply.status(403).send({ message: "No puedes modificar este contacto." });
      }
      const validated = updateContactProfileSchema.parse(request.body);
      return await profileService.updateContactProfile(parseInt(id), validated, true);
    } catch (error) {
      return sendRouteError(error, reply);
    }
  });

  server.delete("/:id", async (request, reply) => {
    if (rejectUnlessAdmin(request, reply)) return;
    const { id } = request.params as { id: string };
    const targetId = parseInt(id);
    if (targetId === Number((request.user as any).id)) {
      return reply.status(409).send({ message: "No puedes eliminar tu propia cuenta." });
    }
    const target = await userService.getById(targetId);
    if (!target) return reply.status(404).send({ message: "Usuario no encontrado." });
    if (!canManageTarget(roleOf(request), target.role)) {
      return reply.status(403).send({ message: "No puedes eliminar este usuario." });
    }
    return userService.delete(targetId);
  });
}
