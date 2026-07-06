import { FastifyInstance } from "fastify";
import { evolutionClient } from "../../../services/evolution/evolution.client";
import { getEvolutionConfigFromSettings } from "../../../services/evolution/evolution.config";

export async function evolutionProxyRoutes(server: FastifyInstance) {
  function getWebhookUrl(request: any) {
    const configuredBaseUrl =
      process.env.API_PUBLIC_URL ||
      process.env.PUBLIC_API_URL ||
      process.env.WEBHOOK_BASE_URL ||
      "";

    if (configuredBaseUrl) {
      return `${configuredBaseUrl.replace(/\/$/, "")}/api/v1/webhooks/evolution`;
    }

    const protocol = request.headers["x-forwarded-proto"] || request.protocol || "http";
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    return `${protocol}://${host}/api/v1/webhooks/evolution`;
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
      return state;
    } catch (error: any) {
      // 2. If it fails with 404 (instance not found), try to create it
      if (error.message.includes("404")) {
        try {
          await evolutionClient.createInstance({ ...config, instanceName });
          return { instance: { instanceName, state: "close" } };
        } catch (createError: any) {
          return reply.status(500).send({ error: `Failed to create instance: ${createError.message}` });
        }
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /admin/whatsapp/connect/:instanceName
  server.post("/connect/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getEvolutionConfigFromSettings();
    
    if (!config.baseUrl || !config.apiKey) {
      return reply.status(400).send({ error: "Evolution API not configured" });
    }

    try {
      const qr = await evolutionClient.getQR({ ...config, instanceName });
      return qr;
    } catch (error: any) {
      if (error.message?.includes("404")) {
        try {
          await evolutionClient.createInstance({ ...config, instanceName });
          const qr = await evolutionClient.getQR({ ...config, instanceName });
          return qr;
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
          webhookByEvents: true,
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
