import { FastifyInstance } from "fastify";
import { mpService } from "./mercadopago.service";
import { z } from "zod";

export async function mpRoutes(server: FastifyInstance) {
  // Public: Get Auth URL for OAuth
  // Soporta query param ?channelId=...
  server.get("/auth-url", async (request, reply) => {
    const { channelId } = request.query as { channelId?: string };
    try {
      const url = await mpService.getAuthUrl(channelId);
      return { url };
    } catch (error: any) {
      return reply.status(500).send({ message: error.message });
    }
  });

  server.post("/disconnect-main", { preHandler: [server.authenticate] }, async (_request, reply) => {
    try {
      return await mpService.disconnectMainAccount();
    } catch (error: any) {
      return reply.status(500).send({
        message: error?.message || "No se pudo desvincular Mercado Pago",
      });
    }
  });

  // Public: Callback for OAuth
  server.get("/callback", async (request, reply) => {
    const { code, error } = request.query as { code?: string; state?: string; error?: string };
    const adminUrl = process.env.ADMIN_URL || "http://localhost:4000";

    if (error) {
      const status = error === "access_denied" ? "cancelled" : "error";
      return reply.redirect(`${adminUrl}?mp_connect=${status}`);
    }

    if (!code) return reply.redirect(`${adminUrl}?mp_connect=error`);

    try {
      await mpService.handleCallback(code, (request.query as { state?: string }).state || "main");
      return reply.redirect(`${adminUrl}?mp_connect=success`);
    } catch (error: any) {
      console.error("MP OAuth Error:", error);
      return reply.redirect(`${adminUrl}?mp_connect=error`);
    }
  });

  // Public: Redirect proxy to bridge HTTPS -> Localhost
  server.get("/redirect", async (request, reply) => {
    const { target, ref } = request.query as { target: string, ref: string };
    const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:3000";
    
    // Construir URL de retorno con los mismos params que envi\u00f3 MP
    const params = new URLSearchParams(request.query as any);
    return reply.redirect(`${storefrontUrl}/checkout?${params.toString()}`);
  });

  // Public: Webhook for IPN
  server.post("/webhook", async (request, reply) => {
    try {
      await mpService.handleWebhook(request.body, request.headers);
      return reply.status(200).send({ received: true });
    } catch (error) {
      console.error("MP Webhook Error:", error);
      return reply.status(200).send({ received: true });
    }
  });

  // Public: Create Payment Preference (from Storefront)
  server.post("/preference", async (request, reply) => {
    console.log('[MP] Preference request body:', JSON.stringify(request.body, null, 2));
    const schema = z.object({
      orderId: z.number(),
      isRaffle: z.boolean().optional()
    });
    let parsed: z.infer<typeof schema> | null = null;

    try {
      parsed = schema.parse(request.body);
      const { orderId, isRaffle } = parsed;
      const preference = await mpService.createPreference(orderId, isRaffle);
      console.log('[MP] Preference created successfully:', preference.id);
      return preference;
    } catch (error: any) {
      console.error('[MP] Preference creation error:', error);
      if (parsed?.orderId && !parsed.isRaffle) {
        const { orderService } = await import("../orders/order.service");
        await orderService.cancelPaymentAttempt(parsed.orderId, "FAILED");
      }
      return reply.status(500).send({ message: error.message });
    }
  });
}
