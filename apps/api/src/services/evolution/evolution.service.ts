import type { EvolutionInstance } from "./evolution.types";
import { sendWhatsappAndLog } from "../whatsapp/whatsapp-send.service";

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

export async function sendAndLog(params: SendAndLogParams): Promise<void> {
  return sendWhatsappAndLog({
    transport: {
      provider: "EVOLUTION",
      instance: params.instance,
    },
    recipientPhone: params.recipientPhone,
    message: { text: params.message },
    templateName: params.templateName,
    orderId: params.orderId,
    ticketSaleId: params.ticketSaleId,
    jobId: params.jobId,
    attempt: params.attempt,
    routing: params.routing,
  });
}
