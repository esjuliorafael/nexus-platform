import { storePrisma } from "@nexus/db/store";
import { whatsappQueue } from "../queues/whatsapp.queue";
import type { OrderKind } from "./evolution/channel.resolver";

type ExpirableOrder = NonNullable<Awaited<ReturnType<typeof getExpirableOrder>>>;

const getExpirableOrder = (orderId: number) =>
  storePrisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

const resolveOrderKind = (order: ExpirableOrder): OrderKind => {
  const products = order.items.map((item) => item.product);
  const birds = products.filter((product) => product.type === "BIRD");
  const hasItems = products.some((product) => product.type === "ITEM");

  if (birds.length > 0 && !hasItems) {
    const firstPurpose = birds[0].purpose as any;
    return {
      type: "birds_only",
      purpose: birds.every((bird) => bird.purpose === firstPurpose) ? firstPurpose : null,
    };
  }

  if (birds.length === 0 && hasItems) return { type: "articles_only" };

  return { type: "mixed" };
};

export const expirePendingOrder = async (orderId: number) => {
  let order = await getExpirableOrder(orderId);

  if (
    !order ||
    order.status !== "PENDING" ||
    !order.expiresAt ||
    order.expiresAt.getTime() > Date.now()
  ) {
    return null;
  }

  if (order.paymentMethod === "MERCADOPAGO" && order.mpPaymentId) {
    const paymentId = order.mpPaymentId;
    try {
      const { mpService } = await import("../modules/store/payments/mercadopago.service");
      await mpService.reconcilePayment(paymentId, order.mpSellerUserId);
      order = await getExpirableOrder(orderId);
      if (!order || order.status !== "PENDING") return null;
    } catch (error) {
      console.error(`[Order expiration] Could not reconcile Mercado Pago payment ${paymentId}:`, error);
      return null;
    }
  }

  const expiredOrder = await storePrisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "PENDING",
        expiresAt: { lte: new Date() },
      },
      data: {
        status: "CANCELLED",
        paymentStatus: order.paymentMethod === "MERCADOPAGO" ? "EXPIRED" : "CANCELLED",
        paymentExpiresAt: null,
      },
    });

    if (updated.count !== 1) return null;

    for (const item of order.items) {
      if (item.productType === "BIRD") {
        await tx.product.update({
          where: { id: item.productId },
          data: { saleStatus: "AVAILABLE" },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId,
        eventType: "AUTO_CANCELLED",
        message:
          order.paymentMethod === "MERCADOPAGO"
            ? "Intento de pago con tarjeta expirado. Inventario liberado sin notificacion de apartado."
            : "Orden cancelada automaticamente por vencimiento del tiempo limite.",
      },
    });

    return order;
  });

  if (!expiredOrder) return null;

  if (expiredOrder.paymentMethod !== "MERCADOPAGO") {
    await whatsappQueue.add("order-cancelled", {
      kind: "order-cancelled",
      orderId: expiredOrder.id.toString(),
      recipientPhone: expiredOrder.customerPhone,
      orderKind: resolveOrderKind(expiredOrder),
    });
  }

  return expiredOrder;
};

export const expireOverduePendingOrders = async (limit = 100) => {
  const orders = await storePrisma.order.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  let expired = 0;
  for (const order of orders) {
    const result = await expirePendingOrder(order.id);
    if (result) expired += 1;
  }

  return { scanned: orders.length, expired };
};
