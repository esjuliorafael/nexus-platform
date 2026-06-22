import { z } from "zod";

export const homeSlideTypeEnum = z.enum(["PHOTO", "VIDEO"]);

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const objectPositionSchema = z
  .string()
  .regex(/^(left|center|right|\d{1,3}%) (top|center|bottom|\d{1,3}%)$/)
  .optional();

const optionalDate = z.preprocess((value) => {
  const normalized = emptyToUndefined(value);
  if (!normalized) return undefined;
  return normalized;
}, z.string().datetime().optional());

export const createHomeSlideSchema = z.object({
  type: homeSlideTypeEnum.default("PHOTO"),
  mediaUrl: z.string().min(1),
  desktopObjectPosition: objectPositionSchema.default("50% 50%"),
  mobileObjectPosition: objectPositionSchema.default("50% 44%"),
  posterUrl: optionalString,
  eyebrow: optionalString,
  title: z.string().min(1),
  description: optionalString,
  displayDurationMs: z.number().int().min(3000).max(60000).default(8000),
  primaryText: optionalString,
  primaryHref: optionalString,
  secondaryText: optionalString,
  secondaryHref: optionalString,
  sortOrder: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

export const updateHomeSlideSchema = createHomeSlideSchema.partial();

export const reorderHomeSlidesSchema = z.object({
  ids: z.array(z.coerce.number().int()).min(1),
});
