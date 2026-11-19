import { OrderStatus } from "@prisma/client-store";
import type { PrismaClient } from "@prisma/client-store";
import { auditActorData, type AuditActor } from "../../../utils/admin-authorization";

export type ReplacePaidBirdOrderItemInput = {
  sourceProductId: number;
  replacementProductId: number;
  reason: string;
  customerAuthorized: true;
  deliveryConfirmed: true;
  expectedCurrentTotal?: number;
  expectedNewTotal?: number;
  expectedNewSubtotal?: number;
  expectedNewDiscount?: number;
  expectedPaidAmount?: number;
};

type CouponTermsSnapshot = {
  code: string;
  discountType: string;
  discountValue: string;
  scope: string;
  birdPurpose: string | null;
  minSubtotal: string | null;
  maxDiscount: string | null;
};

type ReplacementContext = {
  order: any;
  sourceItem: any;
  sourceProduct: any;
  replacementProduct: any;
  couponSnapshot: CouponTermsSnapshot | null;
  mode: "UNPAID_TRANSFER" | "PARTIALLY_PAID_TRANSFER" | "PAID";
  paidAmountCents: number;
  quote: ReplacementQuote;
};

export type ReplacementQuote = {
  paymentMethod: string;
  paymentStatus: string;
  couponCode: string | null;
  currentSubtotal: number;
  newSubtotal: number;
  currentDiscount: number;
  newDiscount: number;
  shippingCost: number;
  currentTotal: number;
  newTotal: number;
  paidAmount: number;
  balanceDue: number;
  noticeDue: number;
  totalChanged: boolean;
};

const createOrderError = (message: string, statusCode = 400) => {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
};

const toCents = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw createOrderError("No se pudo validar el precio del producto.", 409);
  }
  return Math.round(amount * 100);
};

const fromCents = (value: number) => value / 100;

const snapshotCoupon = (coupon: any): CouponTermsSnapshot => ({
  code: String(coupon.code),
  discountType: String(coupon.discountType),
  discountValue: String(coupon.discountValue),
  scope: String(coupon.scope),
  birdPurpose: coupon.birdPurpose ? String(coupon.birdPurpose) : null,
  minSubtotal: coupon.minSubtotal == null ? null : String(coupon.minSubtotal),
  maxDiscount: coupon.maxDiscount == null ? null : String(coupon.maxDiscount),
});

const readCouponSnapshot = (value: unknown): CouponTermsSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (
    typeof snapshot.code !== "string" ||
    typeof snapshot.discountType !== "string" ||
    typeof snapshot.discountValue !== "string" ||
    typeof snapshot.scope !== "string"
  ) return null;
  return {
    code: snapshot.code,
    discountType: snapshot.discountType,
    discountValue: snapshot.discountValue,
    scope: snapshot.scope,
    birdPurpose: typeof snapshot.birdPurpose === "string" ? snapshot.birdPurpose : null,
    minSubtotal: typeof snapshot.minSubtotal === "string" ? snapshot.minSubtotal : null,
    maxDiscount: typeof snapshot.maxDiscount === "string" ? snapshot.maxDiscount : null,
  };
};

function isCouponEligible(
  coupon: CouponTermsSnapshot,
  item: { productType: string; productPurpose?: string | null },
) {
  if (coupon.scope === "ALL") return true;
  if (coupon.scope === "ITEM") return item.productType === "ITEM";
  return item.productType === "BIRD" &&
    (!coupon.birdPurpose || coupon.birdPurpose === item.productPurpose);
}

function calculateDiscountCents(
  coupon: CouponTermsSnapshot | null,
  items: Array<{ productType: string; productPurpose?: string | null; quantity: number; unitPrice: unknown }>,
  subtotalCents: number,
) {
  if (!coupon) return 0;
  if (coupon.minSubtotal !== null && subtotalCents < toCents(coupon.minSubtotal)) return 0;

  const eligibleSubtotalCents = items.reduce((sum, item) => (
    isCouponEligible(coupon, item)
      ? sum + toCents(item.unitPrice) * item.quantity
      : sum
  ), 0);
  if (eligibleSubtotalCents <= 0) return 0;

  const discountValue = Number(coupon.discountValue);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    throw createOrderError("No se pudieron recuperar las condiciones originales del cupón.", 409);
  }
  const rawDiscountCents = coupon.discountType === "PERCENTAGE"
    ? Math.round(eligibleSubtotalCents * discountValue / 100)
    : toCents(discountValue);
  const cappedCents = Math.min(rawDiscountCents, eligibleSubtotalCents);
  const maxDiscountCents = coupon.maxDiscount === null
    ? cappedCents
    : Math.min(cappedCents, toCents(coupon.maxDiscount));
  return Math.max(0, maxDiscountCents);
}

