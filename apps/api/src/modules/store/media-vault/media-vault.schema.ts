import { z } from "zod";

export const mediaVaultListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  type: z.enum(["PHOTO", "VIDEO"]).optional(),
  search: z.string().trim().max(120).optional(),
});

export const mediaVaultUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().max(120).default(""),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(500 * 1024 * 1024),
});

export const mediaVaultIdSchema = z.object({
  id: z.string().uuid(),
});
