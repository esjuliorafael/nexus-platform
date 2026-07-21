export interface EvolutionInstance {
  instanceName: string;
  baseUrl: string;
  apiKey: string;
}

export interface SendTextPayload {
  number: string;
  text: string;
}

export interface EvolutionSendResult {
  key: { id: string };
  status: string;
}

export interface EvolutionQRResult {
  pairingCode?: string | null;
  code?: string;
  base64?: string;
  count?: number;
}

export interface EvolutionCreateInstanceResult {
  instance: unknown;
  hash?: string;
  qrcode?: EvolutionQRResult;
}

export interface EvolutionConnectionState {
  instance: { instanceName: string; state: "open" | "connecting" | "close" };
}

export interface EvolutionWebhookConfig {
  enabled: boolean;
  url: string;
  webhookByEvents?: boolean;
  events?: string[];
  headers?: Record<string, string>;
}
