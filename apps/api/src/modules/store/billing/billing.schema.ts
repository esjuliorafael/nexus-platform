import { z } from "zod";

export const createExtraChargeSchema = z.object({
  concept: z.string().min(1),
  amount: z.number().positive(),
  isPaid: z.boolean().default(false),
  chargeDate: z.string().datetime(),
});

export const updateExtraChargeSchema = createExtraChargeSchema.partial();

export const createAnnualServiceSchema = z.object({
  concept: z.string().min(1),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  isPaid: z.boolean().default(false),
  contractDate: z.string().datetime().optional().nullable(),
  expirationDate: z.string().datetime().optional().nullable(),
  iconType: z.string().default("default"),
});

export const updateAnnualServiceSchema = createAnnualServiceSchema.partial();
