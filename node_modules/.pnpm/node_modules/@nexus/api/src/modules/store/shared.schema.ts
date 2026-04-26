import { z } from "zod";

export const paymentChannelSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  bank: z.string().min(1),
  beneficiary: z.string().min(1),
  clabe: z.string().optional(),
  card: z.string().optional(),
});

export const whatsappChannelSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  phone: z.string().min(1),
  template: z.string().min(1),
  active: z.boolean().optional(),
});

export const updateShippingZoneSchema = z.object({
  zoneType: z.enum(["NORMAL", "EXTENDED"]),
});
