import { z } from "zod";

const campaignThemeSchema = z.enum(["BRAND", "RED", "PINE"]);
const campaignHrefSchema = z
  .string()
  .trim()
  .max(240)
  .startsWith("/")
  .refine(
    (value) => !value.startsWith("//"),
    "El destino debe ser una ruta interna del Storefront.",
  );

const campaignShape = {
  name: z.string().trim().min(2).max(80),
  eyebrow: z.string().trim().max(48).optional().nullable(),
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().max(240).optional().nullable(),
  ctaLabel: z.string().trim().max(32).optional().nullable(),
  ctaHref: campaignHrefSchema.optional().nullable(),
  theme: campaignThemeSchema.default("BRAND"),
  active: z.boolean().default(false),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  couponId: z.number().int().positive(),
};

function validateCampaignDates(
  value: {
    startsAt?: string;
    endsAt?: string;
    ctaLabel?: string | null;
    ctaHref?: string | null;
  },
  context: z.RefinementCtx,
) {
  if (
    value.startsAt &&
    value.endsAt &&
    new Date(value.endsAt) <= new Date(value.startsAt)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "La fecha de cierre debe ser posterior al inicio.",
    });
  }
  if (Boolean(value.ctaLabel?.trim()) !== Boolean(value.ctaHref?.trim())) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ctaLabel"],
      message: "Completa el texto y el destino del CTA, o deja ambos vacíos.",
    });
  }
}

export const createStorefrontCampaignSchema = z
  .object(campaignShape)
  .superRefine(validateCampaignDates);
export const updateStorefrontCampaignSchema = z
  .object({
    ...campaignShape,
    name: campaignShape.name.optional(),
    title: campaignShape.title.optional(),
    theme: campaignThemeSchema.optional(),
    active: z.boolean().optional(),
    startsAt: campaignShape.startsAt.optional(),
    endsAt: campaignShape.endsAt.optional(),
    couponId: campaignShape.couponId.optional(),
  })
  .partial()
  .superRefine(validateCampaignDates);

export const updateStorefrontCampaignActiveSchema = z.object({
  active: z.boolean(),
});
