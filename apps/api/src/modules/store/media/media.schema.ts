import { z } from "zod";

export const mediaTypeEnum = z.enum(["PHOTO", "VIDEO"]);

export const createMediaSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: mediaTypeEnum,
  filePath: z.string().min(1),
  categoryId: z.number().int().optional(),
  subcategoryId: z.number().int().optional(),
  location: z.string().optional(),
  mediaDate: z.string().optional(),
});

export const updateMediaSchema = createMediaSchema.partial();
