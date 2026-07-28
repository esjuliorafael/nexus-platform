import type { CloudTemplateType } from "./whatsapp-cloud-template.service";
import type { WhatsappProviderKind } from "./whatsapp-provider.types";

export type WhatsappDeliveryClass = "CRITICAL" | "OPERATIONAL" | "CAMPAIGN";
export type WhatsappDeliveryStrategy =
  | "STANDARD"
  | "KAPSO_PREFERRED"
  | "EVOLUTION_ONLY";

export type WhatsappDeliveryPolicy = {
  classification: WhatsappDeliveryClass;
  providerPriority: readonly WhatsappProviderKind[];
};

const KAPSO_FIRST = ["KAPSO", "EVOLUTION"] as const;
const EVOLUTION_FIRST = ["EVOLUTION", "KAPSO"] as const;

const CRITICAL_TYPES = new Set<CloudTemplateType>([
  "PAYMENT_CONFIRMED",
  "PAYMENT_REFUNDED",
  "RESULT_WINNER",
]);

const CAMPAIGN_TYPES = new Set<CloudTemplateType>([
  "OPENING",
  "RAFFLE_INVITATION",
  "RESULT_PARTICIPANTS",
]);

export function getWhatsappDeliveryPolicy(
  type: CloudTemplateType,
): WhatsappDeliveryPolicy {
  if (CRITICAL_TYPES.has(type)) {
    return {
      classification: "CRITICAL",
      providerPriority: KAPSO_FIRST,
    };
  }

  if (CAMPAIGN_TYPES.has(type)) {
    return {
      classification: "CAMPAIGN",
      providerPriority: KAPSO_FIRST,
    };
  }

  return {
    classification: "OPERATIONAL",
    providerPriority: EVOLUTION_FIRST,
  };
}

export function resolveWhatsappProviderPriority(params: {
  type: CloudTemplateType;
  forceProvider?: WhatsappProviderKind;
  kapsoEnabled?: boolean;
  deliveryStrategy?: WhatsappDeliveryStrategy;
}) {
  if (
    params.kapsoEnabled === false ||
    params.deliveryStrategy === "EVOLUTION_ONLY"
  ) {
    return ["EVOLUTION"] as const;
  }
  if (params.forceProvider) return [params.forceProvider] as const;
  if (params.deliveryStrategy === "KAPSO_PREFERRED") return KAPSO_FIRST;
  return getWhatsappDeliveryPolicy(params.type).providerPriority;
}

export function isKapsoTenantDeliveryEnabled(value: unknown) {
  return !["0", "false", "off", "disabled"].includes(
    String(value ?? "1")
      .trim()
      .toLowerCase(),
  );
}
