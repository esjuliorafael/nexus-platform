import { z } from "zod";

export const upsertSettingSchema = z.object({
  value: z.string().nullable(),
  description: z.string().optional(),
  group: z.string().optional(),
});

export const bulkUpsertSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string(),
      value: z.string().nullable(),
    })
  ),
});
