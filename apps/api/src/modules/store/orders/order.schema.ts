import { z } from "zod";

export const deliveryTypeEnum = z.enum(["SHIPPING", "PICKUP"]);
export const orderStatusEnum = z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]);
export const paymentMethodEnum = z.enum(["TRANSFER", "MERCADOPAGO"]);

export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().min(1),
  receiverName: z.string().optional(),
  shippingAddress: z.string().optional(),
  shippingStreet: z.string().optional(),
  shippingNeighborhood: z.string().optional(),
  shippingPostalCode: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  deliveryMethod: z.enum(["BUS_STATION", "AIRPORT", "PARCEL"]).optional(),
  shippingCost: z.number().optional(),
  couponCode: z.string().trim().optional().or(z.literal("")),
  deliveryType: deliveryTypeEnum,
  paymentMethod: paymentMethodEnum.optional().default("TRANSFER"),
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

export const updateOrderCustomerSchema = z.object({
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  shippingState: z.string().trim().optional().nullable(),
});

export const cancelPaymentAttemptSchema = z.object({
  customerPhone: z.string().trim().min(1),
});

export const markOrdersReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});
