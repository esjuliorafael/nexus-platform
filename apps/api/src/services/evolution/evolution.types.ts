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
  pairingCode: string | null;
  code: string;
  base64: string;
}

export interface EvolutionConnectionState {
  instance: { instanceName: string; state: "open" | "connecting" | "close" };
}
