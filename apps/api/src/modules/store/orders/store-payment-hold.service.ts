import { Prisma, ProductType } from "@prisma/client-store";
import { storePrisma } from "@nexus/db/store";
import { paymentHoldReleaseQueue } from "../../../queues/payment-hold-release.queue";
import { orderReleaseQueue } from "../../../queues/order-release.queue";
import {
  getOrderReminderJobId,
  getReminderDelayMs,
  reservationReminderQueue,
} from "../../../queues/reservation-reminder.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { OrderItemPurpose, OrderKind } from "../../../services/evolution/channel.resolver";
import { validateCouponForItems } from "../coupons/coupon.service";
import {
  hasReachedPaymentProcessingLimit,
  canConvertPaymentHoldToTransfer,
  isPaymentHoldAmbiguous,
  PAYMENT_RECONCILIATION_INTERVAL_MS,
  resolvePaymentHoldMinutes,
} from "../payments/payment-hold-policy";

const holdError = (message: string, statusCode = 400, code?: string) =>
  Object.assign(new Error(message), { statusCode, code });

const normalizePhone = (phone: string | null | undefined) =>
  String(phone || "").replace(/\D/g, "");

const ensureStoreHoldCanConvert = async (holdId: string, customerPhone: string) => {
  let hold = await storePrisma.storePaymentHold.findUnique({ where: { id: holdId } });
  if (!hold || normalizePhone(hold.customerPhone) !== normalizePhone(customerPhone)) {
    throw holdError("No fue posible validar la retención de inventario.", 404);
  }
  if (hold.status === "CONSUMED") return hold;
  if (["EXPIRED", "CANCELLED"].includes(hold.status) || hold.expiresAt.getTime() <= Date.now()) {
    throw holdError("La retención de inventario ya no está disponible.", 409, "PAYMENT_HOLD_UNAVAILABLE");
  }

  if (isPaymentHoldAmbiguous(hold)) {
    try {
      const { mpService } = await import("../payments/mercadopago.service");
      if (hold.mpPaymentId) {
        await mpService.reconcilePayment(hold.mpPaymentId, hold.mpSellerUserId);
      } else {
        await mpService.reconcilePaymentReference(`store_hold_${hold.id}`, hold.mpSellerUserId);
      }
    } catch {
      throw holdError(
        "No pudimos verificar el intento con Mercado Pago. El inventario permanece protegido; intenta nuevamente en unos minutos.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }
  }

  hold = await storePrisma.storePaymentHold.findUnique({ where: { id: holdId } });
  if (!hold) throw holdError("La retención de inventario no existe.", 404);
  if (hold.status === "CONSUMED") return hold;

  if (isPaymentHoldAmbiguous(hold)) {
    if (!hold.mpPaymentId) {
      throw holdError(
        "Mercado Pago todavía está verificando el intento. Espera un momento antes de cambiar a transferencia.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }

    const { mpService } = await import("../payments/mercadopago.service");
    try {
      await mpService.cancelPendingPayment(hold.mpPaymentId, hold.mpSellerUserId);
      await mpService.reconcilePayment(hold.mpPaymentId, hold.mpSellerUserId);
    } catch {
      throw holdError(
        "No pudimos confirmar la cancelación del intento con tarjeta. El inventario permanece protegido; intenta nuevamente en unos minutos.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }

    hold = await storePrisma.storePaymentHold.findUnique({ where: { id: holdId } });
    if (!hold) throw holdError("La retención de inventario no existe.", 404);
    if (hold.status === "CONSUMED") return hold;
    if (isPaymentHoldAmbiguous(hold)) {
      throw holdError(
        "Mercado Pago todavía no confirma la cancelación. El inventario permanece protegido.",
        409,
        "PAYMENT_REQUIRES_RESOLUTION",
      );
    }
  }

  return hold;
};

const scheduleStoreReconciliation = async (holdId: string) => {
  const expiresAt = new Date(Date.now() + PAYMENT_RECONCILIATION_INTERVAL_MS);
  await storePrisma.storePaymentHold.update({ where: { id: holdId }, data: { expiresAt } });
  await paymentHoldReleaseQueue.add(
    "store-hold",
    { kind: "store", holdId },
    { delay: PAYMENT_RECONCILIATION_INTERVAL_MS },
  );
};

const resolveOrderKind = (products: Array<{ type: string; purpose: string | null }>): OrderKind => {
  const birds = products.filter((product) => product.type === "BIRD");
  const hasItems = products.some((product) => product.type === "ITEM");
  if (birds.length && !hasItems) {
    const purpose = birds[0].purpose as OrderItemPurpose;
    return { type: "birds_only", purpose: birds.every((bird) => bird.purpose === purpose) ? purpose : null };
  }
  return birds.length === 0 && hasItems ? { type: "articles_only" } : { type: "mixed" };
};

export const storePaymentHoldService = {
  async create(data: any) {
    const [settings, products] = await Promise.all([
      storePrisma.setting.findMany(),
      storePrisma.product.findMany({ where: { id: { in: data.items.map((item: any) => item.productId) } } }),
    ]);
    const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value || ""]));
    if (products.length !== new Set(data.items.map((item: any) => item.productId)).size) {
      throw holdError("Uno o más productos no existen.", 404);
    }

    const items = data.items.map((item: any) => {
      const product = products.find((candidate) => candidate.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        productType: product.type,
        quantity: item.quantity,
        unitPrice: product.price,
      };
    });
    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.unitPrice) * item.quantity, 0);
    let shippingCost = 0;
    if (data.deliveryType === "SHIPPING") {
      const zone = await storePrisma.shippingZone.findFirst({ where: { name: data.shippingState } });
      const hasBirds = products.some((product) => product.type === "BIRD");
      const hasItems = products.some((product) => product.type === "ITEM");
      if (hasBirds && settingsMap.shipping_free_threshold_birds !== "1") {
        shippingCost += Number(settingsMap[zone?.zoneType === "EXTENDED" ? "shipping_cost_extended" : "shipping_cost_standard"] || 0);
      }
      if (hasItems && settingsMap.shipping_free_threshold_items !== "1") {
        shippingCost += Number(settingsMap.shipping_base_cost_items || 0);
      }
    }

    const couponResult = data.couponCode ? await validateCouponForItems(data.couponCode, data.items) : null;
    const discountTotal = couponResult?.discountTotal || 0;
    const total = Math.max(0, subtotal + shippingCost - discountTotal);
    const holdMinutes = resolvePaymentHoldMinutes(settingsMap.mp_payment_hold_minutes);
    const expiresAt = new Date(Date.now() + holdMinutes * 60_000);

    const hold = await storePrisma.$transaction(async (tx) => {
      const created = await tx.storePaymentHold.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || null,
          receiverName: data.receiverName || null,
          deliveryMethod: data.deliveryMethod || null,
          shippingAddress: data.shippingAddress || null,
          shippingStreet: data.shippingStreet || null,
          shippingNeighborhood: data.shippingNeighborhood || null,
          shippingPostalCode: data.shippingPostalCode || null,
          shippingCity: data.shippingCity || null,
          shippingState: data.shippingState || null,
          deliveryType: data.deliveryType,
          subtotal,
          discountTotal,
          shippingCost,
          total,
          couponId: couponResult?.coupon.id || null,
          couponCode: couponResult?.code || null,
          expiresAt,
          items: { create: items },
        },
      });

      for (const item of items) {
        if (item.productType === ProductType.BIRD) {
          const result = await tx.product.updateMany({
            where: { id: item.productId, active: true, saleStatus: "AVAILABLE" },
            data: { saleStatus: "RESERVED" },
          });
          if (result.count !== 1) throw holdError(`El producto "${item.productName}" ya no está disponible.`, 409);
        } else {
          const result = await tx.product.updateMany({
            where: { id: item.productId, active: true, saleStatus: "AVAILABLE", stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count !== 1) throw holdError(`No hay existencias suficientes de "${item.productName}".`, 409);
        }
      }
      if (couponResult) {
        await tx.coupon.update({ where: { id: couponResult.coupon.id }, data: { usedCount: { increment: 1 } } });
      }
      return created;
    });

    await paymentHoldReleaseQueue.add("store-hold", { kind: "store", holdId: hold.id }, { delay: holdMinutes * 60_000 });
    return { paymentHoldId: hold.id, expiresAt: hold.expiresAt.toISOString(), total: Number(hold.total) };
  },

  async convertToTransfer(holdId: string, customerPhone: string) {
    await ensureStoreHoldCanConvert(holdId, customerPhone);

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
    const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value || ""]));
    const releaseActive = settingsMap.inventory_release_active === "1";
    const releaseHours = Number(settingsMap.inventory_release_hours || 24);
    const reminderActive = settingsMap.inventory_reminder_active === "1";
    const reminderHoursBefore = Number(settingsMap.inventory_reminder_hours_before || 4);
    const expiresAt = releaseActive ? new Date(Date.now() + releaseHours * 3_600_000) : null;

    const converted = await storePrisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM store_payment_holds WHERE id = ${holdId}::uuid FOR UPDATE`);
      const hold = await tx.storePaymentHold.findUnique({ where: { id: holdId }, include: { items: true } });
      if (!hold || normalizePhone(hold.customerPhone) !== normalizePhone(customerPhone)) {
        throw holdError("No fue posible validar la retención de inventario.", 404);
      }
      if (hold.promotedOrderId) {
        const order = await tx.order.findUnique({ where: { id: hold.promotedOrderId }, include: { items: true } });
        if (!order) throw holdError("La orden promovida no existe.", 409);
        return { order, created: false, products: [] as Array<{ type: string; purpose: string | null }> };
      }
      if (!canConvertPaymentHoldToTransfer(hold)) {
        throw holdError(
          "El intento con tarjeta todavía requiere una resolución antes de cambiar a transferencia.",
          409,
          "PAYMENT_REQUIRES_RESOLUTION",
        );
      }

      const order = await tx.order.create({
        data: {
          customerName: hold.customerName,
          customerPhone: hold.customerPhone,
          customerEmail: hold.customerEmail,
          receiverName: hold.receiverName,
          deliveryMethod: hold.deliveryMethod,
          shippingAddress: hold.shippingAddress,
          shippingStreet: hold.shippingStreet,
          shippingNeighborhood: hold.shippingNeighborhood,
          shippingPostalCode: hold.shippingPostalCode,
          shippingCity: hold.shippingCity,
          shippingState: hold.shippingState,
          deliveryType: hold.deliveryType,
          subtotal: hold.subtotal,
          discountTotal: hold.discountTotal,
          shippingCost: hold.shippingCost,
          total: hold.total,
          couponId: hold.couponId,
          couponCode: hold.couponCode,
          status: "PENDING",
          paymentMethod: "TRANSFER",
          paymentStatus: "PENDING",
          expiresAt,
          paymentExpiresAt: null,
          items: {
            create: hold.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productType: item.productType,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
          events: {
            create: {
              eventType: "PAYMENT_METHOD_CHANGED",
              message: "El cliente cambió el intento con tarjeta a depósito o transferencia.",
            },
          },
        },
        include: { items: true },
      });
      await tx.storePaymentHold.update({
        where: { id: holdId },
        data: {
          status: "CONSUMED",
          promotedOrderId: order.id,
          mpPaymentStatus: "converted_to_transfer",
          mpPaymentStatusDetail: "payment_method_changed",
          ...(expiresAt ? { expiresAt } : {}),
        },
      });
      await tx.orderPaymentAttempt.updateMany({
        where: { holdId },
        data: {
          orderId: order.id,
          status: "CANCELLED",
          retryable: false,
          uncertain: false,
          customerMessage: "El método de pago cambió a depósito o transferencia.",
        },
      });
      const products = await tx.product.findMany({
        where: { id: { in: hold.items.map((item) => item.productId) } },
        select: { type: true, purpose: true },
      });
      return { order, created: true, products };
    });

    if (converted.created) {
      if (releaseActive && expiresAt) {
        await orderReleaseQueue.add("release", { orderId: converted.order.id }, { delay: releaseHours * 3_600_000 });
        const reminderDelay = getReminderDelayMs(releaseHours, reminderHoursBefore);
        if (reminderActive && reminderDelay) {
          await reservationReminderQueue.add(
            "order-reminder",
            { kind: "order", orderId: converted.order.id, expectedExpiresAt: expiresAt.toISOString() },
            { delay: reminderDelay, jobId: getOrderReminderJobId(converted.order.id, expiresAt) },
          );
        }
      }
      await whatsappQueue.add("order-notification", {
        kind: "order",
        orderId: converted.order.id.toString(),
        recipientPhone: converted.order.customerPhone,
        orderKind: resolveOrderKind(converted.products),
        timeLimit: `${releaseHours} horas`,
      });
    }

    return converted.order;
  },

  async promote(holdId: string, payment: any, sellerUserId?: string | null) {
    const result = await storePrisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM store_payment_holds WHERE id = ${holdId}::uuid FOR UPDATE`);
      const hold = await tx.storePaymentHold.findUnique({ where: { id: holdId }, include: { items: true } });
      if (!hold) throw holdError("La retención de inventario no existe.", 404);
      if (hold.promotedOrderId) return { orderId: hold.promotedOrderId, customerPhone: hold.customerPhone, products: [] as any[] };
      if (!['ACTIVE', 'PROCESSING'].includes(hold.status)) throw holdError("La retención ya no está disponible.", 409);

      const order = await tx.order.create({
        data: {
          customerName: hold.customerName,
          customerPhone: hold.customerPhone,
          customerEmail: hold.customerEmail,
          receiverName: hold.receiverName,
          deliveryMethod: hold.deliveryMethod,
          shippingAddress: hold.shippingAddress,
          shippingStreet: hold.shippingStreet,
          shippingNeighborhood: hold.shippingNeighborhood,
          shippingPostalCode: hold.shippingPostalCode,
          shippingCity: hold.shippingCity,
          shippingState: hold.shippingState,
          deliveryType: hold.deliveryType,
          subtotal: hold.subtotal,
          discountTotal: hold.discountTotal,
          shippingCost: hold.shippingCost,
          total: hold.total,
          couponId: hold.couponId,
          couponCode: hold.couponCode,
          status: "PAID",
          paymentMethod: "MERCADOPAGO",
          paymentStatus: "APPROVED",
          mpPaymentId: String(payment.id),
          mpSellerUserId: sellerUserId || payment.collector_id?.toString() || null,
          mpPaymentStatus: payment.status,
          mpPaymentStatusDetail: payment.status_detail || null,
          mpPaymentMethodId: payment.payment_method_id || null,
          mpPaymentTypeId: payment.payment_type_id || null,
          mpPaidAmount: Number(payment.transaction_amount),
          items: { create: hold.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productType: item.productType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })) },
          events: { create: { eventType: "PAYMENT_CONFIRMED", message: "Pago con tarjeta confirmado por Mercado Pago." } },
        },
        include: { items: true },
      });
      const birdIds = hold.items.filter((item) => item.productType === "BIRD").map((item) => item.productId);
      if (birdIds.length) await tx.product.updateMany({ where: { id: { in: birdIds } }, data: { saleStatus: "SOLD" } });
      await tx.storePaymentHold.update({
        where: { id: holdId },
        data: { status: "CONSUMED", promotedOrderId: order.id, mpPaymentId: String(payment.id), mpPaymentStatus: payment.status },
      });
      await tx.orderPaymentAttempt.updateMany({
        where: { holdId },
        data: { orderId: order.id },
      });
      return { orderId: order.id, customerPhone: hold.customerPhone, products: await tx.product.findMany({ where: { id: { in: hold.items.map((item) => item.productId) } } }) };
    });

    if (result.products.length) {
      await whatsappQueue.add("order-paid", {
        kind: "order-paid",
        orderId: String(result.orderId),
        recipientPhone: result.customerPhone,
        orderKind: resolveOrderKind(result.products),
      });
    }
    return result.orderId;
  },

  async expire(holdId: string) {
    const hold = await storePrisma.storePaymentHold.findUnique({ where: { id: holdId }, include: { items: true } });
    if (!hold || !['ACTIVE', 'PROCESSING'].includes(hold.status) || hold.expiresAt.getTime() > Date.now()) return null;
    const requiresReconciliation =
      hold.status === "PROCESSING" ||
      !hold.mpPaymentStatus ||
      ['pending', 'in_process', 'authorized', 'approved'].includes(hold.mpPaymentStatus);
    try {
      if (hold.mpPaymentId && requiresReconciliation) {
        const { mpService } = await import("../payments/mercadopago.service");
        await mpService.reconcilePayment(hold.mpPaymentId, hold.mpSellerUserId);
      } else if (hold.status === "PROCESSING") {
        const { mpService } = await import("../payments/mercadopago.service");
        await mpService.reconcilePaymentReference(`store_hold_${hold.id}`, hold.mpSellerUserId);
      }
    } catch (error) {
      console.error(`[MP] Falló la conciliación de la retención de tienda ${holdId}.`, error);
      await scheduleStoreReconciliation(holdId);
      return null;
    }
    let reconciled = await storePrisma.storePaymentHold.findUnique({ where: { id: holdId } });
    if (
      reconciled &&
      reconciled.mpPaymentId &&
      ['ACTIVE', 'PROCESSING'].includes(reconciled.status) &&
      ['pending', 'in_process', 'authorized'].includes(reconciled.mpPaymentStatus || '')
    ) {
      if (hasReachedPaymentProcessingLimit(reconciled.createdAt)) {
        const { mpService } = await import("../payments/mercadopago.service");
        try {
          await mpService.cancelPendingPayment(reconciled.mpPaymentId, reconciled.mpSellerUserId);
        } catch (error) {
          console.error(`[MP] No fue posible cancelar la retención de tienda ${holdId}.`, error);
        }
        try {
          await mpService.reconcilePayment(reconciled.mpPaymentId, reconciled.mpSellerUserId);
        } catch (error) {
          console.error(`[MP] Falló la conciliación posterior a la cancelación de tienda ${holdId}.`, error);
          await scheduleStoreReconciliation(holdId);
          return null;
        }
        reconciled = await storePrisma.storePaymentHold.findUnique({ where: { id: holdId } });
      }

      if (
        reconciled &&
        ['ACTIVE', 'PROCESSING'].includes(reconciled.status) &&
        ['pending', 'in_process', 'authorized'].includes(reconciled.mpPaymentStatus || '')
      ) {
        await scheduleStoreReconciliation(holdId);
        return null;
      }
    }

    if (reconciled?.status === "CONSUMED") return null;
    return storePrisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM store_payment_holds WHERE id = ${holdId}::uuid FOR UPDATE`);
      const current = await tx.storePaymentHold.findUnique({ where: { id: holdId }, include: { items: true } });
      if (!current || !['ACTIVE', 'PROCESSING'].includes(current.status) || current.expiresAt.getTime() > Date.now()) return null;
      for (const item of current.items) {
        if (item.productType === "BIRD") await tx.product.update({ where: { id: item.productId }, data: { saleStatus: "AVAILABLE" } });
        else await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      if (current.couponId) await tx.coupon.update({ where: { id: current.couponId }, data: { usedCount: { decrement: 1 } } });
      return tx.storePaymentHold.update({ where: { id: holdId }, data: { status: "EXPIRED" } });
    });
  },
};
