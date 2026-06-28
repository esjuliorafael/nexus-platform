import { z } from "zod";

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

export const storeHeroScopeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toUpperCase() : value),
  z.enum(["ALL", "BIRD", "ITEM"]),
);

export const createStoreHeroSchema = z.object({
  scope: storeHeroScopeSchema.default("ALL"),
  assetId: z.string().uuid(),
  desktopObjectPosition: objectPositionSchema.default("50% 50%"),
  mobileObjectPosition: objectPositionSchema.default("50% 50%"),
  title: z.string().min(1),
  description: optionalString,
  sortOrder: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

export const updateStoreHeroSchema = createStoreHeroSchema.partial();

export const reorderStoreHeroesSchema = z.object({
  scope: storeHeroScopeSchema,
  ids: z.array(z.coerce.number().int()).min(1),
});
