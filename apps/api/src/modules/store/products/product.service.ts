import { storePrisma } from "@nexus/db/store";
import { ProductType, SaleStatus } from "@prisma/client-store";
import { mediaAssetService } from "../media-assets/media-asset.service";

export interface ProductFilters {
  type?: ProductType;
  status?: SaleStatus;
  search?: string;
  onlyActive?: boolean;
  onlyReadyMedia?: boolean;
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

  return {
    ...productData,
    gallery,
    expiresAt: pendingOrder?.expiresAt || null,
    coverMediaUrl: cover?.mediaUrl || null,
    coverPosterUrl: cover?.posterUrl || null,
    coverMediaType: cover?.mediaType || null,
    coverAssetStatus: cover?.status || null,
    thumbnail: displayImage,
  };
}

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
    if (filters.onlyReadyMedia) {
      where.coverAsset = {
        status: "READY",
        mediaUrl: { not: null },
      };
    }
    if (filters.type) where.type = filters.type;
    if (filters.status) where.saleStatus = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const products = await storePrisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    return products.map(serializeProduct);
  },

  async getById(id: number, options: { onlyReadyMedia?: boolean } = {}) {
    const product = await storePrisma.product.findFirst({
      where: {
        id,
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

  async create(data: any) {
    const { gallery = [], coverPosterAssetId, ...productData } = data;
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

  async update(id: number, data: any) {
    const { gallery, coverPosterAssetId, ...productData } = data;
    const current = await storePrisma.product.findUnique({
      where: { id },
      include: { gallery: true },
    });
    if (!current) throw new Error("Product not found");

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
      await tx.product.update({
        where: { id },
        data: { ...productData, updated_at: new Date() },
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

  async softDelete(id: number) {
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
      return tx.product.update({
        where: { id },
        data: { active: false, coverAssetId: null },
      });
    });

    await Promise.all(assetIds.map((assetId) => mediaAssetService.releaseIfUnreferenced(assetId)));
    return result;
  },
};
