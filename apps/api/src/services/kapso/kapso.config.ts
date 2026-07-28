import { z } from "zod";
import type { KapsoConfig } from "./kapso.types";

const kapsoEnvironmentSchema = z.object({
  KAPSO_API_KEY: z.string().trim().min(1),
  KAPSO_PHONE_NUMBER_ID: z.string().trim().optional(),
  KAPSO_BUSINESS_ACCOUNT_ID: z.string().trim().optional(),
  KAPSO_WEBHOOK_SECRET: z.string().trim().optional(),
  KAPSO_PLATFORM_WEBHOOK_SECRET: z.string().trim().optional(),
  KAPSO_API_BASE_URL: z.string().url().optional(),
});

export type KapsoChannelIdentity = {
  phoneNumberId: string;
  businessAccountId?: string;
};

export function isKapsoPilotEnabled() {
  return process.env.KAPSO_PILOT_ENABLED === "true";
}

export function isKapsoDeliveryEnabled() {
  return process.env.KAPSO_DELIVERY_ENABLED === "true";
}

export function getKapsoConfig(): KapsoConfig | null {
  const parsed = kapsoEnvironmentSchema.safeParse(process.env);
  if (!parsed.success || !parsed.data.KAPSO_PHONE_NUMBER_ID) return null;

  return {
    apiKey: parsed.data.KAPSO_API_KEY,
    phoneNumberId: parsed.data.KAPSO_PHONE_NUMBER_ID,
    businessAccountId: parsed.data.KAPSO_BUSINESS_ACCOUNT_ID || undefined,
    webhookSecret: parsed.data.KAPSO_WEBHOOK_SECRET || undefined,
    apiBaseUrl:
      parsed.data.KAPSO_API_BASE_URL?.replace(/\/+$/, "") ||
      "https://api.kapso.ai",
  };
}

export function getKapsoConfigForChannel(
  identity: KapsoChannelIdentity,
): KapsoConfig | null {
  const parsed = kapsoEnvironmentSchema.safeParse(process.env);
  if (!parsed.success || !identity.phoneNumberId.trim()) return null;

  return {
    apiKey: parsed.data.KAPSO_API_KEY,
    phoneNumberId: identity.phoneNumberId.trim(),
    businessAccountId: identity.businessAccountId?.trim() || undefined,
    webhookSecret: parsed.data.KAPSO_WEBHOOK_SECRET || undefined,
    apiBaseUrl:
      parsed.data.KAPSO_API_BASE_URL?.replace(/\/+$/, "") ||
      "https://api.kapso.ai",
  };
}

export function requireKapsoPlatformConfig() {
  const parsed = kapsoEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    throw Object.assign(
      new Error("Kapso Platform no está configurado en este servidor."),
      { statusCode: 503 },
    );
  }
  return {
    apiKey: parsed.data.KAPSO_API_KEY,
    webhookSecret: parsed.data.KAPSO_WEBHOOK_SECRET || undefined,
    platformWebhookSecret:
      parsed.data.KAPSO_PLATFORM_WEBHOOK_SECRET ||
      parsed.data.KAPSO_WEBHOOK_SECRET ||
      undefined,
    apiBaseUrl:
      parsed.data.KAPSO_API_BASE_URL?.replace(/\/+$/, "") ||
      "https://api.kapso.ai",
  };
}

export function requireKapsoConfig(): KapsoConfig {
  const config = getKapsoConfig();
  if (!config) {
    throw Object.assign(
      new Error(
        "Kapso local pilot is not configured. Set KAPSO_API_KEY and KAPSO_PHONE_NUMBER_ID.",
      ),
      { statusCode: 503 },
    );
  }
  return config;
}
