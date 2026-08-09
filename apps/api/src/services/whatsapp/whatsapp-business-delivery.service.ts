import { storePrisma } from "@nexus/db/store";
import type { ChannelConfig } from "../evolution/channel.resolver";
import type { EvolutionInstance } from "../evolution/evolution.types";
import {
  isRecoverableWhatsappConnectionError,
  sendWhatsappWithFailover,
} from "../evolution/whatsapp-delivery.service";
import {
  getKapsoConfigForChannel,
  isKapsoDeliveryEnabled,
} from "../kapso/kapso.config";
import {
  getApprovedCloudTemplate,
  getActiveCloudTemplateVariant,
  getCanonicalCloudTemplateSettingKey,
  resolveCloudTemplateOwner,
  type CloudTemplateScope,
  type CloudTemplateType,
} from "./whatsapp-cloud-template.service";
import {
  getWhatsappDeliveryPolicy,
  resolveWhatsappProviderPriority,
} from "./whatsapp-delivery-policy";
import type { WhatsappProviderKind } from "./whatsapp-provider.types";
import { sendWhatsappAndLog } from "./whatsapp-send.service";
import { whatsappCustomerServiceWindowService } from "./whatsapp-customer-service-window.service";
import {
  getMetaRateMxn,
  getMetaRecipientMarket,
  META_RATE_CARD_VERSION,
} from "./whatsapp-meta-pricing.service";

export type PrincipalWhatsappConfig = {
  provider: "EVOLUTION" | "KAPSO";
  evolution: EvolutionInstance | null;
  kapsoPhoneNumberId: string;
  kapsoBusinessAccountId: string;
  deliveryStrategy: import("./whatsapp-delivery-policy").WhatsappDeliveryStrategy;
};

export type SendBusinessWhatsappParams = {
  preferredChannel?: ChannelConfig | null;
  principal: PrincipalWhatsappConfig;
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  sourceContent: string;
  legacySourceContent?: string;
  renderedText: string;
  principalSourceContent?: string;
  principalLegacySourceContent?: string;
  principalRenderedText?: string;
  values: Record<string, string>;
  mediaHeaderUrl?: string;
  recipientPhone: string;
  templateName: string;
  orderId?: string;
  ticketSaleId?: number;
  jobId?: string;
  attempt?: number;
  forceProvider?: WhatsappProviderKind;
  kapsoEnabled?: boolean;
};

const renderBusinessTemplate = (
  content: string,
  values: Record<string, string>,
) => content.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_, key) => values[key] ?? "");

function isSafeKapsoFallbackError(error: any) {
  const statusCode = Number(error?.statusCode || 0);
  return (
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 409 &&
    statusCode !== 429
  );
}

async function resolveActiveTemplateContent(
  delivery: SendBusinessWhatsappParams,
  provider: "EVOLUTION" | "CLOUD",
) {
  const variant = await getActiveCloudTemplateVariant({
    scope: delivery.scope,
    type: delivery.type,
    provider,
  });
  if (variant !== "SIMPLIFIED") {
    return {
      variant: "LEGACY" as const,
      content: delivery.legacySourceContent || delivery.sourceContent,
      renderedText: delivery.renderedText,
    };
  }

  const baseKey = getCanonicalCloudTemplateSettingKey(
    delivery.scope,
    delivery.type,
  );
  if (!baseKey) {
    return {
      variant: "LEGACY" as const,
      content: delivery.legacySourceContent || delivery.sourceContent,
      renderedText: delivery.renderedText,
    };
  }
  const simplified = await storePrisma.setting.findUnique({
    where: { key: `${baseKey}_simplified` },
    select: { value: true },
  });
  if (!simplified?.value?.trim()) {
    return {
      variant: "LEGACY" as const,
      content: delivery.legacySourceContent || delivery.sourceContent,
      renderedText: delivery.renderedText,
    };
  }
  return {
    variant: "SIMPLIFIED" as const,
    content: simplified.value,
    renderedText: renderBusinessTemplate(simplified.value, delivery.values),
  };
}

