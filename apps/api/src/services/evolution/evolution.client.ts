import type {
  EvolutionInstance,
  SendTextPayload,
  EvolutionSendResult,
  EvolutionQRResult,
  EvolutionConnectionState,
  EvolutionWebhookConfig,
  EvolutionCreateInstanceResult,
} from "./evolution.types";

async function evRequest<T>(
  instance: EvolutionInstance,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  // Normalize baseUrl by removing trailing slash if present
  const cleanBaseUrl = instance.baseUrl.endsWith('/') 
    ? instance.baseUrl.slice(0, -1) 
    : instance.baseUrl;

  const res = await fetch(`${cleanBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: instance.apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const evolutionClient = {
  sendText(instance: EvolutionInstance, payload: SendTextPayload) {
    return evRequest<EvolutionSendResult>(
      instance, "POST",
      `/message/sendText/${instance.instanceName}`,
      { number: payload.number, text: payload.text }
    );
  },
  getConnectionCode(instance: EvolutionInstance, number?: string) {
    const query = number ? `?number=${encodeURIComponent(number)}` : "";
    return evRequest<EvolutionQRResult>(
      instance, "GET",
      `/instance/connect/${instance.instanceName}${query}`
    );
  },
  getConnectionState(instance: EvolutionInstance) {
    return evRequest<EvolutionConnectionState>(
      instance, "GET",
      `/instance/connectionState/${instance.instanceName}`
    );
  },
  logout(instance: EvolutionInstance) {
    return evRequest<{ status: string }>(
      instance, "DELETE",
      `/instance/logout/${instance.instanceName}`
    );
  },
  createInstance(instance: EvolutionInstance, number?: string) {
    return evRequest<EvolutionCreateInstanceResult>(
      instance, "POST",
      "/instance/create",
      {
        instanceName: instance.instanceName,
        token: "",
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        ...(number ? { number } : {}),
      }
    );
  },
  setWebhook(instance: EvolutionInstance, payload: EvolutionWebhookConfig) {
    return evRequest<{ webhook: any }>(
      instance,
      "POST",
      `/webhook/set/${instance.instanceName}`,
      {
        webhook: {
          enabled: payload.enabled,
          url: payload.url,
          webhookByEvents: payload.webhookByEvents ?? false,
          webhookBase64: false,
          events: payload.events ?? [
            "SEND_MESSAGE_UPDATE",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
          ],
          headers: payload.headers,
        },
      },
    );
  },
};
