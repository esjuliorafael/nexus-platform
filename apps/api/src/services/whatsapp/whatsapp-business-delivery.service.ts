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

export type PrincipalWhatsappConfig = {
  provider: "EVOLUTION" | "KAPSO";
  evolution: EvolutionInstance | null;
  kapsoPhoneNumberId: string;
  kapsoBusinessAccountId: string;
};

export type SendBusinessWhatsappParams = {
  preferredChannel?: ChannelConfig | null;
  principal: PrincipalWhatsappConfig;
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  sourceContent: string;
  renderedText: string;
  principalSourceContent?: string;
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

function isSafeKapsoFallbackError(error: any) {
  const statusCode = Number(error?.statusCode || 0);
  return (
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 409 &&
    statusCode !== 429
  );
}

function getPolicyRouting(params: SendBusinessWhatsappParams) {
  const policy = getWhatsappDeliveryPolicy(params.type);
  return {
    policyClass: policy.classification,
    providerPriority: resolveWhatsappProviderPriority({
      type: params.type,
      forceProvider: params.forceProvider,
      kapsoEnabled: params.kapsoEnabled,
      deliveryStrategy: params.preferredChannel?.deliveryStrategy,
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

  const cloudTemplate = await getApprovedCloudTemplate({
    owner: params.owner,
    config,
    scope: params.delivery.scope,
    type: params.delivery.type,
    sourceContent: params.delivery.sourceContent,
    values: params.delivery.values,
    mediaHeaderUrl: params.delivery.mediaHeaderUrl,
  });
  if (!cloudTemplate) return false;

  await sendWhatsappAndLog({
    transport: { provider: "KAPSO", config },
    recipientPhone: params.delivery.recipientPhone,
    message: {
      text: params.delivery.renderedText,
      cloudTemplate,
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
            params.delivery.preferredChannel?.deliveryStrategy,
        })[0] === "EVOLUTION"
          ? "EVOLUTION"
          : undefined,
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
  const preferred = params.preferredChannel || null;
  const principalEvolution = params.principal.evolution;
  const providerPriority = resolveWhatsappProviderPriority({
    type: params.type,
    forceProvider: params.forceProvider,
    kapsoEnabled: params.kapsoEnabled,
    deliveryStrategy: preferred?.deliveryStrategy,
  });
  let fallbackReason = "";
  const principalDelivery: SendBusinessWhatsappParams = {
    ...params,
    sourceContent: params.principalSourceContent || params.sourceContent,
    renderedText: params.principalRenderedText || params.renderedText,
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
              params.principal.kapsoBusinessAccountId,
          });
          const sent = await sendKapso({
            owner,
            phoneNumberId: preferred.kapsoPhoneNumberId,
            businessAccountId: preferred.kapsoBusinessAccountId,
            delivery: params,
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
      params.principal.kapsoPhoneNumberId &&
      params.principal.kapsoBusinessAccountId
    ) {
      try {
        const sent = await sendKapso({
          owner: { kind: "principal" },
          phoneNumberId: params.principal.kapsoPhoneNumberId,
          businessAccountId: params.principal.kapsoBusinessAccountId,
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
      ...getPolicyRouting(params),
      fallbackFromProvider: fallbackFromProvider("EVOLUTION"),
    };

    if (
      preferred?.deliveryStrategy !== "KAPSO_PREFERRED" &&
      preferred?.instanceName &&
      preferred.evolutionUrl &&
      preferred.evolutionKey
    ) {
      try {
        await sendWhatsappWithFailover({
          instance: {
            instanceName: preferred.instanceName,
            baseUrl: preferred.evolutionUrl,
            apiKey: preferred.evolutionKey,
          },
          principalFallback: principalEvolution,
          recipientPhone: params.recipientPhone,
          message: params.renderedText,
          templateName: params.templateName,
          orderId: params.orderId,
          ticketSaleId: params.ticketSaleId,
          jobId: params.jobId,
          attempt: params.attempt,
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
        await sendWhatsappWithFailover({
          instance: principalEvolution,
          recipientPhone: params.recipientPhone,
          message: principalDelivery.renderedText,
          templateName: params.templateName,
          orderId: params.orderId,
          ticketSaleId: params.ticketSaleId,
          jobId: params.jobId,
          attempt: params.attempt,
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
    params,
    fallbackReason ||
      "No existe un proveedor de WhatsApp preparado para esta notificación.",
  );
  return false;
}
