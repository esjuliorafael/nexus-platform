import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";

export const authPlugin = fp(async (server) => {
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "super_secret",
  });

  server.decorate("authenticate", async function (request: any, reply: any) {
    let claims: any;
    try {
      claims = await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: "Sesión no válida." });
    }

    const userId = Number(claims?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return reply.status(401).send({ message: "Sesión no válida." });
    }

    const user = await server.storePrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        permissions: true,
        mustChangePassword: true,
      },
    });
    if (!user?.active) {
      return reply.status(401).send({ message: "La cuenta no está disponible." });
    }

    request.user = { ...claims, ...user };
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
