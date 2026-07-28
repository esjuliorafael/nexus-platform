import { z } from "zod";

export const paymentChannelSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  bank: z.string().min(1),
  beneficiary: z.string().min(1),
  accountNumber: z.string().optional(),
  clabe: z.string().optional(),
  card: z.string().optional(),
});

export const whatsappChannelSchema = z
  .object({
    name: z.string().min(1),
    purpose: z.string().min(1),
    phone: z.string().optional().default(""),
    template: z.string().optional(),
    active: z.boolean().optional(),
    provider: z.enum(["EVOLUTION", "KAPSO"]).optional().default("EVOLUTION"),
    deliveryStrategy: z
      .enum(["STANDARD", "KAPSO_PREFERRED", "EVOLUTION_ONLY"])
      .optional()
      .default("STANDARD"),
    instanceName: z.string().optional().nullable(),
    evolutionUrl: z.string().optional().nullable(),
    evolutionKey: z.string().optional().nullable(),
    kapsoPhoneNumberId: z.string().optional().nullable(),
    kapsoBusinessAccountId: z.string().optional().nullable(),
  })
  .superRefine((data, context) => {
    if (data.provider === "EVOLUTION" && !data.phone.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "El número de WhatsApp es obligatorio para Evolution API.",
      });
    }
    if (data.provider === "EVOLUTION" && !data.instanceName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["instanceName"],
        message: "La instancia de Evolution API es obligatoria.",
      });
    }
    if (data.provider === "KAPSO" && !data.kapsoPhoneNumberId?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kapsoPhoneNumberId"],
        message: "El Phone Number ID de Kapso es obligatorio.",
      });
    }
    if (data.provider === "KAPSO" && !data.kapsoBusinessAccountId?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kapsoBusinessAccountId"],
        message: "El Business Account ID de Kapso es obligatorio.",
      });
    }
    if (
      data.deliveryStrategy === "KAPSO_PREFERRED" &&
      (!data.kapsoPhoneNumberId?.trim() ||
        !data.kapsoBusinessAccountId?.trim())
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryStrategy"],
        message:
          "Kapso preferente requiere Phone Number ID y Business Account ID.",
      });
    }
  });

export const updateShippingZoneSchema = z.object({
  zoneType: z.enum(["STANDARD", "EXTENDED"]),
});
