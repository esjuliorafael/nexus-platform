import { z } from "zod";

export const couponDiscountTypeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toUpperCase() : value),
  z.enum(["PERCENTAGE", "FIXED"]),
);

export const couponScopeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.toUpperCase() : value),
  z.enum(["ALL", "ITEM", "BIRD"]),
);

export const couponItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1),
  items: z.array(couponItemSchema).min(1),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().optional().nullable(),
  discountType: couponDiscountTypeSchema,
  discountValue: z.number().positive(),
  scope: couponScopeSchema.default("ALL"),
  minSubtotal: z.number().min(0).optional().nullable(),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateCouponSchema = createCouponSchema.partial();
