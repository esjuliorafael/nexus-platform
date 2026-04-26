import { z } from "zod";
import { RaffleDistribution, RaffleStatus } from "@prisma/client-raffle";

export const createRaffleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  ticketPrice: z.number().positive(),
  ticketQuantity: z.number().int().positive(),
  opportunities: z.number().int().default(1),
  distribution: z.nativeEnum(RaffleDistribution).default(RaffleDistribution.LINEAR),
  useZero: z.boolean().default(false),
  digits: z.number().int().min(1).max(10).default(3),
  drawDate: z.string().datetime().optional().nullable(),
  image: z.string().optional().nullable(),
});

export const updateRaffleSchema = createRaffleSchema.partial();

export const updateRaffleStatusSchema = z.object({
  status: z.nativeEnum(RaffleStatus),
});
