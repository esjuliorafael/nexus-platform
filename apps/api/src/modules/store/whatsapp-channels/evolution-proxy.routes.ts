import { FastifyInstance } from "fastify";
import { z } from "zod";
import { evolutionClient } from "../../../services/evolution/evolution.client";
import { getEvolutionConfigFromSettings } from "../../../services/evolution/evolution.config";

const connectSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("qr") }),
  z.object({
    method: z.literal("pairing_code"),
    phone: z.string().trim().min(10, "El numero de WhatsApp es obligatorio"),
  }),
]);

function normalizePairingPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (/^521\d{10}$/.test(digits)) return `52${digits.slice(3)}`;
  return digits;
}

function isMissingInstanceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("404") || message.includes("does not exist");
}

export async function evolutionProxyRoutes(server: FastifyInstance) {
  function getWebhookUrl(request: any) {
    const configuredBaseUrl =
      process.env.API_PUBLIC_URL ||
      process.env.PUBLIC_API_URL ||
      process.env.WEBHOOK_BASE_URL ||
      process.env.MP_TENANT_PUBLIC_API_URL ||
      "";

    if (configuredBaseUrl) {
      return `${configuredBaseUrl.replace(/\/$/, "")}/api/v1/webhooks/evolution`;
    }

    const protocol = request.headers["x-forwarded-proto"] || request.protocol || "http";
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    return `${protocol}://${host}/api/v1/webhooks/evolution`;
  }

  async function configureInstanceWebhook(request: any, instanceName: string) {
    const config = await getEvolutionConfigFromSettings();
    const webhookToken =
      process.env.EVOLUTION_WEBHOOK_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_TOKEN ||
      "";

    await evolutionClient.setWebhook(
      { ...config, instanceName },
      {
        enabled: true,
        url: getWebhookUrl(request),
        webhookByEvents: false,
        events: ["SEND_MESSAGE_UPDATE", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
        headers: webhookToken
          ? { "x-nexus-webhook-token": webhookToken }
          : undefined,
      },
    );
  }

  // GET /admin/whatsapp/status/:instanceName
  server.get("/status/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getEvolutionConfigFromSettings();
    
    if (!config.baseUrl || !config.apiKey) {
      return reply.status(400).send({ error: "Evolution API not configured in Platform Settings" });
    }

    try {
      // 1. Try to get state
      const state = await evolutionClient.getConnectionState({ ...config, instanceName });
      return { ...state, exists: true };
    } catch (error: any) {
      // Status checks must not create instances or start a connection flow.
      if (isMissingInstanceError(error)) {
        return { instance: { instanceName, state: "close" }, exists: false };
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /admin/whatsapp/connect/:instanceName
  server.post("/connect/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getEvolutionConfigFromSettings();
    let body: z.infer<typeof connectSchema>;

    try {
      body = connectSchema.parse(request.body ?? { method: "qr" });
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
    
    if (!config.baseUrl || !config.apiKey) {
      return reply.status(400).send({ error: "Evolution API not configured" });
    }

    const number = body.method === "pairing_code"
      ? normalizePairingPhone(body.phone)
      : undefined;

    try {
      const connection = await evolutionClient.getConnectionCode({ ...config, instanceName }, number);
      await configureInstanceWebhook(request, instanceName);
      if (body.method === "pairing_code" && !connection.pairingCode) {
        return reply.status(409).send({
          error: "La instancia ya esta generando un QR. Espera a que expire antes de solicitar un codigo.",
        });
      }
      if (body.method === "qr" && !connection.base64) {
        return reply.status(502).send({ error: "Evolution API no genero el codigo QR" });
      }
      return { ...connection, method: body.method };
    } catch (error: any) {
      if (isMissingInstanceError(error)) {
        try {
          const created = await evolutionClient.createInstance({ ...config, instanceName }, number);
          const connection = created.qrcode?.base64 || created.qrcode?.pairingCode
            ? created.qrcode
            : await evolutionClient.getConnectionCode({ ...config, instanceName }, number);

          await configureInstanceWebhook(request, instanceName);

          if (body.method === "pairing_code" && !connection?.pairingCode) {
            return reply.status(502).send({ error: "Evolution API no genero el codigo de emparejamiento" });
          }
          if (body.method === "qr" && !connection?.base64) {
            return reply.status(502).send({ error: "Evolution API no genero el codigo QR" });
          }

          return { ...connection, method: body.method };
        } catch (createError: any) {
          return reply.status(500).send({ error: `Failed to create instance: ${createError.message}` });
        }
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /admin/whatsapp/disconnect/:instanceName
  server.post("/disconnect/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getEvolutionConfigFromSettings();
    
    if (!config.baseUrl || !config.apiKey) {
      return reply.status(400).send({ error: "Evolution API not configured" });
    }

    try {
      await evolutionClient.logout({ ...config, instanceName });
      return { success: true };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  server.post("/webhook/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getEvolutionConfigFromSettings();
    const webhookToken =
      process.env.EVOLUTION_WEBHOOK_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_TOKEN ||
      "";

    if (!config.baseUrl || !config.apiKey) {
      return reply.status(400).send({ error: "Evolution API not configured" });
    }

    if (!webhookToken && process.env.NODE_ENV === "production") {
      return reply.status(400).send({
        error: "EVOLUTION_WEBHOOK_TOKEN is required in production",
      });
    }

    try {
      const webhookUrl = getWebhookUrl(request);
      const result = await evolutionClient.setWebhook(
        { ...config, instanceName },
        {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          events: [
            "SEND_MESSAGE_UPDATE",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
          ],
          headers: webhookToken
            ? { "x-nexus-webhook-token": webhookToken }
            : undefined,
        },
      );

      return { success: true, webhookUrl, result };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
