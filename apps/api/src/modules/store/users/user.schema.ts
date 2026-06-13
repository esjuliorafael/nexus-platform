import { z } from "zod";
import { Role } from "@prisma/client-store";

export const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  role: z.nativeEnum(Role).default(Role.STAFF),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
  receiveNotifications: z.boolean().optional(),
});
