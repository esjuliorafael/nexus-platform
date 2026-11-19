import { OrderStatus } from "@prisma/client-store";
import type { PrismaClient } from "@prisma/client-store";
import { auditActorData, type AuditActor } from "../../../utils/admin-authorization";

export type ReplacePaidBirdOrderItemInput = {
  sourceProductId: number;
  replacementProductId: number;
  reason: string;
  customerAuthorized: true;
  deliveryConfirmed: true;
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

export async function replacePaidBirdOrderItem(
  prisma: PrismaClient,
  orderId: number,
  input: ReplacePaidBirdOrderItemInput,
  actor: AuditActor,
) {
  if (input.sourceProductId === input.replacementProductId) {
    throw createOrderError("Selecciona un ave distinta para la sustitución.");
  }
  if (!input.customerAuthorized || !input.deliveryConfirmed) {
    throw createOrderError(
      "Confirma la autorización del cliente y la dirección de entrega.",
    );
  }

  return prisma.$transaction(async (tx) => {
    // This conditional write serializes the operation with shipment/status changes.
    const lockedOrder = await tx.order.updateMany({
      where: {
        id: orderId,
        status: OrderStatus.PAID,
        paymentStatus: "APPROVED",
      },
      data: { status: OrderStatus.PAID },
    });
    if (lockedOrder.count !== 1) {
      throw createOrderError(
        "Solo se pueden sustituir productos de órdenes pagadas y no enviadas.",
        409,
      );
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw createOrderError("No se encontró la orden.", 404);

    const matchingItems = order.items.filter(
      (item) => item.productId === input.sourceProductId,
    );
    if (matchingItems.length !== 1) {
      throw createOrderError(
        "El producto de origen no es único dentro de esta orden.",
        409,
      );
    }

    const sourceItem = matchingItems[0];
    if (sourceItem.productType !== "BIRD" || sourceItem.quantity !== 1) {
      throw createOrderError(
        "La sustitución solo admite una unidad de ave por artículo.",
        409,
      );
    }

    const [sourceProduct, replacementProduct] = await Promise.all([
      tx.product.findUnique({ where: { id: input.sourceProductId } }),
      tx.product.findUnique({ where: { id: input.replacementProductId } }),
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
      throw createOrderError(
        "El ave de reemplazo ya no está disponible para la venta.",
        409,
      );
    }
    if (toCents(sourceProduct.price) !== toCents(replacementProduct.price)) {
      throw createOrderError(
        "Por ahora, la sustitución requiere que ambas aves tengan el mismo precio de catálogo.",
        409,
      );
    }

    const previousItemState = {
      productId: sourceItem.productId,
      name: sourceItem.productName,
      type: sourceItem.productType,
      ringNumber: sourceItem.productRingNumber,
      quantity: sourceItem.quantity,
      unitPrice: sourceItem.unitPrice.toString(),
    };

    const acquiredReplacement = await tx.product.updateMany({
      where: {
        id: replacementProduct.id,
        type: "BIRD",
        active: true,
        published: true,
        saleStatus: "AVAILABLE",
      },
      data: { saleStatus: "SOLD" },
    });
    if (acquiredReplacement.count !== 1) {
      throw createOrderError(
        "El ave de reemplazo acaba de dejar de estar disponible. Actualiza la orden e inténtalo de nuevo.",
        409,
      );
    }

    const releasedSource = await tx.product.updateMany({
      where: {
        id: sourceProduct.id,
        type: "BIRD",
        saleStatus: "SOLD",
      },
      data: { saleStatus: "AVAILABLE" },
    });
    if (releasedSource.count !== 1) {
      throw createOrderError(
        "No se pudo liberar el ave original; verifica su estado de inventario.",
        409,
      );
    }

    const updatedItem = await tx.orderItem.update({
      where: { id: sourceItem.id },
      data: {
        productId: replacementProduct.id,
        productName: replacementProduct.name,
        productType: "BIRD",
        productRingNumber: replacementProduct.ringNumber,
        productAge: replacementProduct.age,
        productPurpose: replacementProduct.purpose,
        unitPrice: sourceItem.unitPrice,
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

    await tx.orderEvent.create({
      data: {
        orderId,
        eventType: "ORDER_ITEM_REPLACED",
        message: `Producto sustituido a solicitud del cliente: ${sourceItem.productName || sourceProduct.name} por ${replacementProduct.name}. Motivo: ${input.reason.trim()}. El pago y el total de la orden no cambiaron.`,
        ...auditActorData(actor),
        previousState: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total.toString(),
          item: previousItemState,
        },
        nextState: {
          status: OrderStatus.PAID,
          paymentStatus: "APPROVED",
          total: order.total.toString(),
          item: nextItemState,
        },
        metadata: {
          reason: input.reason.trim(),
          customerAuthorized: true,
          deliveryConfirmed: true,
        },
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, events: { orderBy: { createdAt: "desc" } } },
    });
  });
}
