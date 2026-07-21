import { Prisma, PrismaClient, RaffleStatus, TicketStatus } from "@prisma/client-raffle";
import { randomUUID } from "crypto";
import { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { getReminderDelayMs, reservationReminderQueue } from "../../../queues/reservation-reminder.queue";
import { ticketReleaseQueue } from "../../../queues/ticket-release.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { raffleNotificationService } from "../notifications/raffle-notification.service";
import { ticketService } from "../tickets/ticket.service";
import { canParticipateInRaffle } from "../raffles/raffle-access";
import { publishTicketAvailabilityChanged } from "./ticket-availability.events";
import { raffleCouponService } from "../coupons/raffle-coupon.service";
import { resolvePaymentHoldMinutes } from "../../store/payments/payment-hold-policy";

export class TicketAvailabilityConflictError extends Error {
  constructor(readonly ticketNumbers: string[]) {
    super("TICKETS_UNAVAILABLE");
  }
}

const toPaymentHoldAdminStatus = (hold: any) => {
  const latestAttempt = hold.paymentAttempts?.[0];
  const holdStatus = String(hold.status || "").toUpperCase();
  const paymentStatus = String(hold.mpPaymentStatus || "").toLowerCase();
  const attemptStatus = String(latestAttempt?.status || "").toUpperCase();
  const hasDefinitiveFailure =
    ["EXPIRED", "CANCELLED"].includes(holdStatus) ||
    ["rejected", "cancelled", "refunded", "charged_back"].includes(paymentStatus);

  if (hasDefinitiveFailure) return "NOT_COMPLETED";

  const isUnderReview =
    holdStatus === "PROCESSING" ||
    ["pending", "in_process", "authorized", "processing"].includes(paymentStatus) ||
    ["PROCESSING", "UNKNOWN"].includes(attemptStatus);

  return isUnderReview ? "PAYMENT_REVIEW" : "NOT_COMPLETED";
};

export const ticketSaleService = {
  toParticipationSummary(sales: any[]) {
    if (sales.length === 0) return null;

    const sortedSales = [...sales].sort((left, right) =>
      left.ticketNumber.localeCompare(right.ticketNumber, "es-MX", { numeric: true }),
    );
    const first = sortedSales[0];
    const statuses = Array.from(new Set(sortedSales.map((sale) => sale.paymentStatus)));
    const subtotal = Number(first.raffle.ticketPrice) * sortedSales.length;
    const discountTotal = Number(first.discountTotal || 0);

    return {
      id: first.reservationId || `sale-${first.id}`,
      recordType: "PARTICIPATION",
      reservationId: first.reservationId,
      raffleId: first.raffleId,
      raffleTitle: first.raffle.title,
      raffleImage: first.raffle.image,
      raffleOpportunities: first.raffle.opportunities,
      customerName: first.customerName,
      customerPhone: first.customerPhone,
      customerState: first.customerState,
      ticketNumbers: sortedSales.map((sale) => sale.ticketNumber),
      ticketCount: sortedSales.length,
      ticketPrice: Number(first.raffle.ticketPrice),
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal,
      total: Number((subtotal - discountTotal).toFixed(2)),
      couponCode: first.couponCode,
      paymentMethod: first.paymentMethod || "TRANSFER",
      mpPaymentId: first.mpPaymentId,
      mpSellerUserId: first.mpSellerUserId,
      mpPaymentStatus: first.mpPaymentStatus,
      mpPaymentStatusDetail: first.mpPaymentStatusDetail,
      mpPaymentMethodId: first.mpPaymentMethodId,
      mpPaymentTypeId: first.mpPaymentTypeId,
      mpPaidAmount: first.mpPaidAmount == null ? null : Number(first.mpPaidAmount),
      mpRefundId: first.mpRefundId,
      mpRefundedAmount:
        first.mpRefundedAmount == null ? null : Number(first.mpRefundedAmount),
      mpRefundedAt: first.mpRefundedAt,
      status: statuses.length === 1 ? statuses[0] : "MIXED",
      createdAt: first.createdAt,
      ticketSaleIds: sortedSales.map((sale) => sale.id),
    };
  },

  toPaymentHoldSummary(hold: any) {
    const ticketNumbers = Array.from(new Set([
      ...(Array.isArray(hold.ticketNumbers) ? hold.ticketNumbers : []),
      ...(hold.tickets || []).map((ticket: any) => ticket.ticketNumber),
    ])).sort((left: string, right: string) =>
      left.localeCompare(right, "es-MX", { numeric: true }),
    );
    const hasTicketSnapshot = ticketNumbers.length > 0;
    const subtotal = Number(hold.raffle.ticketPrice) * ticketNumbers.length;
    const discountTotal = hasTicketSnapshot ? Number(hold.discountTotal || 0) : 0;
    const latestAttempt = hold.paymentAttempts?.[0] || null;

    return {
      id: `hold-${hold.id}`,
      recordType: "PAYMENT_HOLD",
      reservationId: null,
      paymentHoldId: hold.id,
      raffleId: hold.raffleId,
      raffleTitle: hold.raffle.title,
      raffleImage: hold.raffle.image,
      raffleOpportunities: hold.raffle.opportunities,
      customerName: hold.customerName,
      customerPhone: hold.customerPhone,
      customerState: hold.customerState,
      ticketNumbers,
      ticketCount: ticketNumbers.length,
      hasTicketSnapshot,
      ticketPrice: Number(hold.raffle.ticketPrice),
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal,
      total: Number((subtotal - discountTotal).toFixed(2)),
      couponCode: hold.couponCode,
      paymentMethod: "MERCADOPAGO",
      mpPaymentId: hold.mpPaymentId || latestAttempt?.mpPaymentId || null,
      mpSellerUserId: hold.mpSellerUserId,
      mpPaymentStatus: hold.mpPaymentStatus || latestAttempt?.status?.toLowerCase() || null,
      mpPaymentStatusDetail: hold.mpPaymentStatusDetail || latestAttempt?.statusDetail || null,
      mpPaymentMethodId: null,
      mpPaymentTypeId: null,
      mpPaidAmount: null,
      status: toPaymentHoldAdminStatus(hold),
      holdStatus: hold.status,
      expiresAt: hold.expiresAt,
      createdAt: hold.createdAt,
      updatedAt: hold.updatedAt,
      ticketSaleIds: [],
      paymentAttempts: (hold.paymentAttempts || []).map((attempt: any) => ({
        id: attempt.id,
        status: attempt.status,
        statusDetail: attempt.statusDetail,
        mpPaymentId: attempt.mpPaymentId,
        retryable: attempt.retryable,
        uncertain: attempt.uncertain,
        customerMessage: attempt.customerMessage,
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt,
      })),
    };
  },

  async getAllParticipationsAdmin(prisma: PrismaClient) {
    const [sales, paymentHolds] = await Promise.all([
      prisma.ticketSale.findMany({
        include: {
          raffle: {
            select: {
              id: true,
              title: true,
              image: true,
              ticketPrice: true,
              opportunities: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rafflePaymentHold.findMany({
        where: { promotedReservationId: null },
        include: {
          raffle: {
            select: {
              id: true,
              title: true,
              image: true,
              ticketPrice: true,
              opportunities: true,
            },
          },
          tickets: { select: { ticketNumber: true } },
          paymentAttempts: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const groups = new Map<string, any[]>();
    for (const sale of sales) {
      const key = sale.reservationId || `sale-${sale.id}`;
      groups.set(key, [...(groups.get(key) || []), sale]);
    }

    const participations = Array.from(groups.values())
      .map((group) => this.toParticipationSummary(group))
      .filter(Boolean);
    const attempts = paymentHolds.map((hold) => this.toPaymentHoldSummary(hold));

    return [...participations, ...attempts]
      .sort((left: any, right: any) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
  },

  async getParticipationAdmin(prisma: PrismaClient, participationKey: string) {
    const holdMatch = /^hold-([0-9a-f-]{36})$/i.exec(participationKey);
    if (holdMatch) {
      const hold = await prisma.rafflePaymentHold.findUnique({
        where: { id: holdMatch[1] },
        include: {
          raffle: { include: { extraOpportunities: true } },
          tickets: { select: { ticketNumber: true } },
          paymentAttempts: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!hold || hold.promotedReservationId) return null;

      const summary = this.toPaymentHoldSummary(hold);
      const opportunityMap = new Map(
        (hold.raffle.extraOpportunities || []).map((entry: any) => [
          entry.mainTicketNumber,
          Array.isArray(entry.extraOpportunities) ? entry.extraOpportunities : [],
        ]),
      );
      return {
        ...summary,
        tickets: summary.ticketNumbers.map((number: string, index: number) => ({
          id: -(index + 1),
          number,
          opportunities: opportunityMap.get(number) || [],
        })),
      };
    }

    const legacyMatch = /^sale-(\d+)$/.exec(participationKey);
    const sales = await prisma.ticketSale.findMany({
      where: legacyMatch
        ? { id: Number(legacyMatch[1]) }
        : { reservationId: participationKey },
      include: {
        raffle: {
          include: { extraOpportunities: true },
        },
      },
      orderBy: { ticketNumber: "asc" },
    });

    const summary = this.toParticipationSummary(sales);
    if (!summary) return null;

    const opportunityMap = new Map(
      (sales[0].raffle.extraOpportunities || []).map((entry: any) => [
        entry.mainTicketNumber,
        Array.isArray(entry.extraOpportunities) ? entry.extraOpportunities : [],
      ]),
    );

    return {
      ...summary,
      tickets: sales.map((sale) => ({
        id: sale.id,
        number: sale.ticketNumber,
        opportunities: opportunityMap.get(sale.ticketNumber) || [],
      })),
    };
  },

  async updateParticipationStatus(
    prisma: PrismaClient,
    participationKey: string,
    paymentStatus: "PAID" | "CANCELLED",
  ) {
    const legacyMatch = /^sale-(\d+)$/.exec(participationKey);
    const where = legacyMatch
      ? { id: Number(legacyMatch[1]), paymentStatus: TicketStatus.PENDING }
      : { reservationId: participationKey, paymentStatus: TicketStatus.PENDING };
    const sales = await prisma.ticketSale.findMany({ where });
    if (sales.length === 0) return null;

    if (paymentStatus === "PAID" && sales[0].paymentMethod === "MERCADOPAGO") {
      throw new Error("MERCADOPAGO_PAYMENT_REQUIRES_WEBHOOK");
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticketSale.updateMany({
        where: { id: { in: sales.map((sale) => sale.id) } },
        data: { paymentStatus },
      });

      if (paymentStatus === "CANCELLED" && sales[0].couponId) {
        await tx.raffleCoupon.update({
          where: { id: sales[0].couponId },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });

    void publishTicketAvailabilityChanged(sales[0].raffleId).catch((error) => {
      console.error("[Raffle availability] Could not publish admin status change:", error);
    });

    if (paymentStatus === "PAID") {
      await whatsappQueue.add("reservation-paid", {
        kind: "reservation-paid",
        ticketSaleIds: sales.map((sale) => sale.id),
        recipientPhone: sales[0].customerPhone,
      });
    } else if (sales[0].paymentMethod !== "MERCADOPAGO") {
      await whatsappQueue.add("reservation-cancelled", {
        kind: "reservation-cancelled",
        ticketSaleIds: sales.map((sale) => sale.id),
        recipientPhone: sales[0].customerPhone,
      });
    }

    return this.getParticipationAdmin(prisma, participationKey);
  },

  async updateParticipationParticipant(
    prisma: PrismaClient,
    participationKey: string,
    data: {
      customerName: string;
      customerPhone: string;
      customerState?: string | null;
    },
  ) {
    const participant = {
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerState: data.customerState?.trim() || null,
    };
    const holdMatch = /^hold-([0-9a-f-]{36})$/i.exec(participationKey);

    if (holdMatch) {
      const hold = await prisma.rafflePaymentHold.findUnique({
        where: { id: holdMatch[1] },
        select: { id: true, promotedReservationId: true },
      });
      if (!hold || hold.promotedReservationId) return null;

      await prisma.rafflePaymentHold.update({
        where: { id: hold.id },
        data: participant,
      });
      return this.getParticipationAdmin(prisma, participationKey);
    }

    const legacyMatch = /^sale-(\d+)$/.exec(participationKey);
    const result = await prisma.ticketSale.updateMany({
      where: legacyMatch
        ? { id: Number(legacyMatch[1]) }
        : { reservationId: participationKey },
      data: participant,
    });
    if (result.count === 0) return null;

    return this.getParticipationAdmin(prisma, participationKey);
  },

  async reserveTickets(
    prisma: PrismaClient,
    storePrisma: StorePrismaClient,
    data: {
      raffleId: number;
      tickets: string[];
      customerName: string;
      customerPhone: string;
      customerState?: string | null;
      paymentMethod?: "TRANSFER" | "MERCADOPAGO";
      couponCode?: string | null;
      earlyAccessAuthorized?: boolean;
    }
  ) {
    const { raffleId, customerName, customerPhone, customerState } = data;
    const tickets = Array.from(new Set(data.tickets));
    const paymentMethod = data.paymentMethod === "MERCADOPAGO" ? "MERCADOPAGO" : "TRANSFER";
    const reservationId = randomUUID();

    let result: { reserved: string[]; subtotal: number; discountTotal: number; total: number; couponCode: string | null };
    try {
      result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(7421, ${raffleId}::integer)`);
      const raffle = await tx.raffle.findFirst({
        where: { id: raffleId, status: RaffleStatus.ACTIVE, published: true },
        select: {
          id: true,
          ticketPrice: true,
          status: true,
          published: true,
          participationStartsAt: true,
          participationEndsAt: true,
          earlyAccessEnabled: true,
        },
      });
      if (!raffle || !canParticipateInRaffle(raffle, data.earlyAccessAuthorized)) {
        throw new Error("RAFFLE_UNAVAILABLE");
      }

      // 0. Only the published main folios are reservable. Their linked
      // opportunities participate automatically with the selected folio.
      const validNumbers = await ticketService.getPrimaryTicketNumbers(tx, raffleId);
      const invalid = tickets.filter(t => !validNumbers.has(t));
      if (invalid.length > 0) throw new Error('INVALID_TICKET_NUMBERS');

      // 1. Get current reservations for these tickets in this raffle
      const existing = await tx.ticketSale.findMany({
        where: {
          raffleId,
          ticketNumber: { in: tickets },
          paymentStatus: { in: [TicketStatus.PENDING, TicketStatus.PAID] },
        },
        select: { ticketNumber: true },
      });

      const held = await tx.rafflePaymentHoldTicket.findMany({
        where: { raffleId, ticketNumber: { in: tickets } },
        select: { ticketNumber: true },
      });

      const takenTickets = Array.from(new Set([
        ...existing.map((entry) => entry.ticketNumber),
        ...held.map((entry) => entry.ticketNumber),
      ]));
      if (takenTickets.length > 0) throw new TicketAvailabilityConflictError(takenTickets);

      const couponResult = data.couponCode
        ? await raffleCouponService.validate(tx, {
          code: data.couponCode,
          raffle,
          ticketCount: tickets.length,
        })
        : null;

      if (couponResult) {
        await tx.raffleCoupon.update({
          where: { id: couponResult.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // 2. Insert reserved tickets
      await tx.ticketSale.createMany({
        data: tickets.map((ticketNumber) => ({
          raffleId,
          ticketNumber,
          customerName,
          customerPhone,
          customerState,
          reservationId,
          paymentMethod,
          paymentStatus: TicketStatus.PENDING,
          couponId: couponResult?.coupon.id ?? null,
          couponCode: couponResult?.code ?? null,
          discountTotal: couponResult?.discountTotal ?? 0,
        })),
      });

      const subtotal = Number(raffle.ticketPrice) * tickets.length;
      const discountTotal = couponResult?.discountTotal ?? 0;
      return {
        reserved: tickets,
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal,
        total: Number((subtotal - discountTotal).toFixed(2)),
        couponCode: couponResult?.code ?? null,
      };
      });
    } catch (error: any) {
      if (error instanceof TicketAvailabilityConflictError) throw error;

      // The partial unique index is the final authority under concurrent requests.
      if (error?.code === "P2002" || error?.code === "P2034") {
        const unavailable = await prisma.ticketSale.findMany({
          where: {
            raffleId,
            ticketNumber: { in: tickets },
            paymentStatus: { in: [TicketStatus.PENDING, TicketStatus.PAID] },
          },
          select: { ticketNumber: true },
        });
        throw new TicketAvailabilityConflictError(unavailable.map((entry) => entry.ticketNumber));
      }

      throw error;
    }

    // 3. Post-transaction actions
    void publishTicketAvailabilityChanged(raffleId).catch((error) => {
      console.error("[Raffle availability] Could not publish reservation change:", error);
    });
    const settings = await storePrisma.setting.findMany({
      where: { 
        key: {
          in: [
            "raffle_release_active",
            "raffle_release_hours",
            "raffle_reminder_active",
            "raffle_reminder_hours_before",
          ],
        }
      }
    });
    
    const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as any);
    
    const isReleaseActive = settingsMap["raffle_release_active"] === "1";
    const releaseHours = parseInt(settingsMap["raffle_release_hours"] || "24", 10);
    const isReminderActive = settingsMap["raffle_reminder_active"] === "1";
    const reminderHoursBefore = Number(settingsMap["raffle_reminder_hours_before"] || 4);

    let paymentExpiresAt: Date | null = null;

    // Send notification
    const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
    if (raffle) {
      const totalAmount = result.total.toFixed(2);
      
      // Fetch the created sales to get IDs
      const sales = await prisma.ticketSale.findMany({
        where: {
          raffleId,
          reservationId,
          paymentStatus: TicketStatus.PENDING,
        },
      });

      if (sales.length > 0) {
        const mpHoldSetting = paymentMethod === "MERCADOPAGO"
          ? await storePrisma.setting.findUnique({ where: { key: "mp_payment_hold_minutes" }, select: { value: true } })
          : null;
        const mpHoldMinutes = resolvePaymentHoldMinutes(mpHoldSetting?.value);
        const reservationDelayMs = paymentMethod === "MERCADOPAGO"
          ? mpHoldMinutes * 60 * 1000
          : releaseHours * 3600 * 1000;
        const expectedReleaseAt = new Date(Date.now() + reservationDelayMs);
        paymentExpiresAt = expectedReleaseAt;

        // Card holds always expire; manual reservations follow the raffle release setting.
        if (paymentMethod === "MERCADOPAGO" || isReleaseActive) {

          await ticketReleaseQueue.add(
            "release",
            { ticketSaleIds: sales.map(s => s.id) },
            { delay: reservationDelayMs }
          );

          const reminderDelay = getReminderDelayMs(releaseHours, reminderHoursBefore);
          if (paymentMethod === "TRANSFER" && isReminderActive && reminderDelay) {
            await reservationReminderQueue.add(
              "raffle-reminder",
              {
                kind: "raffle",
                ticketSaleIds: sales.map(s => s.id),
                expectedReleaseAt: expectedReleaseAt.toISOString(),
              },
              { delay: reminderDelay },
            );
          }
        }

        if (paymentMethod === "TRANSFER") {
          await whatsappQueue.add("reservation-notification", {
            kind: "reservation",
            ticketSaleIds: sales.map(s => s.id),
            recipientPhone: sales[0].customerPhone,
            timeLimit: `${releaseHours} horas`
          });
        }
      }

      // Fire and forget email notification
      raffleNotificationService.sendTicketReservationEmail(storePrisma, prisma, {
        raffleTitle: raffle.title,
        customerName,
        customerPhone,
        tickets: result.reserved,
        totalAmount,
      }).catch(console.error);
    }

    return {
      ...result,
      reservationId,
      paymentMethod,
      paymentExpiresAt: paymentExpiresAt?.toISOString() ?? null,
      rejected: [],
      partial: false,
    };
  },

  async getAllAdmin(
    prisma: PrismaClient,
    filters: {
      raffleId?: number;
      status?: TicketStatus;
      search?: string;
    }
  ) {
    const where: any = {};
    if (filters.raffleId) where.raffleId = filters.raffleId;
    if (filters.status) where.paymentStatus = filters.status;
    if (filters.search) {
      where.OR = [
        { customerName: { contains: filters.search } },
        { customerPhone: { contains: filters.search } },
        { ticketNumber: { contains: filters.search } },
      ];
    }

    return prisma.ticketSale.findMany({
      where,
      include: { raffle: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(prisma: PrismaClient, id: number) {
    return prisma.ticketSale.findUnique({
      where: { id },
      include: { raffle: true },
    });
  },

  async delete(prisma: PrismaClient, id: number) {
    const sale = await prisma.ticketSale.delete({
      where: { id },
    });
    void publishTicketAvailabilityChanged(sale.raffleId).catch((error) => {
      console.error("[Raffle availability] Could not publish deletion change:", error);
    });
    return sale;
  },
};
