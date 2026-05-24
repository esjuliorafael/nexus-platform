import fp from "fastify-plugin";
import { storePrisma } from "@nexus/db/store";

let rafflePrismaClient: any = null;

if (process.env.RAFFLE_ENABLED === "true") {
  // Dynamic import so it doesn't crash if the module isn't generated when disabled
  const { rafflePrisma } = require("@nexus/db/raffle");
  rafflePrismaClient = rafflePrisma;
}

export const prismaPlugin = fp(async (server) => {
  server.decorate("storePrisma", storePrisma);
  if (rafflePrismaClient) {
    server.decorate("rafflePrisma", rafflePrismaClient);
  }

  server.addHook("onClose", async (server) => {
    await server.storePrisma.$disconnect();
    if (server.rafflePrisma) {
      await server.rafflePrisma.$disconnect();
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    storePrisma: typeof storePrisma;
    rafflePrisma: any; // changed from optional to allow direct access without undefined checks
  }
}
