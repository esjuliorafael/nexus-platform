import { FastifyInstance } from "fastify";
import { storePrisma } from "@nexus/db/store";
import { evolutionClient } from "../../../services/evolution/evolution.client";

export async function evolutionProxyRoutes(server: FastifyInstance) {
  // Helper to get global EA config
  async function getGlobalEAConfig() {
    const settings = await storePrisma.setting.findMany({
      where: {
        key: {
          in: ["whatsapp_evolution_url", "whatsapp_evolution_key"]
        }
      }
    });
    return {
      baseUrl: settings.find(s => s.key === "whatsapp_evolution_url")?.value || "",
      apiKey: settings.find(s => s.key === "whatsapp_evolution_key")?.value || ""
    };
  }

  // GET /admin/whatsapp/status/:instanceName
  server.get("/status/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getGlobalEAConfig();
    
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
    const config = await getGlobalEAConfig();
    
    if (!config.baseUrl || !config.apiKey) {
      return reply.status(400).send({ error: "Evolution API not configured" });
    }

    try {
      const qr = await evolutionClient.getQR({ ...config, instanceName });
      return qr;
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // POST /admin/whatsapp/disconnect/:instanceName
  server.post("/disconnect/:instanceName", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { instanceName } = request.params as { instanceName: string };
    const config = await getGlobalEAConfig();
    
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
}
