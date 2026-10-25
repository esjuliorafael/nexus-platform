import { z } from "zod";
import { Role } from "@prisma/client-store";

const PERMISSION_IDS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "orders.financial.manage",
  "orders.refund",
  "orders.restore",
  "payment-links.manage",
  "products.view",
  "products.manage",
  "categories.manage",
  "storefront.content.manage",
  "shipping.view",
  "shipping.manage",
  "payments.config.manage",
  "settings.view",
  "settings.manage",
  "billing.view",
  "billing.manage",
  "channels.view",
  "channels.manage",
  "messaging.view",
  "messaging.manage",
  "messaging.send",
  "coupons.manage",
  "media.manage",
  "media.upload",
  "media.vault.manage",
  "inventory.audit",
  "raffles.view",
  "raffles.manage",
  "raffles.results.manage",
  "raffles.participations.view",
  "raffles.participations.manage",
  "raffles.financial.manage",
  "raffles.coupons.manage",
  "raffles.settings.manage",
  "raffles.intelligence.view",
  "raffles.intelligence.manage",
  "users.manage",
] as const;

const permissionListSchema = z.array(z.enum(PERMISSION_IDS)).refine(
  (permissions) => new Set(permissions).size === permissions.length,
  "No repitas permisos.",
);

export const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional().nullable(),
  role: z.nativeEnum(Role).default(Role.STAFF),
  permissions: permissionListSchema.default([]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional().nullable(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
  permissions: permissionListSchema.optional(),
});
