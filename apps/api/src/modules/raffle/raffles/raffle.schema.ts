import { z } from "zod";
import { RaffleDistribution, RaffleStatus } from "@prisma/client-raffle";

export const createRaffleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  ticketPrice: z.number().positive(),
  ticketQuantity: z.number().int().positive(),
  opportunities: z.number().int().min(1).default(1),
  distribution: z.nativeEnum(RaffleDistribution).default(RaffleDistribution.LINEAR),
  drawDate: z.string().datetime().optional().nullable(),
  image: z.string().optional().nullable(),
}).refine(
  d => (d.ticketQuantity * (d.opportunities ?? 1)) <= 100_000,
  { message: 'El universo no puede superar 100,000 números' }
);

export const updateRaffleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  ticketPrice: z.number().positive().optional(),
  ticketQuantity: z.number().int().positive().optional(),
  opportunities: z.number().int().min(1).optional(),
  distribution: z.nativeEnum(RaffleDistribution).optional(),
  drawDate: z.string().datetime().optional().nullable(),
  image: z.string().optional().nullable(),
});

export const updateRaffleStatusSchema = z.object({
  status: z.nativeEnum(RaffleStatus),
});
