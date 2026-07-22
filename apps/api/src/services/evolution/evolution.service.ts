import { evolutionClient } from "./evolution.client";
import type { EvolutionInstance } from "./evolution.types";
import { storePrisma } from "@nexus/db/store";
import { toEvolutionPhoneNumber } from "../../utils/customer-phone";

/**
 * Normalizes phone numbers to a format Evolution API expects.
 * Especially handles Mexican numbers (10 digits -> 521 + number)
 */
const formatPhoneNumber = toEvolutionPhoneNumber;

export type SendAndLogParams = {
  instance: EvolutionInstance;
  recipientPhone: string;
  message: string;
  templateName: string;
  orderId?: string;
  ticketSaleId?: number;
  jobId?: string;
  attempt?: number;
  routing?: {
    route: "DIRECT" | "PRINCIPAL_FALLBACK";
    preferredInstanceName?: string;
    fallbackReason?: string;
  };
};

function buildResponsePayload(result: unknown, routing: SendAndLogParams["routing"]) {
  const providerPayload = result && typeof result === "object" ? result : {};
  return {
    ...providerPayload,
    nexusRouting: routing || { route: "DIRECT" },
  };
}

export async function sendAndLog(params: SendAndLogParams): Promise<void> {
  const attempt = params.attempt ?? 1;
  const formattedPhone = formatPhoneNumber(params.recipientPhone);

  try {
    const result = await evolutionClient.sendText(params.instance, {
      number: formattedPhone,
      text: params.message,
    });

    await storePrisma.whatsappMessageLog.create({
      data: {
        attempt,
        orderId: params.orderId ?? null,
        ticketSaleId: params.ticketSaleId ?? null,
        recipientPhone: params.recipientPhone,
        instanceName: params.instance.instanceName,
        jobId: params.jobId ?? null,
        messageId: result.key?.id ?? null,
        providerStatus: result.status ?? null,
        responsePayload: buildResponsePayload(result, params.routing) as any,
        templateUsed: params.templateName,
        status: "sent",
      },
    }).catch((logError) => {
      console.error("[WhatsApp] Message sent but log creation failed:", logError?.message);
    });
  } catch (err: any) {
    await storePrisma.whatsappMessageLog.create({
      data: {
        attempt,
        orderId: params.orderId ?? null,
        ticketSaleId: params.ticketSaleId ?? null,
        recipientPhone: params.recipientPhone,
        instanceName: params.instance.instanceName,
        jobId: params.jobId ?? null,
        templateUsed: params.templateName,
        status: "failed",
        errorMessage: err?.message ?? "Unknown error",
        responsePayload: buildResponsePayload(null, params.routing) as any,
      },
    }).catch(() => {}); // never throw
    console.error("[WhatsApp] sendAndLog failed:", err?.message);
    throw err;
  }
}
