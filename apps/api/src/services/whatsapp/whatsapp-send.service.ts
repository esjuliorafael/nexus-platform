import { storePrisma } from "@nexus/db/store";
import { getWhatsappProvider } from "./whatsapp-provider.registry";
import type {
  WhatsappOutboundMessage,
  WhatsappProviderKind,
  WhatsappTransport,
} from "./whatsapp-provider.types";
import type { WhatsappDeliveryClass } from "./whatsapp-delivery-policy";

export type SendWhatsappAndLogParams = {
  transport: WhatsappTransport;
  recipientPhone: string;
  message: WhatsappOutboundMessage;
  templateName: string;
  orderId?: string;
  ticketSaleId?: number;
  jobId?: string;
  attempt?: number;
  routing?: {
    route: "DIRECT" | "PRINCIPAL_FALLBACK";
    preferredInstanceName?: string;
    fallbackReason?: string;
    policyClass?: WhatsappDeliveryClass;
    providerPriority?: readonly WhatsappProviderKind[];
    fallbackFromProvider?: WhatsappProviderKind;
    metaBilling?: {
      category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
      market: "MX" | "US" | "GT" | "UNKNOWN";
      rateMxn: number | null;
      estimatedChargeMxn: number | null;
      rateCardVersion: string;
      status:
        | "ESTIMATED_BILLABLE"
        | "EXEMPT_CUSTOMER_SERVICE_WINDOW"
        | "REFERENCE_RATE_UNAVAILABLE";
    };
  };
};

function buildResponsePayload(
  provider: WhatsappTransport["provider"],
  result: unknown,
  routing: SendWhatsappAndLogParams["routing"],
) {
  return {
    provider,
    payload: result,
    nexusRouting: routing || { route: "DIRECT" },
  };
}

export function getInitialWhatsappLogStatus(
  providerStatus: string | null | undefined,
  messageId: string | null | undefined,
) {
  const normalized = String(providerStatus || "").toLowerCase();
  if (
    messageId &&
    ["accepted", "pending", "sent", "server_ack"].includes(normalized)
  ) {
    return "sent";
  }
  if (normalized === "failed") return "failed";
  return messageId ? "sent" : "pending";
}

export async function sendWhatsappAndLog(
  params: SendWhatsappAndLogParams,
): Promise<void> {
  const attempt = params.attempt ?? 1;
  const provider = getWhatsappProvider(params.transport);
  const identity = provider.getIdentity(params.transport);

  try {
    const result = await provider.send(
      params.transport,
      params.recipientPhone,
      params.message,
      params.jobId,
    );

    await storePrisma.whatsappMessageLog
      .create({
        data: {
          attempt,
          orderId: params.orderId ?? null,
          ticketSaleId: params.ticketSaleId ?? null,
          recipientPhone: params.recipientPhone,
          instanceName: identity,
          provider: params.transport.provider,
          jobId: params.jobId ?? null,
          messageId: result.messageId,
          providerStatus: result.providerStatus,
          responsePayload: buildResponsePayload(
            params.transport.provider,
            result.responsePayload,
            params.routing,
          ) as any,
          templateUsed: params.templateName,
          status: getInitialWhatsappLogStatus(
            result.providerStatus,
            result.messageId,
          ),
        },
      })
      .catch((logError) => {
        console.error(
          "[WhatsApp] Message sent but log creation failed:",
          logError?.message,
        );
      });
  } catch (error: any) {
    await storePrisma.whatsappMessageLog
      .create({
        data: {
          attempt,
          orderId: params.orderId ?? null,
          ticketSaleId: params.ticketSaleId ?? null,
          recipientPhone: params.recipientPhone,
          instanceName: identity,
          provider: params.transport.provider,
          jobId: params.jobId ?? null,
          templateUsed: params.templateName,
          status: "failed",
          errorMessage: error?.message ?? "Unknown error",
          responsePayload: buildResponsePayload(
            params.transport.provider,
            error?.responseBody ?? null,
            params.routing,
          ) as any,
        },
      })
      .catch(() => {});
    console.error("[WhatsApp] sendWhatsappAndLog failed:", error?.message);
    throw error;
  }
}