function getPolicyRouting(params: SendBusinessWhatsappParams) {
  const policy = getWhatsappDeliveryPolicy(params.type);
  return {
    policyClass: policy.classification,
    providerPriority: resolveWhatsappProviderPriority({
      type: params.type,
      forceProvider: params.forceProvider,
      kapsoEnabled: params.kapsoEnabled,
      deliveryStrategy:
        params.preferredChannel?.deliveryStrategy ||
        params.principal.deliveryStrategy,
    }),
  };
}

async function sendKapso(params: {
  owner:
    | { kind: "principal" }
    | { kind: "channel"; channelId: number; purpose: string };
  phoneNumberId: string;
  businessAccountId: string;
  delivery: SendBusinessWhatsappParams;
  route: "DIRECT" | "PRINCIPAL_FALLBACK";
  fallbackReason?: string;
}) {
  if (!isKapsoDeliveryEnabled() || params.delivery.kapsoEnabled === false) {
    return false;
  }
  const config = getKapsoConfigForChannel({
    phoneNumberId: params.phoneNumberId,
    businessAccountId: params.businessAccountId,
  });
  if (!config) return false;

  const ownerConfig = {
    owner: params.owner,
    config,
    scope: params.delivery.scope,
    type: params.delivery.type,
    mediaHeaderUrl: params.delivery.mediaHeaderUrl,
  } as const;
  const activeContent = await resolveActiveTemplateContent(params.delivery, "CLOUD");
  let approvedTemplate = await getApprovedCloudTemplate({
    ...ownerConfig,
    values: params.delivery.values,
    sourceContent: activeContent.content,
    variant: activeContent.variant,
  });
  let renderedText = activeContent.renderedText;
  if (!approvedTemplate && activeContent.variant === "SIMPLIFIED") {
    const legacyContent =
      params.delivery.legacySourceContent || params.delivery.sourceContent;
    approvedTemplate = await getApprovedCloudTemplate({
      ...ownerConfig,
      values: params.delivery.values,
      sourceContent: legacyContent,
      variant: "LEGACY",
    });
    renderedText = params.delivery.renderedText;
  }
  if (!approvedTemplate) return false;
  const isMarketing = approvedTemplate.category === "MARKETING";
  const market = getMetaRecipientMarket(params.delivery.recipientPhone);
  const rateMxn = getMetaRateMxn(market, approvedTemplate.category);
  const hasCustomerServiceWindow =
    !isMarketing &&
    (await whatsappCustomerServiceWindowService.hasActiveKapsoWindow({
      recipientPhone: params.delivery.recipientPhone,
      phoneNumberId: params.phoneNumberId,
    }));

  await sendWhatsappAndLog({
    transport: { provider: "KAPSO", config },
    recipientPhone: params.delivery.recipientPhone,
    message: {
      text: renderedText,
      cloudTemplate: approvedTemplate.message,
    },
    templateName: params.delivery.templateName,
    orderId: params.delivery.orderId,
    ticketSaleId: params.delivery.ticketSaleId,
    jobId: params.delivery.jobId,
    attempt: params.delivery.attempt,
    routing: {
      route: params.route,
      preferredInstanceName: params.delivery.preferredChannel?.name,
      fallbackReason: params.fallbackReason,
      ...getPolicyRouting(params.delivery),
      fallbackFromProvider:
        resolveWhatsappProviderPriority({
          type: params.delivery.type,
          forceProvider: params.delivery.forceProvider,
          kapsoEnabled: params.delivery.kapsoEnabled,
          deliveryStrategy:
            params.delivery.preferredChannel?.deliveryStrategy ||
            params.delivery.principal.deliveryStrategy,
        })[0] === "EVOLUTION"
          ? "EVOLUTION"
          : undefined,
      metaBilling: {
        category: approvedTemplate.category,
        market,
        rateMxn,
        estimatedChargeMxn: hasCustomerServiceWindow ? 0 : rateMxn,
        rateCardVersion: META_RATE_CARD_VERSION,
        status: hasCustomerServiceWindow
          ? "EXEMPT_CUSTOMER_SERVICE_WINDOW"
          : rateMxn === null
            ? "REFERENCE_RATE_UNAVAILABLE"
            : "ESTIMATED_BILLABLE",
      },
    },
  });
  return true;
}

