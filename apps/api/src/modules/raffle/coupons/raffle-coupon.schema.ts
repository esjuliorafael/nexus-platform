import { z } from "zod";

const optionalPositiveInteger = z.coerce.number().int().positive().nullable().optional();
const optionalDate = z.coerce.date().nullable().optional();

export const raffleCouponCreateSchema = z.object({
  code: z.string().trim().min(3).max(40),
  name: z.string().trim().max(100).nullable().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().positive(),
  raffleId: optionalPositiveInteger,
  minTickets: optionalPositiveInteger,
  maxDiscount: z.coerce.number().positive().nullable().optional(),
  usageLimit: optionalPositiveInteger,
  active: z.boolean().optional(),
  startsAt: optionalDate,
  expiresAt: optionalDate,
});

export const raffleCouponUpdateSchema = raffleCouponCreateSchema.partial();

export const raffleCouponValidationSchema = z.object({
  code: z.string().trim().min(1),
  raffleId: z.coerce.number().int().positive(),
  tickets: z.array(z.string().trim().min(1)).min(1),
});
