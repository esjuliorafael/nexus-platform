import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";

export const authPlugin = fp(async (server) => {
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "super_secret",
  });

  server.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
