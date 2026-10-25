import { z } from "zod";
import { Role } from "@prisma/client-store";
import { PERMISSION_IDS } from "@nexus/types";

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
