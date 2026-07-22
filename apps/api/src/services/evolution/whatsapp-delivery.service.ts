import { evolutionClient } from "./evolution.client";
import { sendAndLog, type SendAndLogParams } from "./evolution.service";
import type { EvolutionInstance } from "./evolution.types";

const CONNECTION_STATE_TTL_MS = 30_000;
const RECOVERABLE_CONNECTION_MARKERS = [
  "connection closed",
  "connection close",
  "device_removed",
  "not connected",
  "instance not found",
];

type CachedConnectionState = {
  state: "open" | "connecting" | "close";
  expiresAt: number;
};

const connectionStateCache = new Map<string, CachedConnectionState>();

export type WhatsappDeliveryRoute = {
  route: "DIRECT" | "PRINCIPAL_FALLBACK";
  preferredInstanceName?: string;
  fallbackReason?: string;
};

export function normalizePrincipalInstanceName(instanceName: string | null | undefined) {
  const normalized = String(instanceName || "").trim();
  if (!normalized) return "";
  return normalized.endsWith("_main") ? normalized : `${normalized}_main`;
}

export function isRecoverableWhatsappConnectionError(error: unknown) {
  const message = String((error as any)?.message || error || "").toLowerCase();
  return RECOVERABLE_CONNECTION_MARKERS.some((marker) => message.includes(marker));
}

function instanceKey(instance: EvolutionInstance) {
  return `${instance.baseUrl.replace(/\/+$/, "")}|${instance.instanceName}`;
}

function sameInstance(left: EvolutionInstance, right: EvolutionInstance) {
  return instanceKey(left) === instanceKey(right);
}

async function getConnectionState(instance: EvolutionInstance) {
  const key = instanceKey(instance);
  const cached = connectionStateCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.state;

  const result = await evolutionClient.getConnectionState(instance);
  connectionStateCache.set(key, {
    state: result.instance.state,
    expiresAt: Date.now() + CONNECTION_STATE_TTL_MS,
  });
  return result.instance.state;
}

function invalidateConnectionState(instance: EvolutionInstance) {
  connectionStateCache.delete(instanceKey(instance));
}

export function invalidateWhatsappConnectionState(instanceName: string) {
  for (const key of Array.from(connectionStateCache.keys())) {
    if (key.endsWith(`|${instanceName}`)) connectionStateCache.delete(key);
  }
}

function withRouting(
  params: SendAndLogParams,
  instance: EvolutionInstance,
  routing: WhatsappDeliveryRoute,
) {
  return sendAndLog({ ...params, instance, routing });
}

export async function sendWhatsappWithFailover(params: SendAndLogParams & {
  principalFallback?: EvolutionInstance | null;
}) {
  const { principalFallback, ...messageParams } = params;
  const preferred = params.instance;
  const principal = principalFallback && !sameInstance(preferred, principalFallback)
    ? principalFallback
    : null;

  if (!principal) {
    return withRouting(messageParams, preferred, { route: "DIRECT" });
  }

  try {
    const state = await getConnectionState(preferred);
    if (state !== "open") {
      return withRouting(messageParams, principal, {
        route: "PRINCIPAL_FALLBACK",
        preferredInstanceName: preferred.instanceName,
        fallbackReason: `La instancia especializada reportó estado ${state}.`,
      });
    }
  } catch (error) {
    if (isRecoverableWhatsappConnectionError(error)) {
      invalidateConnectionState(preferred);
      return withRouting(messageParams, principal, {
        route: "PRINCIPAL_FALLBACK",
        preferredInstanceName: preferred.instanceName,
        fallbackReason: String((error as any)?.message || error),
      });
    }
    // An ambiguous health-check failure must not cause a potentially duplicate send.
  }

  try {
    return await withRouting(messageParams, preferred, { route: "DIRECT" });
  } catch (error) {
    if (!isRecoverableWhatsappConnectionError(error)) throw error;

    invalidateConnectionState(preferred);
    return withRouting(messageParams, principal, {
      route: "PRINCIPAL_FALLBACK",
      preferredInstanceName: preferred.instanceName,
      fallbackReason: String((error as any)?.message || error),
    });
  }
}
