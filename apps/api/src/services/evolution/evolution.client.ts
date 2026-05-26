import type {
  EvolutionInstance,
  SendTextPayload,
  EvolutionSendResult,
  EvolutionQRResult,
  EvolutionConnectionState,
} from "./evolution.types";

async function evRequest<T>(
  instance: EvolutionInstance,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${instance.baseUrl}${path}`, {
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
  getQR(instance: EvolutionInstance) {
    return evRequest<EvolutionQRResult>(
      instance, "GET",
      `/instance/connect/${instance.instanceName}`
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
  createInstance(instance: EvolutionInstance) {
    return evRequest<{ instance: any; hash: string }>(
      instance, "POST",
      "/instance/create",
      {
        instanceName: instance.instanceName,
        token: "",
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }
    );
  },
};
