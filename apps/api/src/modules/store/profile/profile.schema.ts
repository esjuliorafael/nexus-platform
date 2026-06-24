import { z } from "zod";

export const e164PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Usa formato internacional, por ejemplo +521234567890");

export const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email().nullable().optional(),
  phone: e164PhoneSchema.nullable().optional(),
});

export const updateOwnNotificationsSchema = z.object({
  receiveNotifications: z.boolean(),
  notificationEmail: z.string().trim().email().nullable().optional(),
}).superRefine((value, context) => {
  if (value.receiveNotifications && !value.notificationEmail) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["notificationEmail"],
      message: "Ingresa un correo para recibir notificaciones.",
    });
  }
});

export const contactChannelSchema = z.object({
  type: z.enum(["WHATSAPP", "PHONE"]),
  phoneNumber: e164PhoneSchema,
  label: z.string().trim().max(50).nullable().optional(),
  active: z.boolean().default(true),
});

export const updateContactProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120).nullable().optional(),
  responsibility: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).nullable().optional(),
  scheduleText: z.string().trim().max(120).nullable().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  channels: z.array(contactChannelSchema).max(6),
}).superRefine((value, context) => {
  const keys = new Set<string>();
  value.channels.forEach((channel, index) => {
    const key = `${channel.type}:${channel.phoneNumber}`;
    if (keys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channels", index, "phoneNumber"],
        message: "Este canal ya fue agregado.",
      });
    }
    keys.add(key);
  });
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

