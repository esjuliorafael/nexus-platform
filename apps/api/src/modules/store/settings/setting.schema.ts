import { z } from "zod";

export const updateSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  group: z.string().optional(),
});

export const bulkUpdateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      group: z.string().optional(),
    })
  ),
});
