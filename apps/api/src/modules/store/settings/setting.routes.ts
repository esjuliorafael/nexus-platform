import { FastifyInstance } from "fastify";
import { settingService } from "./setting.service";
import { updateSettingSchema, bulkUpdateSettingsSchema } from "./setting.schema";

export async function settingRoutes(server: FastifyInstance) {
  server.get("/", { preHandler: [server.authenticate] }, async (request) => {
    const canReadSecrets = (request.user as any)?.permissions?.includes("settings.manage");
    return canReadSecrets
      ? settingService.getAllGrouped()
      : settingService.getPublicGrouped();
  });

  server.get("/:key", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const setting = await settingService.getByKey(key);
    if (!setting) return reply.status(404).send({ message: "Setting not found" });
    const canReadSecrets = (request.user as any)?.permissions?.includes("settings.manage");
    if (!canReadSecrets && /(secret|token|api_key|access_key|private_key|client_id|evolution_key|password|kapso_customer)/i.test(key)) {
      return { ...setting, value: null };
    }
    return setting;
  });

  server.put("/:key", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const validated = updateSettingSchema.parse(request.body);
    return settingService.upsert(key, validated);
  });

  server.put("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    const validated = bulkUpdateSettingsSchema.parse(request.body);
    return settingService.bulkUpsert(validated.settings);
  });
}

export async function publicSettingRoutes(server: FastifyInstance) {
  server.get("/", async () => settingService.getPublicGrouped());
}
