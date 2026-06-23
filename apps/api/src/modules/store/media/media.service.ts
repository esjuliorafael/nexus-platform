import { storePrisma } from "@nexus/db/store";
import { MediaType } from "@prisma/client-store";
import { mediaAssetService } from "../media-assets/media-asset.service";

export interface MediaFilters {
  categoryId?: number;
  subcategoryId?: number;
  type?: MediaType;
}

const mediaInclude = {
  asset: true,
  category: true,
  subcategory: true,
};

function serializeMedia(entry: any) {
  const { asset, ...data } = entry;
  return {
    ...data,
    mediaUrl: asset.mediaUrl,
    posterUrl: asset.posterUrl,
    mediaType: asset.mediaType,
    mimeType: asset.mimeType,
    filePath: asset.mediaUrl,
    type: asset.mediaType,
  };
}

async function assertAssetReady(assetId: string) {
  const asset = await storePrisma.mediaAsset.findFirst({
    where: { id: assetId, status: "READY", mediaUrl: { not: null } },
  });
  if (!asset) {
    const error = new Error("El medio aun no esta listo.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 409;
    throw error;
  }
}

export const mediaService = {
  async getAll(filters: MediaFilters) {
    const where: any = { active: true };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.subcategoryId) where.subcategoryId = filters.subcategoryId;
    if (filters.type) where.asset = { mediaType: filters.type };

    const entries = await storePrisma.media.findMany({
      where,
      include: mediaInclude,
      orderBy: { createdAt: "desc" },
    });
    return entries.map(serializeMedia);
  },

  async create(data: any) {
    await assertAssetReady(data.assetId);
    const entry = await storePrisma.media.create({ data, include: mediaInclude });
    return serializeMedia(entry);
  },

  async update(id: number, data: any) {
    const current = await storePrisma.media.findUnique({ where: { id } });
    if (!current) throw new Error("Media not found");
    if (data.assetId) await assertAssetReady(data.assetId);

    const entry = await storePrisma.media.update({
      where: { id },
      data,
      include: mediaInclude,
    });
    if (data.assetId && data.assetId !== current.assetId) {
      await mediaAssetService.releaseIfUnreferenced(current.assetId);
    }
    return serializeMedia(entry);
  },

  async delete(id: number) {
    const entry = await storePrisma.media.delete({ where: { id } });
    await mediaAssetService.releaseIfUnreferenced(entry.assetId);
    return entry;
  },
};