async function logMissingDeliveryConfiguration(
  params: SendBusinessWhatsappParams,
  reason: string,
) {
  await storePrisma.whatsappMessageLog.create({
    data: {
      attempt: params.attempt || 1,
      orderId: params.orderId || null,
      ticketSaleId: params.ticketSaleId || null,
      recipientPhone: params.recipientPhone,
      instanceName: "missing",
      jobId: params.jobId || null,
      templateUsed: params.templateName,
      status: "failed",
      errorMessage: reason,
      responsePayload: {
        provider: null,
        nexusRouting: {
          route: "PRINCIPAL_FALLBACK",
          preferredInstanceName: params.preferredChannel?.name || null,
          fallbackReason: reason,
          ...getPolicyRouting(params),
        },
      },
    },
  });
}

export async function sendBusinessWhatsappNotification(
  params: SendBusinessWhatsappParams,
) {
  const deliveryParams = params;
  const preferred = deliveryParams.preferredChannel || null;
  const principalEvolution = deliveryParams.principal.evolution;
  const providerPriority = resolveWhatsappProviderPriority({
    type: deliveryParams.type,
    forceProvider: deliveryParams.forceProvider,
    kapsoEnabled: deliveryParams.kapsoEnabled,
    deliveryStrategy: preferred?.deliveryStrategy || deliveryParams.principal.deliveryStrategy,
  });
  let fallbackReason = "";
  const principalDelivery: SendBusinessWhatsappParams = {
    ...deliveryParams,
    sourceContent:
      deliveryParams.principalSourceContent || deliveryParams.sourceContent,
    legacySourceContent:
      deliveryParams.principalLegacySourceContent ||
      deliveryParams.legacySourceContent ||
      deliveryParams.sourceContent,
    renderedText:
      deliveryParams.principalRenderedText || deliveryParams.renderedText,
  };

  const appendFallbackReason = (reason: string) => {
    if (!reason) return;
    fallbackReason = fallbackReason ? `${fallbackReason} ${reason}` : reason;
  };

  const fallbackFromProvider = (provider: WhatsappProviderKind) =>
    providerPriority[0] !== provider ? providerPriority[0] : undefined;

  const tryKapso = async () => {
    if (preferred) {
      if (preferred.kapsoPhoneNumberId && preferred.kapsoBusinessAccountId) {
        try {
          const owner = resolveCloudTemplateOwner({
            channelOwner: {
              kind: "channel",
              channelId: preferred.id,
              purpose: preferred.purpose,
            },
            channelBusinessAccountId: preferred.kapsoBusinessAccountId,
            principalBusinessAccountId:
              deliveryParams.principal.kapsoBusinessAccountId,
          });
          const sent = await sendKapso({
            owner,
            phoneNumberId: preferred.kapsoPhoneNumberId,
            businessAccountId: preferred.kapsoBusinessAccountId,
            delivery: deliveryParams,
            route: "DIRECT",
            fallbackReason,
          });
          if (sent) return true;
          appendFallbackReason(
            "La plantilla Cloud del canal especializado no está aprobada o no corresponde al contenido actual.",
          );
        } catch (error) {
          if (!isSafeKapsoFallbackError(error)) throw error;
          appendFallbackReason(String((error as any)?.message || error));
        }
      } else {
        appendFallbackReason(
          "El canal especializado no tiene una configuración Cloud API completa.",
        );
      }
    }

    if (
      deliveryParams.principal.kapsoPhoneNumberId &&
      deliveryParams.principal.kapsoBusinessAccountId
    ) {
      try {
        const sent = await sendKapso({
          owner: { kind: "principal" },
          phoneNumberId: deliveryParams.principal.kapsoPhoneNumberId,
          businessAccountId: deliveryParams.principal.kapsoBusinessAccountId,
          delivery: principalDelivery,
          route: preferred ? "PRINCIPAL_FALLBACK" : "DIRECT",
          fallbackReason,
        });
        if (sent) return true;
        appendFallbackReason(
          "La plantilla Cloud principal no está aprobada o no corresponde al contenido actual.",
        );
      } catch (error) {
        if (!isSafeKapsoFallbackError(error)) throw error;
        appendFallbackReason(String((error as any)?.message || error));
      }
    } else {
      appendFallbackReason(
        "El Canal Principal no tiene una configuración Cloud API completa.",
      );
    }

    return false;
  };

  const tryEvolution = async () => {
    const policyRouting = {
      ...getPolicyRouting(deliveryParams),
      fallbackFromProvider: fallbackFromProvider("EVOLUTION"),
    };

    if (
      preferred?.deliveryStrategy !== "KAPSO_PREFERRED" &&
      preferred?.instanceName &&
      preferred.evolutionUrl &&
      preferred.evolutionKey
    ) {
      try {
        const activeContent = await resolveActiveTemplateContent(deliveryParams, "EVOLUTION");
        await sendWhatsappWithFailover({
          instance: {
            instanceName: preferred.instanceName,
            baseUrl: preferred.evolutionUrl,
            apiKey: preferred.evolutionKey,
          },
          principalFallback: principalEvolution,
          recipientPhone: deliveryParams.recipientPhone,
          message: activeContent.renderedText,
          templateName: deliveryParams.templateName,
          orderId: deliveryParams.orderId,
          ticketSaleId: deliveryParams.ticketSaleId,
          jobId: deliveryParams.jobId,
          attempt: deliveryParams.attempt,
          directRouting: {
            route: "DIRECT",
            preferredInstanceName: preferred.name,
            fallbackReason: fallbackReason || undefined,
            ...policyRouting,
          },
        });
        return true;
      } catch (error) {
        if (!isRecoverableWhatsappConnectionError(error)) throw error;
        appendFallbackReason(String((error as any)?.message || error));
      }
    } else if (
      preferred &&
      preferred.deliveryStrategy !== "KAPSO_PREFERRED"
    ) {
      appendFallbackReason(
        "El canal especializado no tiene una instancia Evolution completa.",
      );
    } else if (preferred?.deliveryStrategy === "KAPSO_PREFERRED") {
      appendFallbackReason(
        "La estrategia Kapso preferente omite Evolution en el canal especializado.",
      );
    }

    if (principalEvolution) {
      try {
        const activeContent = await resolveActiveTemplateContent(principalDelivery, "EVOLUTION");
        await sendWhatsappWithFailover({
          instance: principalEvolution,
          recipientPhone: deliveryParams.recipientPhone,
          message: activeContent.renderedText,
          templateName: deliveryParams.templateName,
          orderId: deliveryParams.orderId,
          ticketSaleId: deliveryParams.ticketSaleId,
          jobId: deliveryParams.jobId,
          attempt: deliveryParams.attempt,
          directRouting: {
            route: preferred ? "PRINCIPAL_FALLBACK" : "DIRECT",
            preferredInstanceName: preferred?.name,
            fallbackReason:
              fallbackReason ||
              "El proveedor preferente no estaba listo; se usó Evolution Principal.",
            ...policyRouting,
          },
        });
        return true;
      } catch (error) {
        if (!isRecoverableWhatsappConnectionError(error)) throw error;
        appendFallbackReason(String((error as any)?.message || error));
      }
    }

    return false;
  };

  for (const provider of providerPriority) {
    const sent = provider === "KAPSO" ? await tryKapso() : await tryEvolution();
    if (sent) return true;
  }

  await logMissingDeliveryConfiguration(
    deliveryParams,
    fallbackReason ||
      "No existe un proveedor de WhatsApp preparado para esta notificación.",
  );
  return false;
}
