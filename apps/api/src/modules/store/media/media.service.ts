import { storePrisma } from "@nexus/db/store";
import { MediaType } from "@prisma/client-store";
import { mediaAssetService } from "../media-assets/media-asset.service";

export interface MediaFilters {
  categoryId?: number;
  subcategoryId?: number;
  type?: MediaType;
  onlyReadyMedia?: boolean;
}

const mediaInclude = {
  asset: true,
  category: true,
  subcategoryLinks: {
    include: { subcategory: true },
  },
};

function serializeMedia(entry: any) {
  const { asset, subcategoryLinks, ...data } = entry;
  const subcategories = (subcategoryLinks || []).map(
    (link: any) => link.subcategory,
  );
  return {
    ...data,
    subcategories,
    subcategoryIds: subcategories.map((subcategory: any) => subcategory.id),
    subcategory: subcategories[0] || null,
    subcategoryId: subcategories[0]?.id || null,
    mediaUrl: asset.mediaUrl,
    posterUrl: asset.posterUrl,
    assetStatus: asset.status,
    mediaType: asset.mediaType,
    mimeType: asset.mimeType,
    filePath: asset.mediaUrl,
    type: asset.mediaType,
  };
}

function invalidClassification(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

async function assertSubcategories(
  categoryId: number | null | undefined,
  ids: number[],
) {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return uniqueIds;
  if (!categoryId) {
    throw invalidClassification(
      "Selecciona una categoria antes de las subcategorias.",
    );
  }

  const matches = await storePrisma.subcategory.findMany({
    where: {
      id: { in: uniqueIds },
      categoryId,
      active: true,
    },
    select: { id: true },
  });
  if (matches.length !== uniqueIds.length) {
    throw invalidClassification(
      "Una o mas subcategorias no pertenecen a la categoria seleccionada.",
    );
  }
  return uniqueIds;
}

async function assertAssetUsable(assetId: string) {
  const asset = await storePrisma.mediaAsset.findFirst({
    where: {
      id: assetId,
      status: { in: ["UPLOADING", "READY"] },
      mediaUrl: { not: null },
    },
  });
  if (!asset) {
    const error = new Error("El medio no esta disponible.") as Error & {
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
    if (filters.subcategoryId) {
      where.subcategoryLinks = {
        some: { subcategoryId: filters.subcategoryId },
      };
    }
    if (filters.type) where.asset = { mediaType: filters.type };
    if (filters.onlyReadyMedia) {
      where.asset = {
        ...(where.asset || {}),
        status: "READY",
        mediaUrl: { not: null },
      };
    }

    const entries = await storePrisma.media.findMany({
      where,
      include: mediaInclude,
      orderBy: { createdAt: "desc" },
    });
    return entries.map(serializeMedia);
  },

  async create(data: any) {
    await assertAssetUsable(data.assetId);
    const { subcategoryId, subcategoryIds, ...mediaData } = data;
    const requestedIds =
      subcategoryIds ?? (subcategoryId ? [subcategoryId] : []);
    const normalizedIds = await assertSubcategories(
      mediaData.categoryId,
      requestedIds,
    );
    const entry = await storePrisma.media.create({
      data: {
        ...mediaData,
        subcategoryLinks: {
          create: normalizedIds.map((subcategoryId) => ({ subcategoryId })),
        },
      },
      include: mediaInclude,
    });
    return serializeMedia(entry);
  },

  async update(id: number, data: any) {
    const current = await storePrisma.media.findUnique({
      where: { id },
      include: { subcategoryLinks: true },
    });
    if (!current) throw new Error("Media not found");
    if (data.assetId) await assertAssetUsable(data.assetId);

    const { subcategoryId, subcategoryIds, ...mediaData } = data;
    const requestedIds =
      subcategoryIds ?? (subcategoryId ? [subcategoryId] : undefined);
    const categoryChanged =
      mediaData.categoryId !== undefined &&
      mediaData.categoryId !== current.categoryId;
    const shouldUpdateSubcategories =
      requestedIds !== undefined || categoryChanged;
    const normalizedIds = shouldUpdateSubcategories
      ? await assertSubcategories(
          mediaData.categoryId ?? current.categoryId,
          requestedIds || [],
        )
      : [];

    const entry = await storePrisma.media.update({
      where: { id },
      data: {
        ...mediaData,
        ...(shouldUpdateSubcategories
          ? {
              subcategoryLinks: {
                deleteMany: {},
                create: normalizedIds.map((subcategoryId) => ({
                  subcategoryId,
                })),
              },
            }
          : {}),
      },
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
