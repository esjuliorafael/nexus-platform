import type { EvolutionInstance } from "../evolution/evolution.types";
import type {
  KapsoConfig,
  KapsoTemplateMessage,
} from "../kapso/kapso.types";

export type WhatsappProviderKind = "EVOLUTION" | "KAPSO";

export type WhatsappTransport =
  | {
      provider: "EVOLUTION";
      instance: EvolutionInstance;
    }
  | {
      provider: "KAPSO";
      config: KapsoConfig;
    };

export type WhatsappOutboundMessage = {
  text: string;
  cloudTemplate?: KapsoTemplateMessage;
};

export type WhatsappProviderSendResult = {
  messageId: string | null;
  providerStatus: string | null;
  responsePayload: unknown;
};

export interface WhatsappProviderAdapter<TTransport extends WhatsappTransport> {
  readonly provider: TTransport["provider"];
  getIdentity(transport: TTransport): string;
  send(
    transport: TTransport,
    recipientPhone: string,
    message: WhatsappOutboundMessage,
    callbackData?: string,
  ): Promise<WhatsappProviderSendResult>;
}
