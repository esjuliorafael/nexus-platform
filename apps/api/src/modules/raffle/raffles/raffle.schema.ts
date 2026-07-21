import { z } from "zod";
import {
  RaffleDistribution,
  RafflePrizeShippingPolicy,
  RaffleStatus,
} from "@prisma/client-raffle";

const raffleGalleryItemSchema = z.object({
  filePath: z.string().url(),
  fileType: z.enum(["PHOTO", "VIDEO"]),
  posterPath: z.string().url().optional().nullable(),
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

const participationWindowFields = {
  participationStartsAt: z.string().datetime().optional().nullable(),
  participationEndsAt: z.string().datetime().optional().nullable(),
  earlyAccessEnabled: z.boolean().optional(),
  earlyAccessCode: z.string().trim().min(4).max(64).optional().nullable(),
  clearEarlyAccessCode: z.boolean().optional(),
};

export const validateParticipationWindow = (
  data: {
    drawDate?: string | null;
    participationStartsAt?: string | null;
    participationEndsAt?: string | null;
    earlyAccessEnabled?: boolean;
    earlyAccessCode?: string | null;
  },
  context: z.RefinementCtx,
  requireCode: boolean,
) => {
  const startsAt = data.participationStartsAt ? new Date(data.participationStartsAt) : null;
  const endsAt = data.participationEndsAt ? new Date(data.participationEndsAt) : null;

  if (Boolean(startsAt) !== Boolean(endsAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [startsAt ? "participationEndsAt" : "participationStartsAt"],
      message: "Define tanto el inicio como el cierre de la participación",
    });
  }
  if (startsAt && endsAt && startsAt >= endsAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["participationEndsAt"],
      message: "El cierre debe ser posterior al inicio",
    });
  }
  if (data.earlyAccessEnabled && !startsAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["earlyAccessEnabled"],
      message: "El acceso anticipado requiere un periodo de participación",
    });
  }
  if (requireCode && data.earlyAccessEnabled && !data.earlyAccessCode) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["earlyAccessCode"],
      message: "Define un código de acceso anticipado",
    });
  }
};

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
    imageType: z.enum(["PHOTO", "VIDEO"]).optional(),
    imagePoster: z.string().url().optional().nullable(),
    coverPosterAssetId: z.string().uuid().optional(),
    prizeShippingPolicy: z.nativeEnum(RafflePrizeShippingPolicy),
    winningNumber: z.string().trim().regex(/^\d+$/).optional().nullable(),
    gallery: z.array(raffleGalleryItemSchema).max(6).optional(),
    status: z.nativeEnum(RaffleStatus).optional(),
    ...participationWindowFields,
  })
  .superRefine((data, context) => {
    if (!isClosedRaffleUniverse(data.ticketQuantity, data.opportunities ?? 1)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: universeValidationMessage,
        path: ["ticketQuantity"],
      });
    }
    validateParticipationWindow(data, context, true);
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
  imageType: z.enum(["PHOTO", "VIDEO"]).optional(),
  imagePoster: z.string().url().optional().nullable(),
  coverPosterAssetId: z.string().uuid().optional(),
  prizeShippingPolicy: z.nativeEnum(RafflePrizeShippingPolicy).optional().nullable(),
  winningNumber: z.string().trim().regex(/^\d+$/).optional().nullable(),
  gallery: z.array(raffleGalleryItemSchema).max(6).optional(),
  status: z.nativeEnum(RaffleStatus).optional(),
  ...participationWindowFields,
});

export const updateRaffleStatusSchema = z.object({
  status: z.nativeEnum(RaffleStatus),
});

export const updateRafflePublicationSchema = z.object({
  published: z.boolean(),
});

export const updateRaffleFeaturedSchema = z.object({
  featured: z.boolean(),
  featuredOrder: z.number().int().min(1).nullable().optional(),
});

export const reorderFeaturedRafflesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(3),
});
