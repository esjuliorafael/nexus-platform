import { storePrisma } from "@nexus/db/store";
import type { Prisma } from "@prisma/client-store";
import { extensionForMime } from "../../../utils/file.utils";
import { storageService } from "../../../services/storage.service";
import { mediaAssetService } from "../media-assets/media-asset.service";
import { serializeMediaAsset } from "../media-assets/media-asset.types";

const VAULT_RETENTION_DAYS = 30;

function addRetention(date = new Date()) {
  return new Date(date.getTime() + VAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function buildDownloadName(
  assetId: string,
  mimeType: string,
  createdAt = new Date(),
) {
  const date = createdAt.toISOString().replace(/[-:]/g, "").slice(0, 13);
  const extension = extensionForMime(mimeType, "bin");
  return `nexus-media-${date}-${assetId.slice(0, 4)}.${extension}`;
}

function serializeVaultItem(entry: any) {
  return {
    id: entry.id,
    assetId: entry.assetId,
    uploadedByName: entry.uploadedByName,
    downloadName: entry.downloadName,
    expiresAt: entry.expiresAt,
    downloadedAt: entry.downloadedAt,
    downloadCount: entry.downloadCount,
    createdAt: entry.createdAt,
    mediaType: entry.asset.mediaType,
    mimeType: entry.asset.mimeType,
    status: entry.asset.status,
    mediaUrl: entry.asset.mediaUrl,
    posterUrl: entry.asset.posterUrl,
    sizeBytes: entry.asset.sizeBytes,
    width: entry.asset.width,
    height: entry.asset.height,
    durationMs: entry.asset.durationMs,
    error: entry.asset.errorMessage,
  };
}

async function getItemOrThrow(id: string) {
  const item = await storePrisma.mediaVaultItem.findUnique({
    where: { id },
    include: { asset: true },
  });
  if (!item) {
    const error = new Error("El archivo de la bóveda no existe.") as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }
  return item;
}

export const mediaVaultService = {
  async list(input: {
    page: number;
    pageSize: number;
    type?: "PHOTO" | "VIDEO";
    search?: string;
  }) {
    const now = new Date();
    const search = input.search?.trim();
    const where: Prisma.MediaVaultItemWhereInput = {
      expiresAt: { gt: now },
      ...(input.type ? { asset: { is: { mediaType: input.type } } } : {}),
      ...(search
        ? {
            OR: [
              { downloadName: { contains: search, mode: "insensitive" } },
              { uploadedByName: { contains: search, mode: "insensitive" } },
              {
                asset: {
                  is: {
                    OR: [
                      {
                        originalName: { contains: search, mode: "insensitive" },
                      },
                      { mimeType: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      storePrisma.mediaVaultItem.findMany({
        where,
        include: { asset: true },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      storePrisma.mediaVaultItem.count({ where }),
    ]);

    return {
      items: items.map(serializeVaultItem),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
      },
    };
  },

  async beginUpload(
    input: { fileName: string; mimeType: string; sizeBytes: number },
    user: { id: number; name: string },
  ) {
    const direct = await mediaAssetService.createDirectOriginalUpload(input);
    const createdAt = new Date();
    try {
      const item = await storePrisma.mediaVaultItem.create({
        data: {
          assetId: direct.asset.id,
          uploadedById: user.id,
          uploadedByName: user.name,
          downloadName: buildDownloadName(
            direct.asset.id,
            direct.asset.mimeType,
            createdAt,
          ),
          expiresAt: addRetention(createdAt),
          createdAt,
        },
        include: { asset: true },
      });
      return {
        item: serializeVaultItem(item),
        asset: serializeMediaAsset(direct.asset),
        uploadUrl: direct.uploadUrl,
        expiresInSeconds: direct.expiresInSeconds,
      };
    } catch (error) {
      await mediaAssetService
        .releaseIfUnreferenced(direct.asset.id)
        .catch(() => undefined);
      throw error;
    }
  },

  async completeUpload(id: string) {
    const item = await getItemOrThrow(id);
    await mediaAssetService.completeDirectUpload(item.assetId);
    return serializeVaultItem(await getItemOrThrow(id));
  },

  async createDownload(id: string) {
    const item = await getItemOrThrow(id);
    if (item.expiresAt <= new Date()) {
      const error = new Error("Este archivo ya expiró.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 410;
      throw error;
    }
    if (item.asset.status !== "READY" || !item.asset.mediaUrl) {
      const error = new Error(
        "El archivo todavía no está listo para descargar.",
      ) as Error & {
        statusCode?: number;
      };
      error.statusCode = 409;
      throw error;
    }

    const key =
      item.asset.sourceKey ||
      (await storageService.keyFromUrl(item.asset.mediaUrl));
    if (!key) throw new Error("No se pudo localizar el archivo original.");
    const url = await storageService.createSignedDownloadUrl(
      key,
      item.downloadName,
    );
    await storePrisma.mediaVaultItem.update({
      where: { id },
      data: {
        downloadedAt: new Date(),
        downloadCount: { increment: 1 },
      },
    });
    return { url, fileName: item.downloadName };
  },

  async extend(id: string) {
    const item = await getItemOrThrow(id);
    const baseline = item.expiresAt > new Date() ? item.expiresAt : new Date();
    return serializeVaultItem(
      await storePrisma.mediaVaultItem.update({
        where: { id },
        data: { expiresAt: addRetention(baseline) },
        include: { asset: true },
      }),
    );
  },

  async delete(id: string) {
    const item = await getItemOrThrow(id);
    await storePrisma.mediaVaultItem.delete({ where: { id } });
    await mediaAssetService.releaseIfUnreferenced(item.assetId);
    return { success: true };
  },

  async expireOverdue() {
    const expired = await storePrisma.mediaVaultItem.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { id: true, assetId: true },
      take: 100,
    });
    for (const item of expired) {
      await storePrisma.mediaVaultItem
        .delete({ where: { id: item.id } })
        .catch(() => undefined);
      await mediaAssetService
        .releaseIfUnreferenced(item.assetId)
        .catch(() => undefined);
    }
    return { expired: expired.length };
  },
};
