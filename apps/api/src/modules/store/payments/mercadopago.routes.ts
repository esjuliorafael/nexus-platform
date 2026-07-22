import { FastifyInstance } from "fastify";
import { mpService } from "./mercadopago.service";
import { z } from "zod";
import { customerPhoneSchema } from "../../../utils/customer-phone";
import { verifyGatewayPayload } from "./mercadopago-gateway.security";

export async function mpRoutes(server: FastifyInstance) {
  server.get("/checkout-config", async () => mpService.getPublicCheckoutConfig());

  server.get("/raffle-checkout", async () => ({
    available: await mpService.isRaffleCheckoutAvailable(),
  }));

  const verifyGatewayRequest = (request: any) => {
    const secret = process.env.MP_GATEWAY_SHARED_SECRET;
    const proof = request.headers["x-nexus-mp-gateway-proof"];
    if (!secret || typeof proof !== "string") return null;
    const payload = verifyGatewayPayload<any>(proof, secret);
    return payload && JSON.stringify(payload) === JSON.stringify(request.body) ? payload : null;
  };

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

  // Internal only: the multi-tenant gateway exchanges OAuth codes and delivers seller credentials.
  server.post("/gateway/oauth-complete", async (request, reply) => {
    const schema = z.object({
      channelId: z.string().nullable(),
      accessToken: z.string().min(1),
      refreshToken: z.string().min(1),
      accessTokenExpiresAt: z.string().datetime(),
      sellerUserId: z.string().min(1),
    });
    try {
      const data = schema.parse(request.body);
      if (!verifyGatewayRequest(request)) return reply.status(401).send({ message: "Unauthorized" });
      await mpService.saveGatewayConnection(data);
      return { success: true };
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  // Internal only: Mercado Pago notifications were verified and routed by api.link-nex.us.
  server.post("/gateway/webhook", async (request, reply) => {
    if (!verifyGatewayRequest(request)) return reply.status(401).send({ message: "Unauthorized" });
    try {
      await mpService.handleWebhook(request.body, {});
      return { received: true };
    } catch (error) {
      request.log.error(error, "Relayed Mercado Pago webhook failed");
      return reply.status(200).send({ received: true });
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
    const raffleMatch = /^raffle_(\d+)_/.exec(ref || "");
    const destination = raffleMatch ? `/raffles/${raffleMatch[1]}` : "/checkout";
    return reply.redirect(`${storefrontUrl}${destination}?${params.toString()}`);
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
      orderId: z.number().optional(),
      isRaffle: z.boolean().optional(),
      raffleReservationId: z.string().uuid().optional(),
    }).superRefine((value, context) => {
      if (value.isRaffle && !value.raffleReservationId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "raffleReservationId is required" });
      }
      if (!value.isRaffle && !value.orderId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "orderId is required" });
      }
    });
    let parsed: z.infer<typeof schema> | null = null;

    try {
      parsed = schema.parse(request.body);
      const { orderId, isRaffle, raffleReservationId } = parsed;
      const preference = await mpService.createPreference(orderId ?? null, isRaffle, raffleReservationId);
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

  server.post("/card-payment", {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    const schema = z.object({
      paymentAttemptId: z.string().uuid(),
      storePaymentHoldId: z.string().uuid().optional(),
      rafflePaymentHoldId: z.string().uuid().optional(),
      customerPhone: customerPhoneSchema,
      token: z.string().min(1),
      issuerId: z.string().optional(),
      paymentMethodId: z.string().min(1),
      installments: z.number().int().positive().max(24),
      payer: z.object({
        email: z.string().email(),
        identification: z.object({
          type: z.string().min(1),
          number: z.string().min(1),
        }).optional(),
      }),
    }).superRefine((value, context) => {
      if (Boolean(value.storePaymentHoldId) === Boolean(value.rafflePaymentHoldId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide exactly one payment reference",
        });
      }
    });

    try {
      const body = schema.parse(request.body);
      return await mpService.createCardPayment(body);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      return reply.status(error?.statusCode || 500).send({
        message: error?.message || "No se pudo procesar el pago con tarjeta.",
        statusDetail: error?.statusDetail || null,
        retryable: Boolean(error?.retryable),
        uncertain: Boolean(error?.uncertain),
        attemptId: error?.attemptId || null,
      });
    }
  });

  server.get("/card-payment/status", async (request, reply) => {
    const schema = z.object({
      storePaymentHoldId: z.string().uuid().optional(),
      rafflePaymentHoldId: z.string().uuid().optional(),
      customerPhone: customerPhoneSchema,
    }).superRefine((value, context) => {
      if (Boolean(value.storePaymentHoldId) === Boolean(value.rafflePaymentHoldId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide exactly one payment reference",
        });
      }
    });

    try {
      const query = schema.parse(request.query);
      return await mpService.getCardPaymentStatus(query);
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      return reply.status(error?.statusCode || 500).send({
        message: error?.message || "No se pudo consultar el pago.",
      });
    }
  });
}
