import { z } from "zod";
import { RaffleDistribution, RaffleStatus } from "@prisma/client-raffle";

const raffleGalleryItemSchema = z.object({
  filePath: z.string().url(),
  fileType: z.enum(["PHOTO", "VIDEO"]),
});

export const isClosedRaffleUniverse = (ticketQuantity: number, opportunities: number) => {
  const universe = ticketQuantity * opportunities;
  if (universe < 99 || universe > 100_000) return false;

  const isPowerOfTen = (value: number) => {
    if (value < 10) return false;
    let remainder = value;
    while (remainder % 10 === 0) remainder /= 10;
    return remainder === 1;
  };

  if (opportunities === 1) return universe >= 100 && isPowerOfTen(universe);
  return isPowerOfTen(universe) || isPowerOfTen(universe + 1);
};

const universeValidationMessage =
  "Las rifas simples requieren 100, 1000 o una potencia exacta de 10. Las rifas de oportunidades también admiten 99, 999 y potencias de 10 menos uno";

export const createRaffleSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    ticketPrice: z.number().positive(),
    ticketQuantity: z.number().int().positive(),
    opportunities: z.number().int().min(1).default(1),
    distribution: z.nativeEnum(RaffleDistribution).default(RaffleDistribution.LINEAR),
    drawDate: z.string().datetime().optional().nullable(),
    image: z.string().optional().nullable(),
    gallery: z.array(raffleGalleryItemSchema).max(6).optional(),
    status: z.nativeEnum(RaffleStatus).optional(),
  })
  .refine((data) => isClosedRaffleUniverse(data.ticketQuantity, data.opportunities ?? 1), {
    message: universeValidationMessage,
    path: ["ticketQuantity"],
  });

export const updateRaffleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  ticketPrice: z.number().positive().optional(),
  ticketQuantity: z.number().int().positive().optional(),
  opportunities: z.number().int().min(1).optional(),
  distribution: z.nativeEnum(RaffleDistribution).optional(),
  drawDate: z.string().datetime().optional().nullable(),
  image: z.string().optional().nullable(),
  gallery: z.array(raffleGalleryItemSchema).max(6).optional(),
  status: z.nativeEnum(RaffleStatus).optional(),
});

export const updateRaffleStatusSchema = z.object({
  status: z.nativeEnum(RaffleStatus),
});

export const updateRafflePublicationSchema = z.object({
  published: z.boolean(),
});
