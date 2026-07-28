import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export type AuditActor = {
  type: "USER" | "SYSTEM" | "CUSTOMER" | "MERCADO_PAGO";
  userId?: number | null;
  name: string;
  role?: string | null;
  origin: "ADMIN" | "SYSTEM" | "STOREFRONT" | "MERCADO_PAGO";
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

export const systemAuditActor = (
  name = "Sistema",
  origin: AuditActor["origin"] = "SYSTEM",
): AuditActor => ({
  type: origin === "MERCADO_PAGO" ? "MERCADO_PAGO" : "SYSTEM",
  name,
  role: null,
  origin,
});

export const customerAuditActor = (): AuditActor => ({
  type: "CUSTOMER",
  name: "Cliente",
  role: null,
  origin: "STOREFRONT",
});

export async function requireAdminActor(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuditActor | null> {
  const userId = Number((request.user as { id?: number } | undefined)?.id);
  if (!Number.isInteger(userId) || userId < 1) {
    reply.status(401).send({ message: "Sesión administrativa no válida." });
    return null;
  }

  const user = await server.storePrisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!user?.active) {
    reply.status(403).send({ message: "La cuenta no está disponible." });
    return null;
  }
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    reply.status(403).send({
      message: "Solo administradores y superadministradores pueden realizar esta acción.",
    });
    return null;
  }

  return {
    type: "USER",
    userId: user.id,
    name: user.name,
    role: user.role,
    origin: "ADMIN",
    ipAddress: request.ip || null,
    userAgent:
      typeof request.headers["user-agent"] === "string"
        ? request.headers["user-agent"]
        : null,
    requestId: String(request.id),
  };
}

export async function requireAuthenticatedActor(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuditActor | null> {
  const userId = Number((request.user as { id?: number } | undefined)?.id);
  if (!Number.isInteger(userId) || userId < 1) {
    reply.status(401).send({ message: "Sesion administrativa no valida." });
    return null;
  }

  const user = await server.storePrisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!user?.active) {
    reply.status(403).send({ message: "La cuenta no esta disponible." });
    return null;
  }

  return {
    type: "USER",
    userId: user.id,
    name: user.name,
    role: user.role,
    origin: "ADMIN",
    ipAddress: request.ip || null,
    userAgent:
      typeof request.headers["user-agent"] === "string"
        ? request.headers["user-agent"]
        : null,
    requestId: String(request.id),
  };
}

export const auditActorData = (actor: AuditActor) => ({
  actorType: actor.type,
  actorUserId: actor.userId ?? null,
  actorName: actor.name,
  actorRole: actor.role ?? null,
  origin: actor.origin,
  ipAddress: actor.ipAddress ?? null,
  userAgent: actor.userAgent ?? null,
  requestId: actor.requestId ?? null,
});
