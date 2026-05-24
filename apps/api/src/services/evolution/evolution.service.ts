import { evolutionClient } from "./evolution.client";
import type { EvolutionInstance } from "./evolution.types";
import { storePrisma } from "@nexus/db/store";

/**
 * Normalizes phone numbers to a format Evolution API expects.
 * Especially handles Mexican numbers (10 digits -> 521 + number)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-numeric characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle Mexican numbers (Common case)
  if (cleaned.length === 10) {
    return `521${cleaned}`;
  }

  // If it starts with 52 and has 12 digits, it's missing the '1'
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    return `521${cleaned.substring(2)}`;
  }

  return cleaned;
}

export async function sendAndLog(params: {
  instance: EvolutionInstance;
  recipientPhone: string;
  message: string;
  templateName: string;
  orderId?: string;
  ticketSaleId?: number;
}): Promise<void> {
  try {
    const formattedPhone = formatPhoneNumber(params.recipientPhone);
    
    await evolutionClient.sendText(params.instance, {
      number: formattedPhone,
      text: params.message,
    });
    await storePrisma.whatsappMessageLog.create({
      data: {
        orderId: params.orderId ?? null,
        ticketSaleId: params.ticketSaleId ?? null,
        recipientPhone: params.recipientPhone,
        instanceName: params.instance.instanceName,
        templateUsed: params.templateName,
        status: "sent",
      },
    });
  } catch (err: any) {
    await storePrisma.whatsappMessageLog.create({
      data: {
        orderId: params.orderId ?? null,
        ticketSaleId: params.ticketSaleId ?? null,
        recipientPhone: params.recipientPhone,
        instanceName: params.instance.instanceName,
        templateUsed: params.templateName,
        status: "failed",
        errorMessage: err?.message ?? "Unknown error",
      },
    }).catch(() => {}); // never throw
    console.error("[WhatsApp] sendAndLog failed:", err?.message);
  }
}
