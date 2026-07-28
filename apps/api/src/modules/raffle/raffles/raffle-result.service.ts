import {
  PaymentHoldStatus,
  Prisma,
  PrismaClient,
  RaffleStatus,
  TicketStatus,
} from "@prisma/client-raffle";
import {
  auditActorData,
  type AuditActor,
} from "../../../utils/admin-authorization";

type RaffleDatabaseClient = PrismaClient | Prisma.TransactionClient;

export type RaffleResultResolutionStatus =
  | "ELIGIBLE_WINNER"
  | "UNPAID_RESERVED"
  | "PAYMENT_REVIEW"
  | "UNASSIGNED_NUMBER"
  | "OUTSIDE_UNIVERSE";

export type RafflePrizeResultInput = {
  prizeId: number;
  referenceNumber: string;
};

export type RafflePrizeResultPreview = {
  prizeId: number;
  position: number;
  title: string;
  resultSource: string;
  resultSourceLabel: string | null;
  referenceNumber: string;
  winningNumber: string;
  winningTicketNumber: string | null;
  winningParticipationId: string | null;
  resolutionStatus: RaffleResultResolutionStatus;
  canPublish: boolean;
  participant: {
    name: string;
    phone: string;
    state: string | null;
    paymentStatus: string;
  } | null;
};

export type RaffleResultPreview = {
  raffleId: number;
  prizes: RafflePrizeResultPreview[];
  duplicateWinningTickets: string[];
  canPublish: boolean;
};

export const deriveWinningNumber = (
  referenceNumber: string,
  digits: number,
) => {
  const normalized = referenceNumber.replace(/\D/g, "");
  if (!normalized || normalized.length < digits) return null;
  return normalized.slice(-digits);
};

export const findWinningTicketNumber = (
  assignments: Array<{
    mainTicketNumber: string;
    extraOpportunities: unknown;
  }>,
  winningNumber: string,
) => {
  const assignment = assignments.find((candidate) => {
    const extras = Array.isArray(candidate.extraOpportunities)
      ? candidate.extraOpportunities.map(String)
      : [];
    return (
      candidate.mainTicketNumber === winningNumber ||
      extras.includes(winningNumber)
    );
  });
  return assignment?.mainTicketNumber ?? null;
};

