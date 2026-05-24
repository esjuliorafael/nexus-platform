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

  // Public: Callback for OAuth
  server.get("/callback", async (request, reply) => {
    const { code, state } = request.query as { code: string, state: string };
    if (!code) return reply.status(400).send({ message: "Code is required" });

    try {
      await mpService.handleCallback(code, state);
      // Redirigir al admin con un query param de \u00e9xito
      return reply.redirect(`${process.env.ADMIN_URL}?mp_connect=success`);
    } catch (error: any) {
      console.error("MP OAuth Error:", error);
      return reply.redirect(`${process.env.ADMIN_URL}?mp_connect=error`);
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

    try {
      const { orderId, isRaffle } = schema.parse(request.body);
      const preference = await mpService.createPreference(orderId, isRaffle);
      console.log('[MP] Preference created successfully:', preference.id);
      return preference;
    } catch (error: any) {
      console.error('[MP] Preference creation error:', error);
      return reply.status(500).send({ message: error.message });
    }
  });
}
