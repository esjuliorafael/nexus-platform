import { FastifyInstance } from "fastify";
import { orderService } from "./order.service";
import {
  cancelPaymentAttemptSchema,
  createOrderSchema,
  markOrdersReadSchema,
  updateOrderCustomerSchema,
  updateOrderStatusSchema,
} from "./order.schema";
import { OrderStatus } from "@prisma/client-store";
import { storePaymentHoldService } from "./store-payment-hold.service";
import { z } from "zod";
import { customerPhoneSchema } from "../../../utils/customer-phone";
import { customerAuditActor, requireAdminActor } from "../../../utils/admin-authorization";
import { getStoreOrderAccess } from "./store-order-access.service";
import {
  assistedCheckoutService,
  type AssistedCheckoutLinkStatus,
} from "./assisted-checkout.service";

const convertPaymentHoldSchema = z.object({
  customerPhone: customerPhoneSchema,
});

const assistedCheckoutTokenSchema = z.string().min(32).max(180);
const createAssistedCheckoutLinkSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99).default(1),
});
const assistedCheckoutLinkStatusSchema = z.enum([
  "ACTIVE",
  "IN_PAYMENT",
  "PAID",
  "EXPIRED",
  "REVOKED",
]);
const assistedCheckoutLinkQuerySchema = z.object({
  status: assistedCheckoutLinkStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});
const assistedCheckoutLinkParamsSchema = z.object({ id: z.string().uuid() });

