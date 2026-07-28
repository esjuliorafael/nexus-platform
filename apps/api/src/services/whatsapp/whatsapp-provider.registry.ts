import { evolutionWhatsappProvider } from "./evolution.provider";
import { kapsoWhatsappProvider } from "./kapso.provider";
import type {
  WhatsappProviderAdapter,
  WhatsappTransport,
} from "./whatsapp-provider.types";

export function getWhatsappProvider<TTransport extends WhatsappTransport>(
  transport: TTransport,
): WhatsappProviderAdapter<TTransport> {
  if (transport.provider === "KAPSO") {
    return kapsoWhatsappProvider as WhatsappProviderAdapter<TTransport>;
  }
  return evolutionWhatsappProvider as WhatsappProviderAdapter<TTransport>;
}