export const findDuplicateWinningTickets = (
  prizes: Array<{ winningTicketNumber: string | null }>,
) => {
  const counts = new Map<string, number>();
  prizes.forEach(({ winningTicketNumber }) => {
    if (!winningTicketNumber) return;
    counts.set(winningTicketNumber, (counts.get(winningTicketNumber) || 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([ticketNumber]) => ticketNumber);
};

const resolveTicketParticipation = async (
  prisma: RaffleDatabaseClient,
  raffleId: number,
  winningTicketNumber: string,
) => {
  const sales = await prisma.ticketSale.findMany({
    where: {
      raffleId,
      ticketNumber: winningTicketNumber,
      paymentStatus: { in: [TicketStatus.PAID, TicketStatus.PENDING] },
    },
    orderBy: { createdAt: "desc" },
  });
  const paidSale = sales.find(
    (sale) => sale.paymentStatus === TicketStatus.PAID,
  );
  const activeSale = paidSale || sales[0] || null;

  if (activeSale) {
    return {
      winningParticipationId: activeSale.reservationId,
      resolutionStatus:
        activeSale.paymentStatus === TicketStatus.PAID
          ? ("ELIGIBLE_WINNER" as const)
          : ("UNPAID_RESERVED" as const),
      canPublish: true,
      participant: {
        name: activeSale.customerName,
        phone: activeSale.customerPhone,
        state: activeSale.customerState,
        paymentStatus: activeSale.paymentStatus,
      },
    };
  }

  const activeHoldTicket = await prisma.rafflePaymentHoldTicket.findFirst({
    where: {
      raffleId,
      ticketNumber: winningTicketNumber,
      hold: {
        status: {
          in: [PaymentHoldStatus.ACTIVE, PaymentHoldStatus.PROCESSING],
        },
        expiresAt: { gt: new Date() },
      },
    },
    include: { hold: true },
  });
  if (activeHoldTicket) {
    return {
      winningParticipationId: null,
      resolutionStatus: "PAYMENT_REVIEW" as const,
      canPublish: false,
      participant: {
        name: activeHoldTicket.hold.customerName,
        phone: activeHoldTicket.hold.customerPhone,
        state: activeHoldTicket.hold.customerState,
        paymentStatus: activeHoldTicket.hold.status,
      },
    };
  }

  return {
    winningParticipationId: null,
    resolutionStatus: "UNASSIGNED_NUMBER" as const,
    canPublish: true,
    participant: null,
  };
};

const previewPrizeResult = async (
  prisma: RaffleDatabaseClient,
  raffle: {
    id: number;
    digits: number;
    extraOpportunities: Array<{
      mainTicketNumber: string;
      extraOpportunities: Prisma.JsonValue;
    }>;
  },
  prize: {
    id: number;
    position: number;
    title: string;
    resultSource: string;
    resultSourceLabel: string | null;
  },
  referenceNumber: string,
): Promise<RafflePrizeResultPreview> => {
  const normalizedReference = referenceNumber.replace(/\D/g, "");
  const winningNumber = deriveWinningNumber(normalizedReference, raffle.digits);
  if (!winningNumber) throw new Error("INVALID_RESULT_REFERENCE");

  const winningTicketNumber = findWinningTicketNumber(
    raffle.extraOpportunities,
    winningNumber,
  );
  if (!winningTicketNumber) {
    return {
      prizeId: prize.id,
      position: prize.position,
      title: prize.title,
      resultSource: prize.resultSource,
      resultSourceLabel: prize.resultSourceLabel,
      referenceNumber: normalizedReference,
      winningNumber,
      winningTicketNumber: null,
      winningParticipationId: null,
      resolutionStatus: "OUTSIDE_UNIVERSE",
      canPublish: true,
      participant: null,
    };
  }

  const participation = await resolveTicketParticipation(
    prisma,
    raffle.id,
    winningTicketNumber,
  );
  return {
    prizeId: prize.id,
    position: prize.position,
    title: prize.title,
    resultSource: prize.resultSource,
    resultSourceLabel: prize.resultSourceLabel,
    referenceNumber: normalizedReference,
    winningNumber,
    winningTicketNumber,
    ...participation,
  };
};

export const previewRaffleResult = async (
  prisma: RaffleDatabaseClient,
  raffleId: number,
  resultInputs: RafflePrizeResultInput[],
): Promise<RaffleResultPreview | null> => {
  const raffle = await prisma.raffle.findUnique({
    where: { id: raffleId },
    include: {
      prizes: { orderBy: { position: "asc" } },
      extraOpportunities: {
        select: {
          mainTicketNumber: true,
          extraOpportunities: true,
        },
      },
    },
  });
  if (!raffle) return null;
  if (raffle.prizes.length === 0) throw new Error("RAFFLE_HAS_NO_PRIZES");

  const inputByPrizeId = new Map(
    resultInputs.map((input) => [input.prizeId, input.referenceNumber]),
  );
  if (
    inputByPrizeId.size !== raffle.prizes.length ||
    raffle.prizes.some((prize) => !inputByPrizeId.has(prize.id))
  ) {
    throw new Error("INCOMPLETE_PRIZE_RESULTS");
  }

  const prizes: RafflePrizeResultPreview[] = [];
  for (const prize of raffle.prizes) {
    prizes.push(
      await previewPrizeResult(
        prisma,
        raffle,
        prize,
        inputByPrizeId.get(prize.id)!,
      ),
    );
  }

  return {
    raffleId,
    prizes,
    duplicateWinningTickets: findDuplicateWinningTickets(prizes),
    canPublish: prizes.every((prize) => prize.canPublish),
  };
};

export const raffleResultService = {
  preview: previewRaffleResult,

  async getAdmin(prisma: PrismaClient, raffleId: number) {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      include: {
        prizes: { orderBy: { position: "asc" } },
        resultEvents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!raffle) return null;

    const participationIds = Array.from(
      new Set(
        raffle.prizes
          .map((prize) => prize.winningParticipationId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const sales = participationIds.length
      ? await prisma.ticketSale.findMany({
          where: {
            raffleId,
            reservationId: { in: participationIds },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return {
      raffleId,
      resultPublishedAt: raffle.resultPublishedAt,
      prizes: raffle.prizes.map((prize) => {
        const sale = sales.find(
          (candidate) =>
            candidate.reservationId === prize.winningParticipationId,
        );
        return {
          prizeId: prize.id,
          position: prize.position,
          title: prize.title,
          resultSource: prize.resultSource,
          resultSourceLabel: prize.resultSourceLabel,
          draftReferenceNumber: prize.draftReferenceNumber,
          referenceNumber: prize.resultReferenceNumber,
          winningNumber: prize.winningNumber,
          winningTicketNumber: prize.winningTicketNumber,
          winningParticipationId: prize.winningParticipationId,
          resolutionStatus: prize.resultResolutionStatus,
          fulfillmentStatus: prize.fulfillmentStatus,
          fulfillmentUpdatedAt: prize.fulfillmentUpdatedAt,
          fulfillmentUpdatedBy: prize.fulfillmentUpdatedBy,
          fulfillmentNotes: prize.fulfillmentNotes,
          participant: sale
            ? {
                name: sale.customerName,
                phone: sale.customerPhone,
                state: sale.customerState,
                paymentStatus: sale.paymentStatus,
              }
            : null,
        };
      }),
      events: raffle.resultEvents,
    };
  },

  async saveDraft(
    prisma: PrismaClient,
    raffleId: number,
    prizeId: number,
    referenceNumber: string,
  ) {
    const normalized = referenceNumber.replace(/\D/g, "");
    const prize = await prisma.rafflePrize.findFirst({
      where: { id: prizeId, raffleId },
      include: { raffle: { select: { digits: true, resultPublishedAt: true, status: true } } },
    });
    if (!prize) throw new Error("RAFFLE_PRIZE_NOT_FOUND");
    if (prize.raffle.resultPublishedAt || prize.resultPublishedAt) {
      throw new Error("RAFFLE_RESULT_ALREADY_PUBLISHED");
    }
    if (prize.raffle.status === RaffleStatus.CANCELLED) {
      throw new Error("CANCELLED_RAFFLE_RESULT");
    }
    if (normalized.length < prize.raffle.digits || normalized.length > 20) {
      throw new Error("INVALID_RESULT_REFERENCE");
    }
    return prisma.rafflePrize.update({
      where: { id: prize.id },
      data: { draftReferenceNumber: normalized },
      select: { id: true, draftReferenceNumber: true, updatedAt: true },
    });
  },

  async publish(
    prisma: PrismaClient,
    raffleId: number,
    resultInputs: RafflePrizeResultInput[],
    actor: AuditActor,
  ) {
    return prisma.$transaction(
      async (tx) => {
        // PostgreSQL advisory locks return void, so they must execute without row deserialization.
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(7422, ${raffleId}::integer)`,
        );
        const current = await tx.raffle.findUnique({
          where: { id: raffleId },
        });
        if (!current) throw new Error("RAFFLE_NOT_FOUND");
        if (current.resultPublishedAt || current.winningNumber) {
          throw new Error("RAFFLE_RESULT_ALREADY_PUBLISHED");
        }
        if (current.status === RaffleStatus.CANCELLED) {
          throw new Error("CANCELLED_RAFFLE_RESULT");
        }

        const preview = await previewRaffleResult(tx, raffleId, resultInputs);
        if (!preview) throw new Error("RAFFLE_NOT_FOUND");
        if (!preview.canPublish) {
          throw new Error("RAFFLE_RESULT_PAYMENT_REVIEW");
        }

        const publishedAt = new Date();
        for (const prize of preview.prizes) {
          await tx.rafflePrize.update({
            where: { id: prize.prizeId },
            data: {
              resultReferenceNumber: prize.referenceNumber,
              draftReferenceNumber: null,
              winningNumber: prize.winningNumber,
              winningTicketNumber: prize.winningTicketNumber,
              winningParticipationId: prize.winningParticipationId,
              resultResolutionStatus: prize.resolutionStatus,
              resultPublishedAt: publishedAt,
              fulfillmentStatus:
                prize.resolutionStatus === "ELIGIBLE_WINNER"
                  ? "PENDING_CONTACT"
                  : "NOT_APPLICABLE",
              fulfillmentUpdatedAt: publishedAt,
              fulfillmentUpdatedBy: actor.userId,
            },
          });
        }

        const firstPrize = preview.prizes[0];
        const raffle = await tx.raffle.update({
          where: { id: raffleId },
          data: {
            status: RaffleStatus.FINISHED,
            published: true,
            featured: false,
            featuredOrder: null,
            resultReferenceNumber: firstPrize.referenceNumber,
            winningNumber: firstPrize.winningNumber,
            winningTicketNumber: firstPrize.winningTicketNumber,
            winningParticipationId: firstPrize.winningParticipationId,
            resultResolutionStatus: firstPrize.resolutionStatus,
            resultPublishedAt: publishedAt,
          },
          include: {
            gallery: true,
            prizes: { orderBy: { position: "asc" } },
          },
        });

        await tx.raffleResultEvent.create({
          data: {
            raffleId,
            eventType: "RESULT_PUBLISHED",
            message:
              preview.prizes.length === 1
                ? "Resultado publicado para el premio configurado."
                : `Resultados publicados para ${preview.prizes.length} lugares.`,
            ...auditActorData(actor),
            previousState: {
              status: current.status,
              resultPublishedAt: null,
            },
            nextState: {
              status: RaffleStatus.FINISHED,
              resultPublishedAt: publishedAt.toISOString(),
              prizeResults: preview.prizes.map((prize) => ({
                prizeId: prize.prizeId,
                winningNumber: prize.winningNumber,
                winningTicketNumber: prize.winningTicketNumber,
                resolutionStatus: prize.resolutionStatus,
              })),
            },
            metadata: {
              duplicateWinningTickets: preview.duplicateWinningTickets,
              results: preview.prizes,
            },
          },
        });

        return { raffle, preview, publishedAt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  },
};
