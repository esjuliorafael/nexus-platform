import { z } from "zod";

export const createExtraChargeSchema = z.object({
  concept: z.string().min(1),
  amount: z.number().positive(),
  isPaid: z.boolean().default(false).optional(),
  chargeDate: z.coerce.date(),
});

export const updateExtraChargeSchema = createExtraChargeSchema.partial();

export const createAnnualServiceSchema = z.object({
  concept: z.string().min(1),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  isPaid: z.boolean().default(false).optional(),
  contractDate: z.coerce.date().optional().nullable(),
  expirationDate: z.coerce.date().optional().nullable(),
  iconType: z.string().default("default"),
});

export const updateAnnualServiceSchema = createAnnualServiceSchema.partial();

export const createBillingPaymentSchema = z.object({
  concept: z.string().min(1),
  amount: z.number().positive(),
  paymentDate: z.coerce.date(),
  notes: z.string().optional().nullable(),
});

export const updateBillingPaymentSchema = createBillingPaymentSchema.partial();

export const reorderBillingItemsSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
});
