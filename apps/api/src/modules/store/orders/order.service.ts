import { storePrisma } from "@nexus/db/store";
import { OrderStatus } from "@prisma/client-store";
import { orderReleaseQueue } from "../../../queues/order-release.queue";
import { getReminderDelayMs, reservationReminderQueue } from "../../../queues/reservation-reminder.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { OrderKind, OrderItemPurpose } from "../../../services/evolution/channel.resolver";
import { validateCouponForItems } from "../coupons/coupon.service";

const createOrderError = (message: string, statusCode = 400) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
};

const resolveOrderKindFromProducts = (
  products: Array<{ type: string; purpose: string | null }>,
): OrderKind => {
  const birds = products.filter((product) => product.type === "BIRD");
  const hasItems = products.some((product) => product.type === "ITEM");

  if (birds.length > 0 && !hasItems) {
    const firstPurpose = birds[0].purpose as OrderItemPurpose;
    return {
      type: "birds_only",
      purpose: birds.every((bird) => bird.purpose === firstPurpose)
        ? firstPurpose
        : null,
    };
  }

  if (birds.length === 0 && hasItems) return { type: "articles_only" };

  return { type: "mixed" };
};

export const orderService = {
  async getAll(status: OrderStatus | undefined, userId: number) {
    const orders = await storePrisma.order.findMany({
      where: status ? { status } : {},
      include: {
        items: true,
        reads: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map(({ reads, ...order }) => ({
      ...order,
      isRead: reads.length > 0,
      readAt: reads[0]?.readAt ?? null,
    }));
  },

  async markRead(ids: number[], userId: number) {
    const orders = await storePrisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (orders.length === 0) return { count: 0 };

    const result = await storePrisma.orderRead.createMany({
      data: orders.map((order) => ({ orderId: order.id, userId })),
      skipDuplicates: true,
    });

    return { count: result.count };
  },

  async getById(id: number) {
    return storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  },

  async getWhatsappLogs(id: number) {
    return storePrisma.whatsappMessageLog.findMany({
      where: { orderId: id.toString() },
      orderBy: { sentAt: "desc" },
      take: 25,
    });
  },

  async updateCustomer(
    id: number,
    data: { customerName: string; customerPhone: string; shippingState?: string | null },
  ) {
    const order = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    const nextState = data.shippingState?.trim() || null;
    let shippingCost = Number(order.shippingCost);
    let total = Number(order.total);

    if (order.deliveryType === "SHIPPING") {
      if (nextState) {
        const settings = await storePrisma.setting.findMany();
        const settingsMap = settings.reduce((acc: Record<string, string>, setting) => {
          acc[setting.key] = setting.value || "";
          return acc;
        }, {});
        const shippingZone = await storePrisma.shippingZone.findFirst({
          where: { name: nextState, active: true },
        });
        const costBaseKey = shippingZone?.zoneType === "EXTENDED"
          ? "shipping_cost_extended"
          : "shipping_cost_standard";
        shippingCost = Number(settingsMap[costBaseKey] || 0);
      } else {
        shippingCost = 0;
      }

      total = Math.max(0, Number(order.subtotal) + shippingCost - Number((order as any).discountTotal || 0));
    }

    return storePrisma.order.update({
      where: { id },
      data: {
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        shippingState: nextState,
        shippingCost,
        total,
      },
      include: { items: true },
    });
  },

  async create(data: any) {
    const settings = await storePrisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const productIds = data.items.map((i: any) => i.productId);
    const products = await storePrisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new Error("Some products were not found");
    }

    // Check availability
    for (const product of products) {
      if (product.saleStatus !== "AVAILABLE" || !product.active) {
        throw new Error(`Product ${product.name} is not available`);
      }
    }

    // Calculate costs
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      subtotal += Number(product.price) * item.quantity;
      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        productType: product.type,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    let shippingCost = 0;
    if (data.deliveryType === "SHIPPING") {
      const shippingZone = await storePrisma.shippingZone.findFirst({
        where: { name: data.shippingState },
      });

      const hasBirds = products.some((product) => product.type === "BIRD");
      const hasItems = products.some((product) => product.type === "ITEM");
      const freeBirds = settingsMap["shipping_free_threshold_birds"] === "1";
      const freeItems = settingsMap["shipping_free_threshold_items"] === "1";

      if (hasBirds && !freeBirds) {
        const costBaseKey = shippingZone?.zoneType === "EXTENDED"
          ? "shipping_cost_extended"
          : "shipping_cost_standard";
        shippingCost += Number(settingsMap[costBaseKey] || 0);
      }

      if (hasItems && !freeItems) {
        shippingCost += Number(settingsMap["shipping_base_cost_items"] || 0);
      }
    }

    const couponResult = data.couponCode
      ? await validateCouponForItems(data.couponCode, data.items)
      : null;
    const discountTotal = couponResult?.discountTotal || 0;
    const total = Math.max(0, subtotal + shippingCost - discountTotal);

    const paymentMethod = data.paymentMethod === "MERCADOPAGO" ? "MERCADOPAGO" : "TRANSFER";
    const isMercadoPagoOrder = paymentMethod === "MERCADOPAGO";
    const isReleaseActive = settingsMap["inventory_release_active"] === "1";
    const releaseHours = Number(settingsMap["inventory_release_hours"] || 24);
    const isReminderActive = settingsMap["inventory_reminder_active"] === "1";
    const reminderHoursBefore = Number(settingsMap["inventory_reminder_hours_before"] || 4);
    const mpHoldMinutes = Math.max(5, Number(settingsMap["mp_payment_hold_minutes"] || 30));
    const expiresAt = isMercadoPagoOrder
      ? new Date(Date.now() + mpHoldMinutes * 60 * 1000)
      : isReleaseActive
        ? new Date(Date.now() + releaseHours * 3600 * 1000)
        : null;

    const order = await storePrisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          receiverName: data.receiverName || null,
          deliveryMethod: data.deliveryMethod || null,
          shippingAddress: data.shippingAddress,
          shippingStreet: data.shippingStreet || null,
          shippingNeighborhood: data.shippingNeighborhood || null,
          shippingPostalCode: data.shippingPostalCode || null,
          shippingCity: data.shippingCity || null,
          shippingState: data.shippingState,
          deliveryType: data.deliveryType,
          subtotal,
          discountTotal,
          shippingCost,
          total,
          couponId: couponResult?.coupon.id || null,
          couponCode: couponResult?.code || null,
          status: "PENDING",
          paymentMethod,
          paymentStatus: "PENDING",
          paymentExpiresAt: isMercadoPagoOrder ? expiresAt : null,
          expiresAt,
          items: {
            create: orderItemsData,
          },
        },
      });

      // Reserve inventory
      for (const item of orderItemsData) {
        if (item.productType === "BIRD") {
          await tx.product.update({
            where: { id: item.productId },
            data: { saleStatus: "RESERVED" },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      if (couponResult) {
        await tx.coupon.update({
          where: { id: couponResult.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // Schedule auto-release. Mercado Pago uses a short silent hold while the customer pays.
    if (isMercadoPagoOrder && expiresAt) {
      await orderReleaseQueue.add(
        "release",
        { orderId: order.id },
        { delay: mpHoldMinutes * 60 * 1000 }
      );
    } else if (isReleaseActive) {
      await orderReleaseQueue.add(
        "release",
        { orderId: order.id },
        { delay: releaseHours * 3600 * 1000 }
      );

      const reminderDelay = getReminderDelayMs(releaseHours, reminderHoursBefore);
      if (isReminderActive && reminderDelay && expiresAt) {
        await reservationReminderQueue.add(
          "order-reminder",
          { kind: "order", orderId: order.id, expectedExpiresAt: expiresAt.toISOString() },
          { delay: reminderDelay },
        );
      }
    }

    // Enqueue WhatsApp notification
    const birds = products.filter((p) => p.type === "BIRD");
    const hasItems = products.some((p) => p.type === "ITEM");

    let orderKind: OrderKind = { type: "mixed" };
    if (birds.length > 0 && !hasItems) {
      const firstPurpose = birds[0].purpose as OrderItemPurpose;
      const allSamePurpose = birds.every((b) => b.purpose === firstPurpose);
      orderKind = {
        type: "birds_only",
        purpose: allSamePurpose ? firstPurpose : null,
      };
    } else if (birds.length === 0 && hasItems) {
      orderKind = { type: "articles_only" };
    }

    if (!isMercadoPagoOrder) {
      await whatsappQueue.add("order-notification", {
        kind: "order",
        orderId: order.id.toString(),
        recipientPhone: order.customerPhone,
        orderKind,
        timeLimit: `${releaseHours} horas`
      });
    }

    return order;
  },

  async updateStatus(id: number, status: OrderStatus) {
    const currentOrder = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!currentOrder) throw new Error("Order not found");

    const order = await storePrisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status,
          ...(status === "PAID"
            ? { paymentStatus: "APPROVED", paymentExpiresAt: null, expiresAt: null }
            : {}),
          ...(status === "CANCELLED"
            ? { paymentStatus: "CANCELLED", paymentExpiresAt: null }
            : {}),
        },
        include: { items: true }
      });

      if (status === 'PAID') {
        for (const item of updatedOrder.items) {
          if (item.productType === 'BIRD') {
            await tx.product.update({
              where: { id: item.productId },
              data: { saleStatus: 'SOLD' }
            });
          }
          // Items' stock was already decremented at order creation.
        }

        await tx.orderEvent.create({
          data: {
            orderId: id,
            eventType: "PAYMENT_CONFIRMED",
            message: "Pago confirmado desde Admin.",
          },
        });
      }

      return updatedOrder;
    });

    if (status === 'PAID') {
      console.log(`[Order] Order #${id} marked as PAID. Triggering WhatsApp...`);
      
      // Determine Order Kind for WhatsApp
      const products = await storePrisma.product.findMany({
        where: { id: { in: order.items.map(i => i.productId) } }
      });
      const birds = products.filter(p => p.type === 'BIRD');
      const hasItems = products.some(p => p.type === 'ITEM');

      let orderKind: OrderKind = { type: "mixed" };
      if (birds.length > 0 && !hasItems) {
        const firstPurpose = birds[0].purpose as OrderItemPurpose;
        orderKind = { type: "birds_only", purpose: birds.every(b => b.purpose === firstPurpose) ? firstPurpose : null };
      } else if (birds.length === 0 && hasItems) {
        orderKind = { type: "articles_only" };
      }

      await whatsappQueue.add("order-paid", {
        kind: "order-paid",
        orderId: order.id.toString(),
        recipientPhone: order.customerPhone,
        orderKind
      });
    }

    return order;
  },

  async cancelOrder(id: number) {
    const order = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    const cancelledOrder = await storePrisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          paymentExpiresAt: null,
        },
        include: { items: true },
      });

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
          orderId: id,
          eventType: "CANCELLED",
          message: "Orden cancelada y disponibilidad liberada.",
        },
      });

      return cancelledOrder;
    });

    const products = await storePrisma.product.findMany({
      where: { id: { in: order.items.map((item) => item.productId) } },
    });
    const birds = products.filter((product) => product.type === "BIRD");
    const hasItems = products.some((product) => product.type === "ITEM");

    let orderKind: OrderKind = { type: "mixed" };
    if (birds.length > 0 && !hasItems) {
      const firstPurpose = birds[0].purpose as OrderItemPurpose;
      orderKind = {
        type: "birds_only",
        purpose: birds.every((bird) => bird.purpose === firstPurpose)
          ? firstPurpose
          : null,
      };
    } else if (birds.length === 0 && hasItems) {
      orderKind = { type: "articles_only" };
    }

    if (cancelledOrder.paymentMethod !== "MERCADOPAGO") {
      await whatsappQueue.add("order-cancelled", {
        kind: "order-cancelled",
        orderId: cancelledOrder.id.toString(),
        recipientPhone: cancelledOrder.customerPhone,
        orderKind,
      });
    }

    return cancelledOrder;
  },

  async cancelPaymentAttempt(id: number, paymentStatus: "FAILED" | "EXPIRED" = "FAILED") {
    const order = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return null;
    if (order.paymentMethod !== "MERCADOPAGO" || order.status !== "PENDING") return order;

    return storePrisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          paymentStatus,
          paymentExpiresAt: null,
        },
        include: { items: true },
      });

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
          orderId: id,
          eventType: paymentStatus === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED",
          message: paymentStatus === "EXPIRED"
            ? "Intento de pago con tarjeta expirado. Inventario liberado."
            : "Intento de pago con tarjeta no completado. Inventario liberado.",
        },
      });

      return cancelledOrder;
    });
  },

  async restoreOrder(id: number) {
    const settings = await storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            "inventory_release_active",
            "inventory_release_hours",
            "inventory_reminder_active",
            "inventory_reminder_hours_before",
          ],
        },
      },
    });
    const settingsMap = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value || "";
      return acc;
    }, {});

    const isReleaseActive = settingsMap["inventory_release_active"] === "1";
    const releaseHours = Number(settingsMap["inventory_release_hours"] || 24);
    const isReminderActive = settingsMap["inventory_reminder_active"] === "1";
    const reminderHoursBefore = Number(settingsMap["inventory_reminder_hours_before"] || 4);
    const expiresAt = isReleaseActive
      ? new Date(Date.now() + releaseHours * 3600 * 1000)
      : null;

    const restoredOrder = await storePrisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) throw createOrderError("Order not found", 404);
      if (order.status !== "CANCELLED") {
        throw createOrderError("Solo se pueden restaurar órdenes canceladas.", 409);
      }

      for (const item of order.items) {
        if (item.productType === "BIRD") {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              active: true,
              published: true,
              saleStatus: "AVAILABLE",
            },
            data: { saleStatus: "RESERVED" },
          });

          if (result.count !== 1) {
            throw createOrderError(
              `No se puede restaurar la orden porque el producto "${item.productName || item.productId}" ya no está disponible.`,
              409,
            );
          }
        } else {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              active: true,
              published: true,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });

          if (result.count !== 1) {
            throw createOrderError(
              `No se puede restaurar la orden porque no hay stock suficiente de "${item.productName || item.productId}".`,
              409,
            );
          }
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "PENDING",
          paymentMethod: "TRANSFER",
          paymentStatus: "PENDING",
          paymentExpiresAt: null,
          expiresAt,
        },
        include: { items: true },
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          eventType: "RESTORED",
          message: isReleaseActive
            ? `Orden restaurada desde Admin con nuevo límite de ${releaseHours} horas.`
            : "Orden restaurada desde Admin sin liberación automática activa.",
        },
      });

      return updatedOrder;
    });

    if (isReleaseActive) {
      await orderReleaseQueue.add(
        "release",
        { orderId: restoredOrder.id },
        { delay: releaseHours * 3600 * 1000 },
      );

      const reminderDelay = getReminderDelayMs(releaseHours, reminderHoursBefore);
      if (isReminderActive && reminderDelay && expiresAt) {
        await reservationReminderQueue.add(
          "order-reminder",
          {
            kind: "order",
            orderId: restoredOrder.id,
            expectedExpiresAt: expiresAt.toISOString(),
          },
          { delay: reminderDelay },
        );
      }
    }

    const products = await storePrisma.product.findMany({
      where: { id: { in: restoredOrder.items.map((item) => item.productId) } },
    });

    await whatsappQueue.add("order-restored", {
      kind: "order-restored",
      orderId: restoredOrder.id.toString(),
      recipientPhone: restoredOrder.customerPhone,
      orderKind: resolveOrderKindFromProducts(products),
      timeLimit: `${releaseHours} horas`,
    });

    return restoredOrder;
  },

  async resendNotification(id: number) {
    const order = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    const settings = await storePrisma.setting.findMany({
      where: { key: "inventory_release_hours" }
    });
    const releaseHours = Number(settings[0]?.value || 24);

    const birds = order.items.filter((i) => i.productType === "BIRD");
    const hasItems = order.items.some((i) => i.productType === "ITEM");

    let orderKind: OrderKind = { type: "mixed" };
    if (birds.length > 0 && !hasItems) {
      // Simplification: just assume first bird purpose for resend
      const firstProduct = await storePrisma.product.findUnique({ where: { id: birds[0].productId } });
      orderKind = {
        type: "birds_only",
        purpose: firstProduct?.purpose as OrderItemPurpose,
      };
    } else if (birds.length === 0 && hasItems) {
      orderKind = { type: "articles_only" };
    }

    await whatsappQueue.add("order-notification", {
      kind:
        order.status === "PAID"
          ? "order-paid"
          : order.status === "CANCELLED"
            ? "order-cancelled"
            : "order",
      orderId: order.id.toString(),
      recipientPhone: order.customerPhone,
      orderKind,
      timeLimit: `${releaseHours} horas`
    });

    return { success: true };
  },
};
