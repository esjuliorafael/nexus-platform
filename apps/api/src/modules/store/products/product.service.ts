import { storePrisma } from "@nexus/db/store";
import { ProductType, SaleStatus } from "@prisma/client-store";
import { mediaAssetService } from "../media-assets/media-asset.service";
import { auditActorData, type AuditActor } from "../../../utils/admin-authorization";

export interface ProductFilters {
  type?: ProductType;
  status?: SaleStatus;
  search?: string;
  purpose?: string;
  featured?: boolean;
  onlyActive?: boolean;
  onlyPublished?: boolean;
  onlyReadyMedia?: boolean;
  limit?: number;
}

const productInclude = {
  coverAsset: true,
  gallery: { include: { asset: true } },
  orderItems: {
    where: { order: { status: "PENDING" as const } },
    include: { order: { select: { expiresAt: true } } },
    take: 1,
  },
};

function serializeProduct(product: any) {
  const pendingOrder = product.orderItems?.[0]?.order;
  const cover = product.coverAsset;
  const gallery = (product.gallery || []).map((item: any) => ({
    id: item.id,
    productId: item.productId,
    assetId: item.assetId,
    mediaUrl: item.asset.mediaUrl,
    posterUrl: item.asset.posterUrl,
    mediaType: item.asset.mediaType,
    mimeType: item.asset.mimeType,
    createdAt: item.createdAt,
    filePath: item.asset.mediaUrl,
    fileType: item.asset.mediaType,
  }));
  const { orderItems, coverAsset, ...productData } = product;
  const displayImage = cover?.posterUrl || cover?.mediaUrl || null;
  const effectiveSaleStatus =
    product.type === ProductType.ITEM && product.stock <= 0
      ? SaleStatus.SOLD
      : product.saleStatus;

  return {
    ...productData,
    saleStatus: effectiveSaleStatus,
    gallery,
    expiresAt: pendingOrder?.expiresAt || null,
    coverMediaUrl: cover?.mediaUrl || null,
    coverPosterUrl: cover?.posterUrl || null,
    coverMediaType: cover?.mediaType || null,
    coverAssetStatus: cover?.status || null,
    thumbnail: displayImage,
  };
}

const productSnapshot = (product: any) => ({
  name: product.name,
  price: Number(product.price),
  stock: product.stock,
  saleStatus: product.saleStatus,
  published: product.published,
  featured: product.featured,
  featuredOrder: product.featuredOrder,
  type: product.type,
  ringNumber: product.ringNumber,
});

const productEventType = (previous: any, next: any) => {
  if (previous.published !== next.published) {
    return next.published ? "PRODUCT_PUBLISHED" : "PRODUCT_PAUSED";
  }
  if (previous.featured !== next.featured) {
    return next.featured ? "PRODUCT_FEATURED" : "PRODUCT_UNFEATURED";
  }
  return "PRODUCT_UPDATED";
};

const productEventMessage = (eventType: string) => {
  if (eventType === "PRODUCT_PUBLISHED") return "El producto se publico en el Storefront.";
  if (eventType === "PRODUCT_PAUSED") return "El producto se pauso en el Storefront.";
  if (eventType === "PRODUCT_FEATURED") return "El producto se agrego a destacados.";
  if (eventType === "PRODUCT_UNFEATURED") return "El producto se retiro de destacados.";
  return "Se actualizaron los datos del producto.";
};

