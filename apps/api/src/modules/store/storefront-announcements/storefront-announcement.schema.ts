import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const optionalDate = z.preprocess(
  emptyToNull,
  z.string().datetime().nullable().optional(),
);

export const announcementScopeSchema = z.enum([
  "GLOBAL",
  "STORE",
  "RAFFLES",
  "RAFFLE",
  "PRODUCT",
  "STORE_CHECKOUT",
  "RAFFLE_CHECKOUT",
]);

export const announcementVariantSchema = z.enum([
  "INFO",
  "SUCCESS",
  "WARNING",
  "CRITICAL",
  "PROMO",
]);

export const announcementFrequencySchema = z.enum([
  "ONCE_VISITOR",
  "ONCE_SESSION",
  "ALWAYS",
]);

const announcementDataSchema = z.object({
  scope: announcementScopeSchema,
  targetId: z.coerce.number().int().positive().nullable().optional(),
  presentation: z.literal("POPUP").default("POPUP"),
  variant: announcementVariantSchema.default("INFO"),
  frequency: announcementFrequencySchema.default("ONCE_VISITOR"),
  eyebrow: optionalText(60),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  ctaLabel: optionalText(48),
  ctaHref: optionalText(500),
  dismissible: z.boolean().default(true),
  active: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

const validateAnnouncement = (value: z.infer<typeof announcementDataSchema>, context: z.RefinementCtx) => {
  const needsTarget = value.scope === "RAFFLE" || value.scope === "PRODUCT";
  if (needsTarget && !value.targetId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetId"],
      message: "Selecciona el contenido al que pertenece el aviso.",
    });
  }
  if (!needsTarget && value.targetId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetId"],
      message: "Este alcance no admite un contenido específico.",
    });
  }
  if (Boolean(value.ctaLabel) !== Boolean(value.ctaHref)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [value.ctaLabel ? "ctaHref" : "ctaLabel"],
      message: "Completa el texto y el destino del CTA.",
    });
  }
  if (!value.dismissible && !value.ctaLabel) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dismissible"],
      message: "Un aviso obligatorio debe incluir una acción para continuar.",
    });
  }
  if (value.ctaHref && !value.ctaHref.startsWith("/") && !/^https:\/\//i.test(value.ctaHref)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ctaHref"],
      message: "Usa una ruta interna o una URL HTTPS.",
    });
  }
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "La finalización debe ser posterior a la publicación.",
    });
  }
};

export const createAnnouncementSchema = announcementDataSchema.superRefine(validateAnnouncement);
export const updateAnnouncementSchema = announcementDataSchema.superRefine(validateAnnouncement);

export const updateAnnouncementStatusSchema = z.object({ active: z.boolean() });

export const publicAnnouncementQuerySchema = z.object({
  scope: announcementScopeSchema.default("GLOBAL"),
  targetId: z.coerce.number().int().positive().optional(),
});
