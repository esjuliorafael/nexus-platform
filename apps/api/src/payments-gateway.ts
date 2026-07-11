import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import axios from "axios";
import cors from "@fastify/cors";
import fastify from "fastify";
import crypto from "crypto";
import Redis from "ioredis";
import { z } from "zod";
import { platformPrisma } from "@nexus/db/platform";
import { signGatewayPayload, verifyGatewayPayload } from "./modules/store/payments/mercadopago-gateway.security";

type TenantConnection = {
  tenantId: string;
  tenantApiUrl: string;
  adminUrl: string;
  channelId?: string;
};

type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

const gatewayUrl = (process.env.MP_GATEWAY_URL || "").replace(/\/$/, "");
const gatewaySecret = process.env.MP_GATEWAY_SHARED_SECRET || "";
const clientId = process.env.MP_APP_CLIENT_ID || "";
const clientSecret = process.env.MP_APP_CLIENT_SECRET || "";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const sellerKey = (sellerId: string) => `nexus:mercadopago:seller:${sellerId}`;

const toTenantConnection = (connection: {
  tenantId: string;
  tenantApiUrl: string;
  adminUrl: string;
  channelId: string | null;
}): TenantConnection => ({
  tenantId: connection.tenantId,
  tenantApiUrl: connection.tenantApiUrl,
  adminUrl: connection.adminUrl,
  channelId: connection.channelId || undefined,
});

function redirectToAdmin(adminUrl: string, status: "success" | "cancelled" | "error") {
  const url = new URL(adminUrl);
  url.searchParams.set("mp_connect", status);
  return url.toString();
}

async function relayToTenant(connection: TenantConnection, pathName: string, payload: unknown) {
  const proof = signGatewayPayload(payload, gatewaySecret, 5 * 60 * 1000);
  return axios.post(`${connection.tenantApiUrl.replace(/\/$/, "")}${pathName}`, payload, {
    timeout: 15_000,
    headers: { "x-nexus-mp-gateway-proof": proof },
  });
}

function normalizeOAuthTokens(data: { access_token: string; refresh_token: string; expires_in?: number | string }): OAuthTokens {
  const expiresInSeconds = Number(data.expires_in || 0);
  const expiresAt = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? new Date(Date.now() + expiresInSeconds * 1000)
    : new Date(Date.now() + 150 * 24 * 60 * 60 * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: expiresAt.toISOString(),
  };
}

