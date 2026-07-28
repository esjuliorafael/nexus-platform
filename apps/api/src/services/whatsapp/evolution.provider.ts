import { toEvolutionPhoneNumber } from "../../utils/customer-phone";
import { evolutionClient } from "../evolution/evolution.client";
import type {
  WhatsappProviderAdapter,
  WhatsappTransport,
} from "./whatsapp-provider.types";

type EvolutionTransport = Extract<
  WhatsappTransport,
  { provider: "EVOLUTION" }
>;

export const evolutionWhatsappProvider: WhatsappProviderAdapter<EvolutionTransport> =
  {
    provider: "EVOLUTION",

    getIdentity(transport) {
      return transport.instance.instanceName;
    },

    async send(transport, recipientPhone, message) {
      const result = await evolutionClient.sendText(transport.instance, {
        number: toEvolutionPhoneNumber(recipientPhone),
        text: message.text,
      });

      return {
        messageId: result.key?.id ?? null,
        providerStatus: result.status ?? null,
        responsePayload: result,
      };
    },
  };