export async function orderRoutes(server: FastifyInstance) {
  // Private Storefront read. The token is opaque and is bound to the order phone hash.
  server.get("/access/:token", { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } }, async (request, reply) => {
    try {
      const token = z.string().min(32).max(180).parse((request.params as { token?: string }).token);
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      reply.header("Pragma", "no-cache");
      reply.header("Vary", "Origin");
      const access = await getStoreOrderAccess(token);
      if (!access) {
        return reply.status(404).send({ message: "La consulta privada no está disponible o ha vencido." });
      }
      return access;
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });

  server.get("/assisted-checkout/:token", { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } }, async (request, reply) => {
    try {
      const token = assistedCheckoutTokenSchema.parse((request.params as { token?: string }).token);
      reply.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return await assistedCheckoutService.resolveLink(token);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      return reply.status(error?.statusCode || 400).send({ message: error?.message || "El enlace no está disponible.", code: error?.code });
    }
  });

  // POST /store/orders (Public)
  server.post("/", async (request, reply) => {
    console.log('[Order] Incoming request body:', JSON.stringify(request.body, null, 2));
    try {
      const validated = createOrderSchema.parse(request.body);
      if (validated.assistedCheckoutToken) {
        return reply.status(400).send({ message: "Un enlace asistido debe continuar por Mercado Pago." });
      }
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

  server.post("/payment-holds", async (request, reply) => {
    try {
      const validated = createOrderSchema.parse(request.body);
      if (validated.paymentMethod !== "MERCADOPAGO") {
        return reply.status(400).send({ message: "Una retención de pago requiere Mercado Pago." });
      }
      return await storePaymentHoldService.create(validated);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      return reply.status(error?.statusCode || 400).send({ message: error?.message || "No se pudo retener el inventario." });
    }
  });

  server.post("/payment-holds/:holdId/transfer", async (request, reply) => {
    try {
      const { holdId } = request.params as { holdId: string };
      const body = convertPaymentHoldSchema.parse(request.body);
      return await storePaymentHoldService.convertToTransfer(holdId, body.customerPhone);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      return reply.status(error?.statusCode || 400).send({
        message: error?.message || "No se pudo cambiar el método de pago.",
        code: error?.code,
      });
    }
  });

  server.post("/admin/assisted-checkout-links", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const body = createAssistedCheckoutLinkSchema.parse(request.body);
      return await assistedCheckoutService.createLink(body.productId, body.quantity, actor.userId);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      return reply.status(error?.statusCode || 400).send({ message: error?.message || "No se pudo generar el enlace.", code: error?.code });
    }
  });

  server.get("/admin/assisted-checkout-links", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const query = assistedCheckoutLinkQuerySchema.parse(request.query);
      return await assistedCheckoutService.listLinks(
        query.status as AssistedCheckoutLinkStatus | undefined,
        query.search,
      );
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      return reply.status(error?.statusCode || 400).send({ message: error?.message || "No se pudieron consultar los enlaces.", code: error?.code });
    }
  });

  server.post("/admin/assisted-checkout-links/:id/revoke", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { id } = assistedCheckoutLinkParamsSchema.parse(request.params);
      return await assistedCheckoutService.revokeLink(id, actor.userId!);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      return reply.status(error?.statusCode || 400).send({ message: error?.message || "No se pudo revocar el enlace.", code: error?.code });
    }
  });

  server.post("/admin/assisted-checkout-links/:id/regenerate", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { id } = assistedCheckoutLinkParamsSchema.parse(request.params);
      return await assistedCheckoutService.regenerateLink(id, actor.userId!);
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      return reply.status(error?.statusCode || 400).send({ message: error?.message || "No se pudo regenerar el enlace.", code: error?.code });
    }
  });

  server.post("/:id/payment-attempt/cancel", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const orderId = parseInt(id, 10);
      if (!Number.isInteger(orderId) || orderId < 1) {
        return reply.status(400).send({ message: "Invalid order id" });
      }

      const body = cancelPaymentAttemptSchema.parse(request.body);
      return await orderService.cancelPaymentAttemptForCustomer(
        orderId,
        body.customerPhone,
        customerAuditActor(),
      );
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  // Admin Routes (Protected)
  server.get("/admin", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { status } = request.query as { status?: OrderStatus };
    const userId = Number((request.user as { id?: number })?.id);
    if (!Number.isInteger(userId) || userId < 1) {
      return reply.status(401).send({ message: "Invalid authentication payload" });
    }
    return orderService.getAll(status, userId);
  });

  server.post("/admin/read", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const body = markOrdersReadSchema.parse(request.body);
      const userId = Number((request.user as { id?: number })?.id);
      if (!Number.isInteger(userId) || userId < 1) {
        return reply.status(401).send({ message: "Invalid authentication payload" });
      }
      return orderService.markRead(body.ids, userId);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      throw error;
    }
  });

  server.get("/admin/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await orderService.getById(id);
    if (!order) return reply.status(404).send({ message: "Order not found" });
    return order;
  });

  server.get("/admin/:id/whatsapp-logs", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orderId = parseInt(id, 10);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return reply.status(400).send({ message: "Invalid order id" });
    }
    return orderService.getWhatsappLogs(orderId);
  });

  server.patch("/admin/:id/customer", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { id } = request.params as { id: string };
      const orderId = parseInt(id, 10);
      if (!Number.isInteger(orderId) || orderId < 1) {
        return reply.status(400).send({ message: "Invalid order id" });
      }
      const validated = updateOrderCustomerSchema.parse(request.body);
      return orderService.updateCustomer(orderId, validated, actor);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      throw error;
    }
  });

  server.patch("/admin/:id/status", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { id } = request.params as { id: string };
      const orderId = parseInt(id, 10);
      if (!Number.isInteger(orderId) || orderId < 1) {
        return reply.status(400).send({ message: "Invalid order id" });
      }
      const validated = updateOrderStatusSchema.parse(request.body);
      if (validated.status === "CANCELLED") {
        return orderService.cancelOrder(orderId, actor);
      }
      return orderService.updateStatus(orderId, validated.status, actor);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({
          message: "Validation error",
          errors: error.issues,
        });
      }
      throw error;
    }
  });

  server.post("/admin/:id/resend-whatsapp", { preHandler: [server.authenticate] }, async (request, reply) => {
    const actor = await requireAdminActor(server, request, reply);
    if (!actor) return;
    const { id } = request.params as { id: string };
    return orderService.resendNotification(parseInt(id), actor);
  });

  server.post("/admin/:id/restore", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { id } = request.params as { id: string };
      const orderId = parseInt(id, 10);
      if (!Number.isInteger(orderId) || orderId < 1) {
        return reply.status(400).send({ message: "Invalid order id" });
      }
      return await orderService.restoreOrder(orderId, actor);
    } catch (error: any) {
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  server.post("/admin/:id/refund", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const actor = await requireAdminActor(server, request, reply);
      if (!actor) return;
      const { id } = request.params as { id: string };
      const orderId = parseInt(id, 10);
      if (!Number.isInteger(orderId) || orderId < 1) {
        return reply.status(400).send({ message: "Invalid order id" });
      }

      const { mpService } = await import("../payments/mercadopago.service");
      return await mpService.refundOrder(orderId, actor);
    } catch (error: any) {
      if (error?.statusCode) {
        return reply.status(error.statusCode).send({ message: error.message });
      }
      return reply.status(400).send({
        message: error?.message || "No se pudo devolver el pago.",
      });
    }
  });

  server.delete("/admin/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const actor = await requireAdminActor(server, request, reply);
    if (!actor) return;
    const { id } = request.params as { id: string };
    await orderService.cancelOrder(parseInt(id), actor);
    return { success: true };
  });
}
