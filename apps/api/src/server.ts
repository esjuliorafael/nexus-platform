import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import { z } from "zod";

// Plugins
import { prismaPlugin } from "./plugins/prisma.plugin";
import { authPlugin } from "./plugins/auth.plugin";
import { storeRoutes } from "./modules/store/store.routes";
import { rafflePlugin } from "./modules/raffle/raffle.plugin";

// Queues & Workers
import { orderReleaseWorker } from "./queues/order-release.queue";
import { ticketReleaseWorker } from "./queues/ticket-release.queue";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const server = fastify({
  logger: true,
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function bootstrap() {
  try {
    // Register Core Plugins
    await server.register(cors, { origin: true });
    await server.register(prismaPlugin);
    await server.register(authPlugin);

    // Register Health Check
    server.get("/api/v1/health", async () => {
      return { status: "ok" };
    });

    // Auth Routes
    server.post("/api/v1/auth/login", async (request, reply) => {
      const { username, password } = loginSchema.parse(request.body);
      
      const user = await server.storePrisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.active) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }

      const token = server.jwt.sign({ 
        id: user.id, 
        username: user.username, 
        role: user.role 
      });

      return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
    });

    server.get("/api/v1/auth/me", { preHandler: [server.authenticate] }, async (request) => {
      const payload = (request.user as any);
      const user = await server.storePrisma.user.findUnique({
        where: { id: payload.id },
      });
      if (!user) throw new Error("User not found");
      return { id: user.id, username: user.username, name: user.name, role: user.role };
    });

    // Register Store Routes
    await server.register(storeRoutes, { prefix: "/api/v1" });

    // Register Optional Raffle Module
    if (process.env.RAFFLE_ENABLED === "true") {
      await server.register(rafflePlugin, { prefix: "/api/v1" });
    }

    // Error Handler for Zod
    server.setErrorHandler((error, request, reply) => {
      if (error.name === "ZodError" || error instanceof z.ZodError) {
        return reply.status(400).send({
          message: "Validation error",
          errors: (error as z.ZodError).errors,
        });
      }
      
      if (error.statusCode === 401) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      server.log.error(error);
      return reply.status(500).send({ message: "Internal server error" });
    });

    // Ensure worker is running
    orderReleaseWorker.on("failed", (job, err) => {
      server.log.error(`Order release job ${job?.id} failed: ${err.message}`);
    });

    ticketReleaseWorker.on("failed", (job, err) => {
      server.log.error(`Ticket release job ${job?.id} failed: ${err.message}`);
    });

    // Start Server
    const port = parseInt(process.env.PORT || "3001", 10);
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
