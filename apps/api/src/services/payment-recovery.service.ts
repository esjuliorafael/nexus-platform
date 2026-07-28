import { createHash, randomBytes } from "node:crypto";
import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { whatsappQueue } from "../queues/whatsapp.queue";
import {
  getPaymentRecoveryDelayMs,
} from "./payment-recovery.config";
import { getPaymentRecoveryOperationalStatus } from "./payment-recovery-policy.service";

export type PaymentRecoveryKind = "store" | "raffle";

const hashToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

const createToken = () => randomBytes(32).toString("base64url");

const storefrontBaseUrl = () =>
  (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

const isRecoverableHold = (hold: {
  status: string;
  expiresAt: Date;
  mpPaymentStatus?: string | null;
  promotedOrderId?: number | null;
  promotedReservationId?: string | null;
}) =>
  hold.status === "ACTIVE" &&
  hold.expiresAt.getTime() > Date.now() &&
  hold.mpPaymentStatus === "rejected" &&
  !hold.promotedOrderId &&
  !hold.promotedReservationId;

export const paymentRecoveryService = {
  async schedule(kind: PaymentRecoveryKind, holdId: string) {
    const operationalStatus = await getPaymentRecoveryOperationalStatus();
    if (!operationalStatus.effective) return false;

    const token = createToken();
    const tokenHash = hashToken(token);
    const now = new Date();
    const database: any =
      kind === "store"
        ? storePrisma.storePaymentHold
        : rafflePrisma.rafflePaymentHold;

    const hold = await database.findUnique({ where: { id: holdId } } as never);
    if (
      !hold ||
      !isRecoverableHold(hold as any) ||
      (hold as any).recoveryScheduledAt ||
      (hold as any).recoverySentAt
    ) {
      return false;
    }

    const claimed = await database.updateMany({
      where: {
        id: holdId,
        status: "ACTIVE",
        expiresAt: { gt: now },
        mpPaymentStatus: "rejected",
        recoveryScheduledAt: null,
        recoverySentAt: null,
      },
      data: {
        recoveryTokenHash: tokenHash,
        recoveryScheduledAt: now,
      },
    } as never);
    if ((claimed as any).count !== 1) return false;

    const remainingMs = (hold as any).expiresAt.getTime() - Date.now();
    const delay = Math.min(
      getPaymentRecoveryDelayMs(),
      Math.max(0, remainingMs - 5_000),
    );
    const jobId = `payment-recovery-${kind}-${holdId}-${tokenHash.slice(0, 10)}`;

    try {
      await whatsappQueue.add(
        kind === "store"
          ? "store-payment-recovery"
          : "raffle-payment-recovery",
        {
          kind:
            kind === "store"
              ? "store-payment-recovery"
              : "raffle-payment-recovery",
          holdId,
          recoveryToken: token,
          recipientPhone: (hold as any).customerPhone,
        },
        { delay, jobId },
      );
      return true;
    } catch (error) {
      await database.updateMany({
        where: { id: holdId, recoveryTokenHash: tokenHash },
        data: {
          recoveryTokenHash: null,
          recoveryScheduledAt: null,
        },
      } as never);
      throw error;
    }
  },

  async cancelUnsentSchedule(kind: PaymentRecoveryKind, holdId: string) {
    const database: any =
      kind === "store"
        ? storePrisma.storePaymentHold
        : rafflePrisma.rafflePaymentHold;
    await database.updateMany({
      where: {
        id: holdId,
        status: "ACTIVE",
        recoverySentAt: null,
      },
      data: {
        recoveryTokenHash: null,
        recoveryScheduledAt: null,
      },
    } as never);
  },

  async getForDelivery(
    kind: PaymentRecoveryKind,
    holdId: string,
    token: string,
  ) {
    const tokenHash = hashToken(token);
    if (kind === "store") {
      const hold = await storePrisma.storePaymentHold.findUnique({
        where: { id: holdId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  purpose: true,
                },
              },
            },
          },
        },
      });
      return hold &&
        hold.recoveryTokenHash === tokenHash &&
        !hold.recoverySentAt &&
        isRecoverableHold(hold)
        ? hold
        : null;
    }

    const hold = await rafflePrisma.rafflePaymentHold.findUnique({
      where: { id: holdId },
      include: {
        raffle: { include: { extraOpportunities: true } },
        tickets: { orderBy: { ticketNumber: "asc" } },
      },
    });
    return hold &&
      hold.recoveryTokenHash === tokenHash &&
      !hold.recoverySentAt &&
      isRecoverableHold(hold)
      ? hold
      : null;
  },

  buildRecoveryUrl(kind: PaymentRecoveryKind, hold: any, token: string) {
    const route =
      kind === "store"
        ? "/checkout"
        : `/raffles/${hold.raffleId}/checkout`;
    return `${storefrontBaseUrl()}${route}#recovery=${encodeURIComponent(token)}`;
  },

  async markSent(kind: PaymentRecoveryKind, holdId: string) {
    const database: any =
      kind === "store"
        ? storePrisma.storePaymentHold
        : rafflePrisma.rafflePaymentHold;
    await database.updateMany({
      where: { id: holdId, recoverySentAt: null },
      data: { recoverySentAt: new Date() },
    } as never);
  },

  async resolve(token: string) {
    const tokenHash = hashToken(token);
    const storeHold = await storePrisma.storePaymentHold.findUnique({
      where: { recoveryTokenHash: tokenHash },
      include: {
        coupon: true,
        items: {
          include: {
            product: {
              include: { coverAsset: true },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (storeHold) {
      if (
        storeHold.status === "PROCESSING" ||
        ["processing", "pending", "in_process", "authorized"].includes(
          storeHold.mpPaymentStatus || "",
        )
      ) {
        return { status: "processing" as const };
      }
      if (!isRecoverableHold(storeHold)) return { status: "expired" as const };
      await storePrisma.storePaymentHold.update({
        where: { id: storeHold.id },
        data: { recoveryOpenedAt: new Date() },
      });
      return {
        status: "active" as const,
        kind: "store" as const,
        paymentHoldId: storeHold.id,
        expiresAt: storeHold.expiresAt.toISOString(),
        customer: {
          name: storeHold.customerName,
          phone: storeHold.customerPhone,
          email: storeHold.customerEmail,
          receiverName: storeHold.receiverName,
        },
        delivery: {
          type: storeHold.deliveryType,
          method: storeHold.deliveryMethod,
          address: storeHold.shippingAddress,
          street: storeHold.shippingStreet,
          neighborhood: storeHold.shippingNeighborhood,
          postalCode: storeHold.shippingPostalCode,
          city: storeHold.shippingCity,
          state: storeHold.shippingState,
        },
        totals: {
          subtotal: Number(storeHold.subtotal),
          discountTotal: Number(storeHold.discountTotal),
          shippingCost: Number(storeHold.shippingCost),
          total: Number(storeHold.total),
        },
        coupon: storeHold.coupon
          ? {
              code: storeHold.couponCode || storeHold.coupon.code,
              name: storeHold.coupon.name,
              discountType: storeHold.coupon.discountType,
              discountValue: Number(storeHold.coupon.discountValue),
              scope: storeHold.coupon.scope,
              discountTotal: Number(storeHold.discountTotal),
              eligibleSubtotal: Number(storeHold.subtotal),
            }
          : null,
        items: storeHold.items.map((item) => ({
          productId: item.productId,
          name: item.productName,
          price: Number(item.unitPrice),
          quantity: item.quantity,
          type: item.productType === "BIRD" ? "bird" : "item",
          thumbnail:
            item.product.coverAsset?.posterUrl ||
            item.product.coverAsset?.mediaUrl ||
            null,
        })),
      };
    }

    const raffleHold = await rafflePrisma.rafflePaymentHold.findUnique({
      where: { recoveryTokenHash: tokenHash },
      include: {
        coupon: true,
        raffle: true,
        tickets: { orderBy: { ticketNumber: "asc" } },
      },
    });
    if (!raffleHold) return { status: "missing" as const };
    if (
      raffleHold.status === "PROCESSING" ||
      ["processing", "pending", "in_process", "authorized"].includes(
        raffleHold.mpPaymentStatus || "",
      )
    ) {
      return { status: "processing" as const };
    }
    if (!isRecoverableHold(raffleHold)) return { status: "expired" as const };

    await rafflePrisma.rafflePaymentHold.update({
      where: { id: raffleHold.id },
      data: { recoveryOpenedAt: new Date() },
    });
    return {
      status: "active" as const,
      kind: "raffle" as const,
      raffleId: raffleHold.raffleId,
      paymentHoldId: raffleHold.id,
      expiresAt: raffleHold.expiresAt.toISOString(),
      customer: {
        name: raffleHold.customerName,
        phone: raffleHold.customerPhone,
        state: raffleHold.customerState,
      },
      totals: {
        discountTotal: Number(raffleHold.discountTotal),
      },
      coupon: raffleHold.coupon
        ? {
            code: raffleHold.couponCode || raffleHold.coupon.code,
            name: raffleHold.coupon.name,
            discountType: raffleHold.coupon.discountType,
            discountValue: Number(raffleHold.coupon.discountValue),
            subtotal:
              Number(raffleHold.raffle.ticketPrice) *
              raffleHold.tickets.length,
            discountTotal: Number(raffleHold.discountTotal),
            total: Math.max(
              0,
              Number(raffleHold.raffle.ticketPrice) *
                raffleHold.tickets.length -
                Number(raffleHold.discountTotal),
            ),
          }
        : null,
      tickets: raffleHold.tickets.map((ticket) => ticket.ticketNumber),
    };
  },
};
