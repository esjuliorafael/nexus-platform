import { FastifyInstance } from "fastify";
import { orderService } from "./order.service";
import { createOrderSchema, updateOrderStatusSchema } from "./order.schema";
import { OrderStatus } from "@prisma/client-store";

export async function orderRoutes(server: FastifyInstance) {
  // Storefront read (Public)
  server.get("/storefront", async (request) => {
    // This could be for a customer to check their order status if needed
    // or just a stub. The prompt says "GET /store/orders (storefront read)"
    return { message: "Storefront order check requires ID" };
  });

  // POST /store/orders (Public)
  server.post("/", async (request, reply) => {
    console.log('[Order] Incoming request body:', JSON.stringify(request.body, null, 2));
    try {
      const validated = createOrderSchema.parse(request.body);
      const order = await orderService.create(validated);
      return order;
    } catch (err: any) {
      console.error('[Order] Creation failed:', err);
      if (err.name === "ZodError") {
        return reply.status(400).send({ message: "Validation error", errors: err.errors });
      }
      return reply.status(400).send({ message: err.message });
    }
  });

  // Admin Routes (Protected)
  server.get("/admin", { preHandler: [server.authenticate] }, async (request) => {
    const { status } = request.query as { status?: OrderStatus };
    return orderService.getAll(status);
  });

  server.get("/admin/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await orderService.getById(parseInt(id));
    if (!order) return reply.status(404).send({ message: "Order not found" });
    return order;
  });

  server.patch("/admin/:id/status", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const validated = updateOrderStatusSchema.parse(request.body);
    return orderService.updateStatus(parseInt(id), validated.status);
  });

  server.post("/admin/:id/resend-whatsapp", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return orderService.resendNotification(parseInt(id));
  });

  server.delete("/admin/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await orderService.cancelOrder(parseInt(id));
    return { success: true };
  });
}