async function loadReplacementContext(
  prisma: PrismaClient,
  orderId: number,
  sourceProductId: number,
  replacementProductId: number,
): Promise<ReplacementContext> {
  if (sourceProductId === replacementProductId) {
    throw createOrderError("Selecciona un ave distinta para la sustitución.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw createOrderError("No se encontró la orden.", 404);

  const matchingItems = order.items.filter((item: any) => item.productId === sourceProductId);
  if (matchingItems.length !== 1) {
    throw createOrderError("El producto de origen no es único dentro de esta orden.", 409);
  }
  const sourceItem = matchingItems[0];
  if (sourceItem.productType !== "BIRD" || sourceItem.quantity !== 1) {
    throw createOrderError("La sustitución solo admite una unidad de ave por artículo.", 409);
  }

  const [sourceProduct, replacementProduct] = await Promise.all([
    prisma.product.findUnique({ where: { id: sourceProductId } }),
    prisma.product.findUnique({ where: { id: replacementProductId } }),
  ]);
  if (!sourceProduct || sourceProduct.type !== "BIRD") {
    throw createOrderError("No se encontró el ave original.", 409);
  }
  if (
    !replacementProduct ||
    replacementProduct.type !== "BIRD" ||
    !replacementProduct.active ||
    !replacementProduct.published ||
    replacementProduct.saleStatus !== "AVAILABLE"
  ) {
    throw createOrderError("El ave de reemplazo ya no está disponible para la venta.", 409);
  }

  const status = String(order.status).toUpperCase();
  const paymentStatus = String(order.paymentStatus).toUpperCase();
  const paymentMethod = String(order.paymentMethod).toUpperCase();
  let mode: ReplacementContext["mode"];
  let paidAmountCents = 0;

  if (status === "PENDING" && paymentStatus === "PENDING" && paymentMethod === "TRANSFER") {
    if (order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
      throw createOrderError("El plazo de esta orden concluyó; actualiza su estado antes de sustituir el ave.", 409);
    }
    mode = "UNPAID_TRANSFER";
  } else if (
    status === "PENDING" &&
    paymentStatus === "PARTIALLY_PAID" &&
    paymentMethod === "TRANSFER"
  ) {
    mode = "PARTIALLY_PAID_TRANSFER";
    paidAmountCents = toCents(order.paidAmount);
    if (paidAmountCents <= 0 || paidAmountCents >= toCents(order.total)) {
      throw createOrderError("El saldo registrado de esta orden no es consistente.", 409);
    }
  } else if (status === "PAID" && paymentStatus === "APPROVED") {
    mode = "PAID";
    paidAmountCents = toCents(order.paidAmount ?? order.mpPaidAmount ?? order.total);
    if (Number(order.mpRefundedAmount || 0) > 0) {
      throw createOrderError("No se puede sustituir un producto después de registrar una devolución.", 409);
    }
  } else {
    throw createOrderError("Solo se pueden sustituir aves en órdenes pendientes por transferencia o pagadas y no enviadas.", 409);
  }

  let couponSnapshot = readCouponSnapshot(order.couponSnapshot);
  if (!couponSnapshot && (order.couponCode || toCents(order.discountTotal) > 0)) {
    const legacyCoupon = order.couponId
      ? await prisma.coupon.findUnique({ where: { id: order.couponId } })
      : null;
    if (legacyCoupon) {
      const candidate = snapshotCoupon(legacyCoupon);
      const historicSubtotalCents = order.items.reduce(
        (sum: number, item: any) => sum + toCents(item.unitPrice) * item.quantity,
        0,
      );
      if (
        calculateDiscountCents(candidate, order.items, historicSubtotalCents) ===
        toCents(order.discountTotal)
      ) {
        couponSnapshot = candidate;
      }
    }
    if (!couponSnapshot) {
      throw createOrderError("No se puede verificar que las condiciones actuales del cupón reproduzcan el descuento original. Revisa esta orden antes de continuar.", 409);
    }
  }

  const pricedItems = order.items.map((item: any) => item.id === sourceItem.id
    ? {
        ...item,
        unitPrice: replacementProduct.price,
        productPurpose: replacementProduct.purpose,
      }
    : item);
  const newSubtotalCents = pricedItems.reduce(
    (sum: number, item: any) => sum + toCents(item.unitPrice) * item.quantity,
    0,
  );
  const newDiscountCents = calculateDiscountCents(couponSnapshot, pricedItems, newSubtotalCents);
  const shippingCostCents = toCents(order.shippingCost);
  const newTotalCents = Math.max(0, newSubtotalCents + shippingCostCents - newDiscountCents);
  const currentTotalCents = toCents(order.total);
  const balanceDueCents = Math.max(0, newTotalCents - paidAmountCents);

  if (paymentMethod === "MERCADOPAGO" && newTotalCents !== currentTotalCents) {
    throw createOrderError("Mercado Pago no admite ajustes de saldo desde esta sustitución. El total debe permanecer sin cambios.", 409);
  }
  if (paidAmountCents > 0 && newTotalCents < paidAmountCents) {
    throw createOrderError("El nuevo total sería menor al monto recibido. La sustitución requiere resolver primero la devolución o el crédito.", 409);
  }

  const totalChanged = newTotalCents !== currentTotalCents;
  return {
    order,
    sourceItem,
    sourceProduct,
    replacementProduct,
    couponSnapshot,
    mode,
    paidAmountCents,
    quote: {
      paymentMethod,
      paymentStatus,
      couponCode: order.couponCode || null,
      currentSubtotal: fromCents(toCents(order.subtotal)),
      newSubtotal: fromCents(newSubtotalCents),
      currentDiscount: fromCents(toCents(order.discountTotal)),
      newDiscount: fromCents(newDiscountCents),
      shippingCost: fromCents(shippingCostCents),
      currentTotal: fromCents(currentTotalCents),
      newTotal: fromCents(newTotalCents),
      paidAmount: fromCents(paidAmountCents),
      balanceDue: fromCents(balanceDueCents),
      noticeDue: totalChanged && balanceDueCents > 0 ? fromCents(balanceDueCents) : 0,
      totalChanged,
    },
  };
}

export async function previewBirdOrderItemReplacement(
  prisma: PrismaClient,
  orderId: number,
  input: Pick<ReplacePaidBirdOrderItemInput, "sourceProductId" | "replacementProductId">,
) {
  const context = await loadReplacementContext(
    prisma,
    orderId,
    input.sourceProductId,
    input.replacementProductId,
  );
  return context.quote;
}

export async function replacePaidBirdOrderItem(
  prisma: PrismaClient,
  orderId: number,
  input: ReplacePaidBirdOrderItemInput,
  actor: AuditActor,
) {
  if (!input.customerAuthorized || !input.deliveryConfirmed) {
    throw createOrderError("Confirma la autorización del cliente y la dirección de entrega.");
  }

  return prisma.$transaction(async (tx) => {
    const beforeLock = await tx.order.findUnique({ where: { id: orderId } });
    if (!beforeLock) throw createOrderError("No se encontró la orden.", 404);
    const lockedOrder = await tx.order.updateMany({
      where: {
        id: orderId,
        status: beforeLock.status,
        paymentStatus: beforeLock.paymentStatus,
      },
      data: { status: beforeLock.status },
    });
    if (lockedOrder.count !== 1) {
      throw createOrderError("La orden cambió mientras se preparaba la sustitución. Actualízala e inténtalo de nuevo.", 409);
    }

    const context = await loadReplacementContext(
      tx as unknown as PrismaClient,
      orderId,
      input.sourceProductId,
      input.replacementProductId,
    );
    const { order, sourceItem, sourceProduct, replacementProduct, couponSnapshot, mode, paidAmountCents, quote } = context;
    if (
      (input.expectedCurrentTotal !== undefined && toCents(input.expectedCurrentTotal) !== toCents(quote.currentTotal)) ||
      (input.expectedNewTotal !== undefined && toCents(input.expectedNewTotal) !== toCents(quote.newTotal)) ||
      (input.expectedNewSubtotal !== undefined && toCents(input.expectedNewSubtotal) !== toCents(quote.newSubtotal)) ||
      (input.expectedNewDiscount !== undefined && toCents(input.expectedNewDiscount) !== toCents(quote.newDiscount)) ||
      (input.expectedPaidAmount !== undefined && toCents(input.expectedPaidAmount) !== toCents(quote.paidAmount))
    ) {
      throw createOrderError("El total o el monto recibido cambió desde la vista previa. Revisa el nuevo cálculo antes de confirmar.", 409);
    }
    const sourceInventoryStatus = mode === "PAID" ? "SOLD" : "RESERVED";
    const replacementInventoryStatus = mode === "PAID" && quote.balanceDue === 0 ? "SOLD" : "RESERVED";

    const acquiredReplacement = await tx.product.updateMany({
      where: {
        id: replacementProduct.id,
        type: "BIRD",
        active: true,
        published: true,
        saleStatus: "AVAILABLE",
      },
      data: { saleStatus: replacementInventoryStatus },
    });
    if (acquiredReplacement.count !== 1) {
      throw createOrderError("El ave de reemplazo acaba de dejar de estar disponible. Actualiza la orden e inténtalo de nuevo.", 409);
    }

    const releasedSource = await tx.product.updateMany({
      where: {
        id: sourceProduct.id,
        type: "BIRD",
        saleStatus: sourceInventoryStatus,
      },
      data: { saleStatus: "AVAILABLE" },
    });
    if (releasedSource.count !== 1) {
      throw createOrderError("No se pudo liberar el ave original; verifica su estado de inventario.", 409);
    }

    const previousItemState = {
      productId: sourceItem.productId,
      name: sourceItem.productName,
      type: sourceItem.productType,
      ringNumber: sourceItem.productRingNumber,
      quantity: sourceItem.quantity,
      unitPrice: sourceItem.unitPrice.toString(),
    };
    const updatedItem = await tx.orderItem.update({
      where: { id: sourceItem.id },
      data: {
        productId: replacementProduct.id,
        productName: replacementProduct.name,
        productType: "BIRD",
        productRingNumber: replacementProduct.ringNumber,
        productAge: replacementProduct.age,
        productPurpose: replacementProduct.purpose,
        unitPrice: replacementProduct.price,
      },
    });

    const isFullyPaid = mode !== "UNPAID_TRANSFER" && paidAmountCents === toCents(quote.newTotal);
    const nextStatus = isFullyPaid ? OrderStatus.PAID : OrderStatus.PENDING;
    const nextPaymentStatus = isFullyPaid ? "APPROVED" : paidAmountCents > 0 ? "PARTIALLY_PAID" : "PENDING";
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal: quote.newSubtotal,
        discountTotal: quote.newDiscount,
        total: quote.newTotal,
        paidAmount: quote.paidAmount,
        ...(order.couponSnapshot == null && couponSnapshot ? { couponSnapshot } : {}),
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
        ...(isFullyPaid || paidAmountCents > 0
          ? { paymentExpiresAt: null, expiresAt: null }
          : {}),
      },
    });

    const nextItemState = {
      productId: updatedItem.productId,
      name: updatedItem.productName,
      type: updatedItem.productType,
      ringNumber: updatedItem.productRingNumber,
      quantity: updatedItem.quantity,
      unitPrice: updatedItem.unitPrice.toString(),
    };
    const due = quote.noticeDue > 0
      ? `Nuevo saldo pendiente por cubrir: $${quote.noticeDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN.`
      : "";
    const message = [
      `Producto sustituido a solicitud del cliente: ${sourceItem.productName || sourceProduct.name} por ${replacementProduct.name}. Motivo: ${input.reason.trim()}.`,
      quote.totalChanged ? `El total de la orden cambió de $${quote.currentTotal.toFixed(2)} a $${quote.newTotal.toFixed(2)} MXN.` : "El total de la orden no cambió.",
      due,
    ].filter(Boolean).join(" ");

    await tx.orderEvent.create({
      data: {
        orderId,
        eventType: "ORDER_ITEM_REPLACED",
        message,
        ...auditActorData(actor),
        previousState: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal.toString(),
          discountTotal: order.discountTotal.toString(),
          total: order.total.toString(),
          paidAmount: fromCents(paidAmountCents),
          item: previousItemState,
        },
        nextState: {
          status: nextStatus,
          paymentStatus: nextPaymentStatus,
          subtotal: quote.newSubtotal,
          discountTotal: quote.newDiscount,
          total: quote.newTotal,
          paidAmount: quote.paidAmount,
          balanceDue: quote.balanceDue,
          item: nextItemState,
        },
        metadata: {
          reason: input.reason.trim(),
          customerAuthorized: true,
          deliveryConfirmed: true,
          paymentMethod: quote.paymentMethod,
          couponCode: quote.couponCode,
          previousTotal: quote.currentTotal,
          newTotal: quote.newTotal,
          paidAmount: quote.paidAmount,
          balanceDue: quote.balanceDue,
          ...(due ? { due } : {}),
        },
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, events: { orderBy: { createdAt: "desc" } } },
    });
  });
}
