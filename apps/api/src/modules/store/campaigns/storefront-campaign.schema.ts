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
  cardLabel: z.string().trim().max(48).optional().nullable(),
  homeCardEnabled: z.boolean().default(true),
  tickerEnabled: z.boolean().default(true),
  tickerMessage: z.string().trim().max(120).optional().nullable(),
  tickerDetail: z.string().trim().max(160).optional().nullable(),
  tickerShowCouponCode: z.boolean().default(false),
  title: z.string().trim().max(120).optional(),
  titleEmphasis: z.string().trim().max(120).optional().nullable(),
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
    homeCardEnabled?: boolean;
    cardLabel?: string | null;
    tickerEnabled?: boolean;
    tickerMessage?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    title?: string;
    titleEmphasis?: string | null;
  },
  context: z.RefinementCtx,
  requireEnabledContent = false,
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
  if (
    value.homeCardEnabled !== false &&
    (requireEnabledContent ||
      (value.ctaLabel !== undefined && value.ctaHref !== undefined)) &&
    Boolean(value.ctaLabel?.trim()) !== Boolean(value.ctaHref?.trim())
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ctaLabel"],
      message: "Completa el texto y el destino del CTA, o deja ambos vacíos.",
    });
  }

  if (
    value.homeCardEnabled !== false &&
    value.title !== undefined &&
    value.title &&
    value.titleEmphasis?.trim() &&
    !hasUniqueTitleEmphasis(value.title, value.titleEmphasis)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["titleEmphasis"],
      message: "La frase destacada debe aparecer una sola vez en el título.",
    });
  }

  if (
    value.homeCardEnabled === true &&
    (requireEnabledContent || value.title !== undefined) &&
    (!value.title?.trim() || value.title.trim().length < 2)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["title"],
      message: "Escribe un título para la tarjeta del Inicio.",
    });
  }

  if (
    value.homeCardEnabled === true &&
    (requireEnabledContent || value.cardLabel !== undefined) &&
    !value.cardLabel?.trim()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cardLabel"],
      message: "Define la etiqueta pública de la tarjeta.",
    });
  }

  if (
    value.tickerEnabled === true &&
    (requireEnabledContent || value.tickerMessage !== undefined) &&
    !value.tickerMessage?.trim()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tickerMessage"],
      message: "Escribe el mensaje principal de la cinta.",
    });
  }
}

export function hasUniqueTitleEmphasis(
  title: string,
  emphasis?: string | null,
) {
  const phrase = emphasis?.trim();
  if (!phrase) return true;
  const firstIndex = title.indexOf(phrase);
  return firstIndex !== -1 && title.indexOf(phrase, firstIndex + 1) === -1;
}

export const createStorefrontCampaignSchema = z
  .object(campaignShape)
  .superRefine((value, context) => validateCampaignDates(value, context, true));
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
