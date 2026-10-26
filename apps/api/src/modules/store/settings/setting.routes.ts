import { FastifyInstance } from "fastify";
import { settingService } from "./setting.service";
import { updateSettingSchema, bulkUpdateSettingsSchema } from "./setting.schema";
import { canReadSettingKey, redactSettingValueForReader } from "../../../utils/user-permissions";

function filterSettingsForRequest(request: any, grouped: Record<string, Record<string, string | null>>) {
  return Object.fromEntries(
    Object.entries(grouped).flatMap(([group, values]) => {
      const visible = Object.fromEntries(
        Object.entries(values).filter(([key]) => canReadSettingKey(request, key)),
      );
      return Object.keys(visible).length ? [[group, visible]] : [];
    }),
  );
}

export async function settingRoutes(server: FastifyInstance) {
  server.get("/", { preHandler: [server.authenticate] }, async (request) => {
    const grouped = await settingService.getAllGrouped();
    const filtered = filterSettingsForRequest(request, grouped);
    for (const values of Object.values(filtered)) {
      for (const key of Object.keys(values)) {
        if (redactSettingValueForReader(request, key)) values[key] = null;
      }
    }
    return filtered;
  });

  server.get("/:key", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const setting = await settingService.getByKey(key);
    if (!setting) return reply.status(404).send({ message: "Setting not found" });
    if (!canReadSettingKey(request, key)) {
      return reply.status(403).send({ message: "No tienes permiso para consultar esta configuración." });
    }
    if (redactSettingValueForReader(request, key)) {
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
