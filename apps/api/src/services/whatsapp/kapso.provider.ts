import { toWhatsAppCloudPhoneNumber } from "../../utils/customer-phone";
import { kapsoClient } from "../kapso/kapso.client";
import type {
  WhatsappProviderAdapter,
  WhatsappTransport,
} from "./whatsapp-provider.types";

type KapsoTransport = Extract<WhatsappTransport, { provider: "KAPSO" }>;

export const kapsoWhatsappProvider: WhatsappProviderAdapter<KapsoTransport> = {
  provider: "KAPSO",

  getIdentity(transport) {
    return `kapso:${transport.config.phoneNumberId}`;
  },

  async send(transport, recipientPhone, message, callbackData) {
    const normalizedPhone = toWhatsAppCloudPhoneNumber(recipientPhone);
    const result = message.cloudTemplate
      ? await kapsoClient.sendTemplate(
          transport.config,
          normalizedPhone,
          message.cloudTemplate,
          callbackData,
        )
      : await kapsoClient.sendText(
          transport.config,
          normalizedPhone,
          message.text,
          callbackData,
        );

    return {
      messageId: result.messages?.[0]?.id ?? null,
      providerStatus: "accepted",
      responsePayload: result,
    };
  },
};
