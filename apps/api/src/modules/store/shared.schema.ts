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

export const whatsappChannelSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  phone: z.string().min(1),
  template: z.string().optional(),
  active: z.boolean().optional(),
  instanceName: z.string().optional().nullable(),
  evolutionUrl: z.string().optional().nullable(),
  evolutionKey: z.string().optional().nullable(),
});

export const updateShippingZoneSchema = z.object({
  zoneType: z.enum(["STANDARD", "EXTENDED"]),
});
