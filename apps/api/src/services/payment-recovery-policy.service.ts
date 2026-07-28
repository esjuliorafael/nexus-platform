import { storePrisma } from "@nexus/db/store";
import {
  isPaymentRecoveryEffective,
  isPaymentRecoveryServerEnabled,
  isPaymentRecoveryTenantEnabled,
} from "./payment-recovery.config";
import { getCloudTemplateContentHash } from "./whatsapp/whatsapp-cloud-template.service";
import { isKapsoDeliveryEnabled } from "./kapso/kapso.config";
import {
  isKapsoTenantDeliveryEnabled,
  resolveWhatsappProviderPriority,
} from "./whatsapp/whatsapp-delivery-policy";

const STORE_TEMPLATE_KEY = "whatsapp_global_store_payment_recovery";
const RAFFLE_TEMPLATE_KEY = "whatsapp_global_raffle_payment_recovery";

export type PaymentRecoveryOperationalStatus = {
  serverEnabled: boolean;
  tenantEnabled: boolean;
  templatesReady: boolean;
  effective: boolean;
};

export async function getPaymentRecoveryOperationalStatus(options?: {
  inspectWhenServerDisabled?: boolean;
}): Promise<PaymentRecoveryOperationalStatus> {
  const serverEnabled = isPaymentRecoveryServerEnabled();
  if (!serverEnabled && !options?.inspectWhenServerDisabled) {
    return {
      serverEnabled: false,
      tenantEnabled: false,
      templatesReady: false,
      effective: false,
    };
  }

  const settings = await storePrisma.setting.findMany({
    where: {
      key: {
        in: [
          "payment_recovery_enabled",
          "whatsapp_main_provider",
          "whatsapp_kapso_delivery_enabled",
          STORE_TEMPLATE_KEY,
          RAFFLE_TEMPLATE_KEY,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const values = new Map(
    settings.map((setting) => [setting.key, setting.value || ""]),
  );
  const storeTemplate = values.get(STORE_TEMPLATE_KEY)?.trim() || "";
  const raffleTemplate = values.get(RAFFLE_TEMPLATE_KEY)?.trim() || "";
  const provider = (
    values.get("whatsapp_main_provider") || "EVOLUTION"
  ).toUpperCase();
  const kapsoPreferred =
    isKapsoDeliveryEnabled() &&
    isKapsoTenantDeliveryEnabled(
      values.get("whatsapp_kapso_delivery_enabled"),
    ) &&
    resolveWhatsappProviderPriority({ type: "PAYMENT_RECOVERY" })[0] ===
      "KAPSO";

  let templatesReady = Boolean(storeTemplate && raffleTemplate);
  if (templatesReady && provider === "KAPSO" && kapsoPreferred) {
    const mappings = await storePrisma.whatsappCloudTemplate.findMany({
      where: {
        ownerKey: "principal",
        type: "PAYMENT_RECOVERY",
        scope: { in: ["STORE", "RAFFLES"] },
      },
      select: {
        scope: true,
        status: true,
        contentHash: true,
      },
    });
    const expectedHashes = {
      STORE: getCloudTemplateContentHash(storeTemplate),
      RAFFLES: getCloudTemplateContentHash(raffleTemplate),
    };
    templatesReady = (["STORE", "RAFFLES"] as const).every((scope) =>
      mappings.some(
        (mapping) =>
          mapping.scope === scope &&
          mapping.status === "APPROVED" &&
          mapping.contentHash === expectedHashes[scope],
      ),
    );
  }

  const tenantEnabled = isPaymentRecoveryTenantEnabled(
    values.get("payment_recovery_enabled"),
  );

  return {
    serverEnabled,
    tenantEnabled,
    templatesReady,
    effective: isPaymentRecoveryEffective({
      serverEnabled,
      tenantEnabled,
      templatesReady,
    }),
  };
}