async function assertAssetsUsable(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;
  const usableCount = await storePrisma.mediaAsset.count({
    where: {
      id: { in: uniqueIds },
      status: { in: ["UPLOADING", "READY"] },
      mediaUrl: { not: null },
    },
  });
  if (usableCount !== uniqueIds.length) {
    const error = new Error("Uno o mas medios no estan disponibles para asociarse.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }
}

export const productService = {
  async getAll(filters: ProductFilters) {
    const where: any = {};
    if (filters.onlyActive !== false) where.active = true;
    if (filters.onlyPublished) where.published = true;
    if (filters.onlyReadyMedia) {
      where.coverAsset = {
        status: "READY",
        mediaUrl: { not: null },
      };
    }
    if (filters.type) where.type = filters.type;
    if (filters.status) where.saleStatus = filters.status;
    if (filters.purpose) where.purpose = filters.purpose;
    if (typeof filters.featured === "boolean") where.featured = filters.featured;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const products = await storePrisma.product.findMany({
      where,
      include: productInclude,
      orderBy: filters.featured
        ? [{ featuredOrder: "asc" }, { createdAt: "desc" }]
        : { createdAt: "desc" },
      ...(filters.limit ? { take: filters.limit } : {}),
    });
    return products.map(serializeProduct);
  },

  async getById(
    id: number,
    options: { onlyActive?: boolean; onlyPublished?: boolean; onlyReadyMedia?: boolean } = {},
  ) {
    const product = await storePrisma.product.findFirst({
      where: {
        id,
        ...(options.onlyActive !== false ? { active: true } : {}),
        ...(options.onlyPublished ? { published: true } : {}),
        ...(options.onlyReadyMedia
          ? {
              coverAsset: {
                status: "READY",
                mediaUrl: { not: null },
              },
            }
          : {}),
      },
      include: productInclude,
    });
    return product ? serializeProduct(product) : null;
  },

  async getOverview(id: number) {
    const product = await storePrisma.product.findFirst({
      where: { id, active: true },
      include: {
        ...productInclude,
        events: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!product) return null;

    const orderItems = await storePrisma.orderItem.findMany({
      where: { productId: id },
      include: {
        order: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            status: true,
            paymentMethod: true,
            paymentStatus: true,
            createdAt: true,
            mpRefundedAmount: true,
            mpRefundedAt: true,
            events: {
              where: { eventType: { in: ["PAYMENT_CONFIRMED", "PAYMENT_REFUNDED"] } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { order: { createdAt: "desc" } },
    });

    const completedStatuses = new Set(["PAID", "SHIPPED", "DELIVERED"]);
    const confirmedItems = orderItems.filter(
      (item) =>
        completedStatuses.has(item.order.status) ||
        Boolean(item.order.mpRefundedAt) ||
        item.order.paymentStatus === "REFUNDED",
    );
    const pendingItems = orderItems.filter((item) => item.order.status === "PENDING");
    const cancelledItems = orderItems.filter(
      (item) =>
        item.order.status === "CANCELLED" &&
        !item.order.mpRefundedAt &&
        item.order.paymentStatus !== "REFUNDED",
    );
    const cancelledOrderIds = new Set(cancelledItems.map((item) => item.orderId));

    const sales = confirmedItems.map((item) => {
      const confirmation = item.order.events.find((event) => event.eventType === "PAYMENT_CONFIRMED");
      return {
        orderId: String(item.orderId),
        customerName: item.order.customerName,
        customerPhone: item.order.customerPhone,
        orderStatus: item.order.status,
        paymentMethod: item.order.paymentMethod,
        paymentStatus: item.order.paymentStatus,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.unitPrice) * item.quantity,
        confirmedAt: confirmation?.createdAt || item.order.createdAt,
        refundedAmount: Number(item.order.mpRefundedAmount || 0),
        refundedAt: item.order.mpRefundedAt,
      };
    });
    const netSales = sales.filter((sale) => !sale.refundedAt);
    const confirmedOrderIds = new Set(netSales.map((sale) => sale.orderId));

    const orderActivity = confirmedItems.flatMap((item) => {
      const relevantEvents = item.order.events.map((event) => ({
        id: `order-${item.orderId}-${event.id}`,
        eventType: event.eventType === "PAYMENT_CONFIRMED" ? "SALE_CONFIRMED" : event.eventType,
        message:
          event.eventType === "PAYMENT_CONFIRMED"
            ? `Venta confirmada en la orden #${item.orderId} para ${item.order.customerName}.`
            : `La orden #${item.orderId} registro una devolucion de pago.`,
        actorType: event.actorType,
        actorUserId: event.actorUserId,
        actorName: event.actorName,
        actorRole: event.actorRole,
        origin: event.origin,
        previousState: event.previousState,
        nextState: event.nextState,
        metadata: { ...(event.metadata as any), orderId: item.orderId },
        createdAt: event.createdAt,
      }));

      if (relevantEvents.some((event) => event.eventType === "SALE_CONFIRMED")) {
        return relevantEvents;
      }
      return [
        ...relevantEvents,
        {
          id: `order-${item.orderId}-sale`,
          eventType: "SALE_CONFIRMED",
          message: `Venta confirmada en la orden #${item.orderId} para ${item.order.customerName}.`,
          actorType: "SYSTEM",
          actorUserId: null,
          actorName: "Sistema",
          actorRole: null,
          origin: "SYSTEM",
          previousState: null,
          nextState: null,
          metadata: { orderId: item.orderId },
          createdAt: item.order.createdAt,
        },
      ];
    });

    const { events, ...productWithoutEvents } = product as any;
    const legacyCreationEvent = events.some((event: any) => event.eventType === "PRODUCT_CREATED")
      ? []
      : [{
          id: `product-${product.id}-created`,
          eventType: "PRODUCT_CREATED",
          message: "El producto se registro en el inventario.",
          actorType: "SYSTEM",
          actorUserId: null,
          actorName: "Registro historico",
          actorRole: null,
          origin: "SYSTEM",
          previousState: null,
          nextState: productSnapshot(product),
          metadata: { legacy: true },
          createdAt: product.createdAt,
        }];
    const activityEvents = [...events, ...orderActivity, ...legacyCreationEvent].sort(
      (left: any, right: any) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    return {
      product: serializeProduct(productWithoutEvents),
      metrics: {
        confirmedRevenue: netSales.reduce((sum, sale) => sum + sale.lineTotal, 0),
        unitsSold: netSales.reduce((sum, sale) => sum + sale.quantity, 0),
        confirmedOrders: confirmedOrderIds.size,
        activeReservations: pendingItems.reduce((sum, item) => sum + item.quantity, 0),
        releasedReservations: cancelledOrderIds.size,
        currentStock: product.stock,
      },
      finalSale: product.type === "BIRD" ? sales[0] || null : null,
      recentSales: product.type === "ITEM" ? sales.slice(0, 20) : [],
      activityEvents,
    };
  },

  async create(data: any, actor: AuditActor) {
    const { gallery = [], coverPosterAssetId, ...productData } = data;
    if (productData.type === ProductType.ITEM && productData.stock <= 0) {
      productData.saleStatus = SaleStatus.SOLD;
    }
    const assetIds = [
      ...(productData.coverAssetId ? [productData.coverAssetId] : []),
      ...gallery.map((item: any) => item.assetId),
    ];
    await assertAssetsUsable(assetIds);

    if (coverPosterAssetId && productData.coverAssetId) {
      await mediaAssetService.adoptPoster(productData.coverAssetId, coverPosterAssetId);
    }

    const product = await storePrisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...productData, updated_at: new Date() },
      });
      await tx.productEvent.create({
        data: {
          productId: created.id,
          eventType: "PRODUCT_CREATED",
          message: "El producto se registro en el inventario.",
          ...auditActorData(actor),
          nextState: productSnapshot(created),
        },
      });
      if (gallery.length > 0) {
        await tx.productGallery.createMany({
          data: gallery.map((item: any) => ({
            productId: created.id,
            assetId: item.assetId,
          })),
        });
      }
      return tx.product.findUnique({ where: { id: created.id }, include: productInclude });
    });

    return serializeProduct(product);
  },

  async update(id: number, data: any, actor: AuditActor) {
    const { gallery, coverPosterAssetId, ...productData } = data;
    const current = await storePrisma.product.findUnique({
      where: { id },
      include: { gallery: true },
    });
    if (!current) throw new Error("Product not found");
    const nextType = productData.type ?? current.type;
    const nextStock = productData.stock ?? current.stock;
    if (nextType === ProductType.ITEM && nextStock <= 0) {
      productData.saleStatus = SaleStatus.SOLD;
    }

    const nextGallery = gallery || null;
    const assetIds = [
      ...(productData.coverAssetId ? [productData.coverAssetId] : []),
      ...(nextGallery ? nextGallery.map((item: any) => item.assetId) : []),
    ];
    await assertAssetsUsable(assetIds);

    if (coverPosterAssetId && productData.coverAssetId) {
      await mediaAssetService.adoptPoster(productData.coverAssetId, coverPosterAssetId);
    }

    const previousAssetIds = [
      ...(current.coverAssetId ? [current.coverAssetId] : []),
      ...current.gallery.map((item) => item.assetId),
    ];

    const product = await storePrisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { ...productData, updated_at: new Date() },
      });

      const previousState = productSnapshot(current);
      const nextState = productSnapshot(updated);
      const eventType = productEventType(previousState, nextState);
      await tx.productEvent.create({
        data: {
          productId: id,
          eventType,
          message: productEventMessage(eventType),
          ...auditActorData(actor),
          previousState,
          nextState,
        },
      });

      if (nextGallery) {
        await tx.productGallery.deleteMany({ where: { productId: id } });
        if (nextGallery.length > 0) {
          await tx.productGallery.createMany({
            data: nextGallery.map((item: any) => ({ productId: id, assetId: item.assetId })),
          });
        }
      }

      return tx.product.findUnique({ where: { id }, include: productInclude });
    });

    const retainedIds = new Set([
      productData.coverAssetId ?? current.coverAssetId,
      ...(nextGallery ? nextGallery.map((item: any) => item.assetId) : current.gallery.map((item) => item.assetId)),
    ].filter(Boolean));
    await Promise.all(
      previousAssetIds
        .filter((assetId) => !retainedIds.has(assetId))
        .map((assetId) => mediaAssetService.releaseIfUnreferenced(assetId)),
    );

    return serializeProduct(product);
  },

  async softDelete(id: number, actor: AuditActor) {
    const product = await storePrisma.product.findUnique({
      where: { id },
      include: { gallery: true },
    });
    if (!product) throw new Error("Product not found");

    const assetIds = [
      ...(product.coverAssetId ? [product.coverAssetId] : []),
      ...product.gallery.map((item) => item.assetId),
    ];

    const result = await storePrisma.$transaction(async (tx) => {
      await tx.productGallery.deleteMany({ where: { productId: id } });
      const archived = await tx.product.update({
        where: { id },
        data: { active: false, coverAssetId: null },
      });
      await tx.productEvent.create({
        data: {
          productId: id,
          eventType: "PRODUCT_ARCHIVED",
          message: "El producto se retiro del inventario activo.",
          ...auditActorData(actor),
          previousState: productSnapshot(product),
          nextState: productSnapshot(archived),
        },
      });
      return archived;
    });

    await Promise.all(assetIds.map((assetId) => mediaAssetService.releaseIfUnreferenced(assetId)));
    return result;
  },
};
