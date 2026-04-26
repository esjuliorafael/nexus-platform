import { FastifyInstance } from "fastify";
import { settingService } from "./setting.service";
import { updateSettingSchema, bulkUpdateSettingsSchema } from "./setting.schema";

export async function settingRoutes(server: FastifyInstance) {
  server.get("/", async () => {
    return settingService.getAllGrouped();
  });

  server.get("/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const setting = await settingService.getByKey(key);
    if (!setting) return reply.status(404).send({ message: "Setting not found" });
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
