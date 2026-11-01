import type {
  WhatsappJobData,
  WhatsappJobRouting,
} from "../../queues/whatsapp.queue";
import type { WhatsappProviderKind } from "./whatsapp-provider.types";

const MAX_ASYNC_FALLBACK_DEPTH = 2;

export type WhatsappRoutingSnapshot = {
  route?: "DIRECT" | "PRINCIPAL_FALLBACK";
  preferredInstanceName?: string | null;
};

export function buildWhatsappAsyncFallbackPatch(params: {
  failedProvider: WhatsappProviderKind;
  routing?: WhatsappRoutingSnapshot | null;
  originalJob: WhatsappJobData;
  originalJobId?: string;
}): WhatsappJobRouting | null {
  const fallbackDepth = Number(params.originalJob.fallbackDepth || 0);
  if (fallbackDepth >= MAX_ASYNC_FALLBACK_DEPTH) return null;

  const hasPreferredChannel = Boolean(
    params.routing?.preferredInstanceName ||
    (!params.originalJob.forcePrincipal &&
      params.routing?.route === "PRINCIPAL_FALLBACK"),
  );
  const failedAtPrincipal =
    params.routing?.route === "PRINCIPAL_FALLBACK" ||
    !hasPreferredChannel ||
    params.originalJob.forcePrincipal === true;

  const fallbackProvider =
    params.failedProvider === "KAPSO" ? "EVOLUTION" : "KAPSO";
  const patch: WhatsappJobRouting = {
    forcePrincipal: failedAtPrincipal ? !hasPreferredChannel : true,
    forceProvider: failedAtPrincipal ? fallbackProvider : undefined,
    forceEvolution: undefined,
    fallbackDepth: fallbackDepth + 1,
  };

  const sourceJobId = params.originalJob.sourceJobId || params.originalJobId;
  return sourceJobId ? { ...patch, sourceJobId: String(sourceJobId) } : patch;
}