function verifyMercadoPagoSignature(payload: any, headers: Record<string, unknown>) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = headers["x-signature"];
  const xRequestId = headers["x-request-id"];
  if (typeof xSignature !== "string" || typeof xRequestId !== "string") return false;

  const values = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    }),
  );
  if (!values.ts || !values.v1) return false;

  const manifest = `id:${payload?.data?.id || payload?.id};request-id:${xRequestId};ts:${values.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const actual = String(values.v1);
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

const server = fastify({ logger: true, trustProxy: true });

async function bootstrap() {
  if (!gatewayUrl || !gatewaySecret || !clientId || !clientSecret) {
    throw new Error("Mercado Pago gateway is missing required environment configuration");
  }

  await server.register(cors, { origin: false });

  server.get("/api/v1/health", async () => ({ status: "ok", service: "mercadopago-gateway" }));

  server.get("/api/v1/mp/oauth/start", async (request, reply) => {
    const { state } = request.query as { state?: string };
    const connection = state ? verifyGatewayPayload<TenantConnection>(state, gatewaySecret) : null;
    if (!connection) return reply.status(400).send({ message: "Invalid or expired authorization request" });

    const redirectUri = `${gatewayUrl}/api/v1/mp/callback`;
    const url = new URL("https://auth.mercadopago.com.mx/authorization");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("platform_id", "mp");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state!);
    return reply.redirect(url.toString());
  });

  server.get("/api/v1/mp/callback", async (request, reply) => {
    const { code, error, state } = request.query as { code?: string; error?: string; state?: string };
    const connection = state ? verifyGatewayPayload<TenantConnection>(state, gatewaySecret) : null;
    if (!connection) return reply.status(400).send({ message: "Invalid or expired authorization request" });

    if (error || !code) return reply.redirect(redirectToAdmin(connection.adminUrl, error === "access_denied" ? "cancelled" : "error"));

    try {
      const form = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${gatewayUrl}/api/v1/mp/callback`,
      });
      const tokenResponse = await axios.post("https://api.mercadopago.com/oauth/token", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const oauthResponse = tokenResponse.data as { access_token: string; refresh_token: string; user_id: number | string; expires_in?: number | string };
      const credentials = normalizeOAuthTokens(oauthResponse);
      const sellerId = String(oauthResponse.user_id);

      await relayToTenant(connection, "/api/v1/mp/gateway/oauth-complete", {
        channelId: connection.channelId || null,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        accessTokenExpiresAt: credentials.accessTokenExpiresAt,
        sellerUserId: sellerId,
      });
      await platformPrisma.mercadoPagoConnection.upsert({
        where: { sellerUserId: sellerId },
        update: {
          tenantId: connection.tenantId,
          tenantApiUrl: connection.tenantApiUrl,
          adminUrl: connection.adminUrl,
          channelId: connection.channelId || null,
          status: "ACTIVE",
          connectedAt: new Date(),
          disconnectedAt: null,
        },
        create: {
          tenantId: connection.tenantId,
          tenantApiUrl: connection.tenantApiUrl,
          adminUrl: connection.adminUrl,
          channelId: connection.channelId || null,
          sellerUserId: sellerId,
        },
      });
      await redis.set(sellerKey(sellerId), JSON.stringify(connection));
      return reply.redirect(redirectToAdmin(connection.adminUrl, "success"));
    } catch (error) {
      server.log.error(error, "Mercado Pago OAuth callback failed");
      return reply.redirect(redirectToAdmin(connection.adminUrl, "error"));
    }
  });

  server.post("/api/v1/mp/webhook", async (request, reply) => {
    const payload = request.body as any;
    if (!verifyMercadoPagoSignature(payload, request.headers as Record<string, unknown>)) {
      server.log.warn("Rejected Mercado Pago webhook with invalid signature");
      return reply.status(200).send({ received: true });
    }

    const sellerId = payload?.user_id ? String(payload.user_id) : null;
    if (!sellerId) {
      server.log.warn({ payload }, "Mercado Pago webhook without seller identifier");
      return reply.status(200).send({ received: true });
    }

    const storedConnection = await platformPrisma.mercadoPagoConnection.findFirst({
      where: { sellerUserId: sellerId, status: "ACTIVE" },
    });
    if (!storedConnection) {
      server.log.warn({ sellerId }, "Mercado Pago webhook for an unknown seller");
      return reply.status(200).send({ received: true });
    }

    try {
      const connection = toTenantConnection(storedConnection);
      await relayToTenant(connection, "/api/v1/mp/gateway/webhook", payload);
      await platformPrisma.mercadoPagoConnection.update({
        where: { id: storedConnection.id },
        data: {
          lastWebhookAt: new Date(),
          lastWebhookType: String(payload?.action || payload?.type || "payment"),
        },
      });
    } catch (error) {
      server.log.error(error, "Could not relay Mercado Pago webhook to tenant");
    }
    return reply.status(200).send({ received: true });
  });

  server.post("/api/v1/mp/internal/disconnect", async (request, reply) => {
    const schema = z.object({ tenantId: z.string().min(1), sellerUserId: z.string().min(1) });
    const proof = request.headers["x-nexus-mp-gateway-proof"];
    const payload = typeof proof === "string" ? verifyGatewayPayload<z.infer<typeof schema>>(proof, gatewaySecret) : null;
    try {
      const body = schema.parse(request.body);
      if (!payload || JSON.stringify(payload) !== JSON.stringify(body)) {
        return reply.status(401).send({ message: "Unauthorized" });
      }
      const current = await platformPrisma.mercadoPagoConnection.findUnique({
        where: { sellerUserId: body.sellerUserId },
      });
      if (current?.tenantId === body.tenantId) {
        await platformPrisma.mercadoPagoConnection.update({
          where: { id: current.id },
          data: { status: "DISCONNECTED", disconnectedAt: new Date() },
        });
        await redis.del(sellerKey(body.sellerUserId));
      }
      return { success: true };
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      throw error;
    }
  });

  server.post("/api/v1/mp/internal/refresh", async (request, reply) => {
    const schema = z.object({ refreshToken: z.string().min(1), sellerUserId: z.string().min(1).optional() });
    const proof = request.headers["x-nexus-mp-gateway-proof"];
    const payload = typeof proof === "string" ? verifyGatewayPayload<z.infer<typeof schema>>(proof, gatewaySecret) : null;
    try {
      const body = schema.parse(request.body);
      if (!payload || JSON.stringify(payload) !== JSON.stringify(body)) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const form = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: body.refreshToken,
      });
      const tokenResponse = await axios.post("https://api.mercadopago.com/oauth/token", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const tokens = normalizeOAuthTokens(tokenResponse.data as { access_token: string; refresh_token: string; expires_in?: number | string });
      if (body.sellerUserId) {
        await platformPrisma.mercadoPagoConnection.updateMany({
          where: { sellerUserId: body.sellerUserId, status: "ACTIVE" },
          data: { lastRefreshedAt: new Date() },
        });
      }
      return tokens;
    } catch (error: any) {
      if (error?.issues) return reply.status(400).send({ message: "Validation error", errors: error.issues });
      server.log.error(error, "Mercado Pago token refresh failed");
      return reply.status(502).send({ message: "Could not refresh Mercado Pago credentials" });
    }
  });

  await server.listen({ port: Number(process.env.PORT || 8080), host: "0.0.0.0" });
}

bootstrap().catch(async (error) => {
  server.log.error(error);
  await redis.quit();
  process.exit(1);
});
