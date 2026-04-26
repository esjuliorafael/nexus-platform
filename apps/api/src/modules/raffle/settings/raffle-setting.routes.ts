import { FastifyInstance } from "fastify";
import { raffleSettingService } from "./raffle-setting.service";
import { bulkUpsertSettingsSchema, upsertSettingSchema } from "./raffle-setting.schema";

export async function raffleSettingRoutes(server: FastifyInstance) {
  const prisma = server.rafflePrisma;

  // GET / - return all raffle settings as key-value object grouped by group. Public.
  server.get("/", async () => {
    return raffleSettingService.getAllGrouped(prisma);
  });

  // PUT /:key - upsert a setting. Protected.
  server.put("/:key", { preHandler: [server.authenticate] }, async (request) => {
    const { key } = request.params as { key: string };
    const validated = upsertSettingSchema.parse(request.body);
    return raffleSettingService.upsert(prisma, key, validated);
  });

  // PUT / - bulk upsert. Protected.
  server.put("/", { preHandler: [server.authenticate] }, async (request) => {
    const { settings } = bulkUpsertSettingsSchema.parse(request.body);
    return raffleSettingService.bulkUpsert(prisma, settings);
  });
}
