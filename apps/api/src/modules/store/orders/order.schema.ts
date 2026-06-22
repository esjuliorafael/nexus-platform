import { z } from "zod";

export const deliveryTypeEnum = z.enum(["SHIPPING", "PICKUP"]);
export const orderStatusEnum = z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  shippingAddress: z.string().optional(),
  shippingState: z.string().optional(),
  deliveryType: deliveryTypeEnum,
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});

export const markOrdersReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});
