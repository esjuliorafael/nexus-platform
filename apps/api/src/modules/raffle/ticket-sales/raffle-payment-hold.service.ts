import { Prisma, PrismaClient, RaffleStatus, TicketStatus } from "@prisma/client-raffle";
import { randomUUID } from "crypto";
import { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { paymentHoldReleaseQueue } from "../../../queues/payment-hold-release.queue";
import { getReminderDelayMs, reservationReminderQueue } from "../../../queues/reservation-reminder.queue";
import { ticketReleaseQueue } from "../../../queues/ticket-release.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { customerPhoneIdentity } from "../../../utils/customer-phone";
import { canParticipateInRaffle } from "../raffles/raffle-access";
import { raffleCouponService } from "../coupons/raffle-coupon.service";
import { ticketService } from "../tickets/ticket.service";
import { publishTicketAvailabilityChanged } from "./ticket-availability.events";
import { TicketAvailabilityConflictError } from "./ticket-sale.service";
import { raffleNotificationService } from "../notifications/raffle-notification.service";
import {
  hasReachedPaymentProcessingLimit,
  canConvertPaymentHoldToTransfer,
  isPaymentHoldAmbiguous,
  PAYMENT_RECONCILIATION_INTERVAL_MS,
  resolvePaymentHoldMinutes,
} from "../../store/payments/payment-hold-policy";

const scheduleRaffleReconciliation = async (prisma: PrismaClient, holdId: string) => {
  const expiresAt = new Date(Date.now() + PAYMENT_RECONCILIATION_INTERVAL_MS);
  await prisma.rafflePaymentHold.update({ where: { id: holdId }, data: { expiresAt } });
  await paymentHoldReleaseQueue.add(
    "raffle-hold",
    { kind: "raffle", holdId },
    { delay: PAYMENT_RECONCILIATION_INTERVAL_MS },
  );
};

const holdError = (message: string, statusCode = 400, code?: string) =>
  Object.assign(new Error(message), { statusCode, code });

const normalizePhone = customerPhoneIdentity;

const ensureRaffleHoldCanConvert = async (
  prisma: PrismaClient,
  raffleId: number,
  holdId: string,
  customerPhone: string,
) => {
  let hold = await prisma.rafflePaymentHold.findUnique({ where: { id: holdId } });
  if (
    !hold
    || hold.raffleId !== raffleId
    || normalizePhone(hold.customerPhone) !== normalizePhone(customerPhone)
  ) {
    throw holdError("No fue posible validar la retención de boletos.", 404);
  }
  if (hold.status === "CONSUMED") return hold;
  if (["EXPIRED", "CANCELLED"].includes(hold.status) || hold.expiresAt.getTime() <= Date.now()) {
    throw holdError("La retención de boletos ya no está disponible.", 409, "PAYMENT_HOLD_UNAVAILABLE");
  }

  if (isPaymentHoldAmbiguous(hold)) {
    try {
      const { mpService } = await import("../../store/payments/mercadopago.service");
      if (hold.mpPaymentId) {
        await mpService.reconcilePayment(hold.mpPaymentId, hold.mpSellerUserId);
      } else {
        await mpService.reconcilePaymentReference(`raffle_hold_${raffleId}_${hold.id}`, hold.mpSellerUserId);
      }
    } catch {
      throw holdError(
        "No pudimos verificar el intento con Mercado Pago. Los boletos permanecen protegidos; intenta nuevamente en unos minutos.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }
  }

  hold = await prisma.rafflePaymentHold.findUnique({ where: { id: holdId } });
  if (!hold) throw holdError("La retención de boletos no existe.", 404);
  if (hold.status === "CONSUMED") return hold;

  if (isPaymentHoldAmbiguous(hold)) {
    if (!hold.mpPaymentId) {
      throw holdError(
        "Mercado Pago todavía está verificando el intento. Espera un momento antes de cambiar a transferencia.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }

    const { mpService } = await import("../../store/payments/mercadopago.service");
    try {
      await mpService.cancelPendingPayment(hold.mpPaymentId, hold.mpSellerUserId);
      await mpService.reconcilePayment(hold.mpPaymentId, hold.mpSellerUserId);
    } catch {
      throw holdError(
        "No pudimos confirmar la cancelación del intento con tarjeta. Los boletos permanecen protegidos; intenta nuevamente en unos minutos.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }

    hold = await prisma.rafflePaymentHold.findUnique({ where: { id: holdId } });
    if (!hold) throw holdError("La retención de boletos no existe.", 404);
    if (hold.status === "CONSUMED") return hold;
    if (isPaymentHoldAmbiguous(hold)) {
      throw holdError(
        "Mercado Pago todavía no confirma la cancelación. Los boletos permanecen protegidos.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }
  }

  return hold;
};

export const rafflePaymentHoldService = {
  async create(
    prisma: PrismaClient,
    storePrisma: StorePrismaClient,
    data: {
      raffleId: number;
      tickets: string[];
      customerName: string;
      customerPhone: string;
      customerState?: string | null;
      couponCode?: string | null;
      earlyAccessAuthorized?: boolean;
    },
  ) {
    const tickets = Array.from(new Set(data.tickets));
    const holdSetting = await storePrisma.setting.findUnique({ where: { key: "mp_payment_hold_minutes" } });
    const holdMinutes = resolvePaymentHoldMinutes(holdSetting?.value);
    const expiresAt = new Date(Date.now() + holdMinutes * 60_000);

    const hold = await prisma.$transaction(async (tx) => {
      // Serializes checkout claims per raffle so TicketSale and PaymentHold cannot race.
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(7421, ${data.raffleId}::integer)`);
      const raffle = await tx.raffle.findFirst({
        where: { id: data.raffleId, status: RaffleStatus.ACTIVE, published: true },
        select: { id: true, ticketPrice: true, status: true, published: true, participationStartsAt: true, participationEndsAt: true, earlyAccessEnabled: true },
      });
      if (!raffle || !canParticipateInRaffle(raffle, data.earlyAccessAuthorized)) throw new Error("RAFFLE_UNAVAILABLE");

      const validNumbers = await ticketService.getPrimaryTicketNumbers(tx, data.raffleId);
      if (tickets.some((ticket) => !validNumbers.has(ticket))) throw new Error("INVALID_TICKET_NUMBERS");
      const [sales, held] = await Promise.all([
        tx.ticketSale.findMany({
          where: { raffleId: data.raffleId, ticketNumber: { in: tickets }, paymentStatus: { in: [TicketStatus.PENDING, TicketStatus.PAID] } },
          select: { ticketNumber: true },
        }),
        tx.rafflePaymentHoldTicket.findMany({
          where: { raffleId: data.raffleId, ticketNumber: { in: tickets } },
          select: { ticketNumber: true },
        }),
      ]);
      const unavailable = Array.from(new Set([...sales, ...held].map((entry) => entry.ticketNumber)));
      if (unavailable.length) throw new TicketAvailabilityConflictError(unavailable);

      const couponResult = data.couponCode
        ? await raffleCouponService.validate(tx, { code: data.couponCode, raffle, ticketCount: tickets.length })
        : null;
      if (couponResult) {
        await tx.raffleCoupon.update({ where: { id: couponResult.coupon.id }, data: { usedCount: { increment: 1 } } });
      }
      return tx.rafflePaymentHold.create({
        data: {
          raffleId: data.raffleId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerState: data.customerState || null,
          couponId: couponResult?.coupon.id || null,
          couponCode: couponResult?.code || null,
          discountTotal: couponResult?.discountTotal || 0,
          ticketNumbers: tickets,
          expiresAt,
          tickets: { create: tickets.map((ticketNumber) => ({ raffleId: data.raffleId, ticketNumber })) },
        },
        include: { raffle: true, tickets: true },
      });
    });

    await paymentHoldReleaseQueue.add("raffle-hold", { kind: "raffle", holdId: hold.id }, { delay: holdMinutes * 60_000 });
    void publishTicketAvailabilityChanged(data.raffleId).catch(() => undefined);
    const subtotal = Number(hold.raffle.ticketPrice) * hold.tickets.length;
    return {
      paymentHoldId: hold.id,
      expiresAt: hold.expiresAt.toISOString(),
      subtotal,
      discountTotal: Number(hold.discountTotal),
      total: Math.max(0, subtotal - Number(hold.discountTotal)),
      tickets: hold.tickets.map((ticket) => ticket.ticketNumber),
    };
  },

  async convertToTransfer(
    prisma: PrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    holdId: string,
    customerPhone: string,
  ) {
    await ensureRaffleHoldCanConvert(prisma, raffleId, holdId, customerPhone);

    const settings = await storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            "raffle_release_active",
            "raffle_release_hours",
            "raffle_reminder_active",
            "raffle_reminder_hours_before",
          ],
        },
      },
    });
    const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value || ""]));
    const releaseActive = settingsMap.raffle_release_active === "1";
    const releaseHours = Number(settingsMap.raffle_release_hours || 24);
    const reminderActive = settingsMap.raffle_reminder_active === "1";
    const reminderHoursBefore = Number(settingsMap.raffle_reminder_hours_before || 4);
    const expiresAt = releaseActive ? new Date(Date.now() + releaseHours * 3_600_000) : null;

    const converted = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(7421, ${raffleId}::integer)`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM raffle_payment_holds WHERE id = ${holdId}::uuid FOR UPDATE`);
      const hold = await tx.rafflePaymentHold.findUnique({
        where: { id: holdId },
        include: { raffle: true, tickets: true },
      });
      if (
        !hold
        || hold.raffleId !== raffleId
        || normalizePhone(hold.customerPhone) !== normalizePhone(customerPhone)
      ) {
        throw holdError("No fue posible validar la retención de boletos.", 404);
      }
      if (hold.promotedReservationId) {
        const sales = await tx.ticketSale.findMany({
          where: { reservationId: hold.promotedReservationId },
          orderBy: { ticketNumber: "asc" },
        });
        if (!sales.length) throw holdError("La participación promovida no existe.", 409);
        return { hold, reservationId: hold.promotedReservationId, sales, created: false };
      }
      if (!canConvertPaymentHoldToTransfer(hold)) {
        throw holdError(
          "El intento con tarjeta todavía requiere una resolución antes de cambiar a transferencia.",
          409,
          "PAYMENT_REQUIRES_RESOLUTION",
        );
      }

      const reservationId = randomUUID();
      await tx.ticketSale.createMany({
        data: hold.tickets.map((ticket) => ({
          raffleId: hold.raffleId,
          ticketNumber: ticket.ticketNumber,
          customerName: hold.customerName,
          customerPhone: hold.customerPhone,
          customerState: hold.customerState,
          reservationId,
          paymentMethod: "TRANSFER",
          paymentStatus: TicketStatus.PENDING,
          couponId: hold.couponId,
          couponCode: hold.couponCode,
          discountTotal: hold.discountTotal,
        })),
      });
      await tx.rafflePaymentHoldTicket.deleteMany({ where: { holdId } });
      await tx.rafflePaymentHold.update({
        where: { id: holdId },
        data: {
          status: "CONSUMED",
          promotedReservationId: reservationId,
          mpPaymentStatus: "converted_to_transfer",
          mpPaymentStatusDetail: "payment_method_changed",
          ...(expiresAt ? { expiresAt } : {}),
        },
      });
      await tx.rafflePaymentAttempt.updateMany({
        where: { holdId },
        data: {
          reservationId,
          status: "CANCELLED",
          retryable: false,
          uncertain: false,
          customerMessage: "El método de pago cambió a depósito o transferencia.",
        },
      });
      const sales = await tx.ticketSale.findMany({ where: { reservationId }, orderBy: { ticketNumber: "asc" } });
      return { hold, reservationId, sales, created: true };
    });

    if (converted.created && converted.sales.length) {
      const saleIds = converted.sales.map((sale) => sale.id);
      if (releaseActive && expiresAt) {
        await ticketReleaseQueue.add("release", { ticketSaleIds: saleIds }, { delay: releaseHours * 3_600_000 });
        const reminderDelay = getReminderDelayMs(releaseHours, reminderHoursBefore);
        if (reminderActive && reminderDelay) {
          await reservationReminderQueue.add(
            "raffle-reminder",
            { kind: "raffle", ticketSaleIds: saleIds, expectedReleaseAt: expiresAt.toISOString() },
            { delay: reminderDelay },
          );
        }
      }
      await whatsappQueue.add("reservation-notification", {
        kind: "reservation",
        ticketSaleIds: saleIds,
        recipientPhone: converted.hold.customerPhone,
        timeLimit: `${releaseHours} horas`,
      });
      void raffleNotificationService.sendTicketReservationEmail(storePrisma, prisma, {
        raffleTitle: converted.hold.raffle.title,
        customerName: converted.hold.customerName,
        customerPhone: converted.hold.customerPhone,
        tickets: converted.sales.map((sale) => sale.ticketNumber),
        totalAmount: (
          Number(converted.hold.raffle.ticketPrice) * converted.sales.length
          - Number(converted.hold.discountTotal)
        ).toFixed(2),
      }).catch(console.error);
      void publishTicketAvailabilityChanged(raffleId).catch(() => undefined);
    }

    const subtotal = Number(converted.hold.raffle.ticketPrice) * converted.sales.length;
    const paymentStatus = converted.sales.some((sale) => sale.paymentStatus === TicketStatus.PAID)
      ? TicketStatus.PAID
      : TicketStatus.PENDING;
    return {
      reserved: converted.sales.map((sale) => sale.ticketNumber),
      reservationId: converted.reservationId,
      paymentExpiresAt: paymentStatus === TicketStatus.PENDING ? expiresAt?.toISOString() ?? null : null,
      paymentMethod: converted.sales[0]?.paymentMethod || "TRANSFER",
      paymentStatus,
      subtotal,
      discountTotal: Number(converted.hold.discountTotal),
      total: Math.max(0, subtotal - Number(converted.hold.discountTotal)),
      couponCode: converted.hold.couponCode,
      rejected: [],
      partial: false,
    };
  },

  async promote(prisma: PrismaClient, holdId: string, payment: any, sellerUserId?: string | null) {
    const promoted = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM raffle_payment_holds WHERE id = ${holdId}::uuid FOR UPDATE`);
      const hold = await tx.rafflePaymentHold.findUnique({ where: { id: holdId }, include: { tickets: true } });
      if (!hold) throw Object.assign(new Error("La retención de boletos no existe."), { statusCode: 404 });
      if (hold.promotedReservationId) {
        const existing = await tx.ticketSale.findMany({ where: { reservationId: hold.promotedReservationId } });
        return { reservationId: hold.promotedReservationId, sales: existing, created: false };
      }
      if (!['ACTIVE', 'PROCESSING'].includes(hold.status)) throw Object.assign(new Error("La retención ya no está disponible."), { statusCode: 409 });

      const reservationId = randomUUID();
      await tx.ticketSale.createMany({
        data: hold.tickets.map((ticket) => ({
          raffleId: hold.raffleId,
          ticketNumber: ticket.ticketNumber,
          customerName: hold.customerName,
          customerPhone: hold.customerPhone,
          customerState: hold.customerState,
          reservationId,
          paymentMethod: "MERCADOPAGO",
          paymentStatus: TicketStatus.PAID,
          couponId: hold.couponId,
          couponCode: hold.couponCode,
          discountTotal: hold.discountTotal,
          mpPaymentId: String(payment.id),
          mpSellerUserId: sellerUserId || payment.collector_id?.toString() || null,
          mpPaymentStatus: payment.status,
          mpPaymentStatusDetail: payment.status_detail || null,
          mpPaymentMethodId: payment.payment_method_id || null,
          mpPaymentTypeId: payment.payment_type_id || null,
          mpPaidAmount: Number(payment.transaction_amount),
        })),
      });
      await tx.rafflePaymentHoldTicket.deleteMany({ where: { holdId } });
      await tx.rafflePaymentHold.update({
        where: { id: holdId },
        data: { status: "CONSUMED", promotedReservationId: reservationId, mpPaymentId: String(payment.id), mpPaymentStatus: payment.status },
      });
      return { reservationId, sales: await tx.ticketSale.findMany({ where: { reservationId } }), created: true };
    });

    if (promoted.created && promoted.sales.length) {
      void publishTicketAvailabilityChanged(promoted.sales[0].raffleId).catch(() => undefined);
      await whatsappQueue.add("reservation-paid", {
        kind: "reservation-paid",
        ticketSaleIds: promoted.sales.map((sale) => sale.id),
        recipientPhone: promoted.sales[0].customerPhone,
      });
    }
    return promoted.reservationId;
  },

  async expire(prisma: PrismaClient, holdId: string) {
    const hold = await prisma.rafflePaymentHold.findUnique({ where: { id: holdId } });
    if (!hold || !['ACTIVE', 'PROCESSING'].includes(hold.status) || hold.expiresAt.getTime() > Date.now()) return null;
    const requiresReconciliation =
      hold.status === "PROCESSING" ||
      !hold.mpPaymentStatus ||
      ['pending', 'in_process', 'authorized', 'approved'].includes(hold.mpPaymentStatus);
    try {
      if (hold.mpPaymentId && requiresReconciliation) {
        const { mpService } = await import("../../store/payments/mercadopago.service");
        await mpService.reconcilePayment(hold.mpPaymentId, hold.mpSellerUserId);
      } else if (hold.status === "PROCESSING") {
        const { mpService } = await import("../../store/payments/mercadopago.service");
        await mpService.reconcilePaymentReference(`raffle_hold_${hold.raffleId}_${hold.id}`, hold.mpSellerUserId);
      }
    } catch (error) {
      console.error(`[MP] Falló la conciliación de la retención de rifa ${holdId}.`, error);
      await scheduleRaffleReconciliation(prisma, holdId);
      return null;
    }
    let reconciled = await prisma.rafflePaymentHold.findUnique({ where: { id: holdId } });
    if (
      reconciled &&
      reconciled.mpPaymentId &&
      ['ACTIVE', 'PROCESSING'].includes(reconciled.status) &&
      ['pending', 'in_process', 'authorized'].includes(reconciled.mpPaymentStatus || '')
    ) {
      if (hasReachedPaymentProcessingLimit(reconciled.createdAt)) {
        const { mpService } = await import("../../store/payments/mercadopago.service");
        try {
          await mpService.cancelPendingPayment(reconciled.mpPaymentId, reconciled.mpSellerUserId);
        } catch (error) {
          console.error(`[MP] No fue posible cancelar la retención de rifa ${holdId}.`, error);
        }
        try {
          await mpService.reconcilePayment(reconciled.mpPaymentId, reconciled.mpSellerUserId);
        } catch (error) {
          console.error(`[MP] Falló la conciliación posterior a la cancelación de rifa ${holdId}.`, error);
          await scheduleRaffleReconciliation(prisma, holdId);
          return null;
        }
        reconciled = await prisma.rafflePaymentHold.findUnique({ where: { id: holdId } });
      }

      if (
        reconciled &&
        ['ACTIVE', 'PROCESSING'].includes(reconciled.status) &&
        ['pending', 'in_process', 'authorized'].includes(reconciled.mpPaymentStatus || '')
      ) {
        await scheduleRaffleReconciliation(prisma, holdId);
        return null;
      }
    }
    if (reconciled?.status === "CONSUMED") return null;
    const expired = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM raffle_payment_holds WHERE id = ${holdId}::uuid FOR UPDATE`);
      const current = await tx.rafflePaymentHold.findUnique({ where: { id: holdId } });
      if (!current || !['ACTIVE', 'PROCESSING'].includes(current.status) || current.expiresAt.getTime() > Date.now()) return null;
      await tx.rafflePaymentHoldTicket.deleteMany({ where: { holdId } });
      if (current.couponId) await tx.raffleCoupon.update({ where: { id: current.couponId }, data: { usedCount: { decrement: 1 } } });
      return tx.rafflePaymentHold.update({ where: { id: holdId }, data: { status: "EXPIRED" } });
    });
    if (expired) void publishTicketAvailabilityChanged(expired.raffleId).catch(() => undefined);
    return expired;
  },
};
