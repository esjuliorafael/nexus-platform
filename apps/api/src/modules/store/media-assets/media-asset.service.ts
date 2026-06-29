import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { fromFile } from "file-type";
import sharp from "sharp";
import { storePrisma } from "@nexus/db/store";
import type { MediaAsset } from "@prisma/client-store";
import { mediaProcessingQueue } from "../../../queues/media-processing.queue";
import { storageService } from "../../../services/storage.service";
import {
  createStorageKey,
  extensionForMime,
  normalizeOriginalName,
} from "../../../utils/file.utils";
import { serializeMediaAsset } from "./media-asset.types";

const ACCEPTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ACCEPTED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
]);

const DIRECT_UPLOAD_VIDEO_MIMES = ACCEPTED_VIDEO_MIMES;

const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  qt: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
};

function unsupportedMedia(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 415;
  return error;
}

function extensionForDirectUpload(fileName: string, mimeType: string) {
  const extensionFromMime = extensionForMime(mimeType, "");
  if (extensionFromMime) return extensionFromMime;
  const extensionFromName = fileName.split(".").pop()?.trim().toLowerCase();
  return extensionFromName || "bin";
}

function normalizeDirectVideoMime(fileName: string, inputMimeType: string) {
  const mimeType = inputMimeType.trim().toLowerCase();
  if (DIRECT_UPLOAD_VIDEO_MIMES.has(mimeType)) return mimeType;

  const extension = fileName.split(".").pop()?.trim().toLowerCase() || "";
  return VIDEO_MIME_BY_EXTENSION[extension] || mimeType;
}

async function createImageAsset(inputPath: string, originalName: string) {
  const assetId = randomUUID();
  const image = sharp(inputPath).rotate();
  const pipeline = image
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 90 });
  const { data: output, info } = await pipeline.toBuffer({ resolveWithObject: true });
  const key = createStorageKey(assetId, "webp");
  let mediaUrl: string | null = null;

  try {
    mediaUrl = await storageService.uploadObject(output, key, "image/webp");
    return await storePrisma.mediaAsset.create({
      data: {
        id: assetId,
        mediaUrl,
        mediaType: "PHOTO",
        mimeType: "image/webp",
        originalName: normalizeOriginalName(originalName),
        status: "READY",
        width: info.width || null,
        height: info.height || null,
        sizeBytes: output.length,
      },
    });
  } catch (error) {
    if (mediaUrl) await storageService.deleteFile(mediaUrl);
    throw error;
  }
}

async function createVideoAsset(
  inputPath: string,
  originalName: string,
  mimeType: string,
  extension: string,
) {
  const assetId = randomUUID();
  const sourceKey = createStorageKey(assetId, extension);
  let mediaUrl: string | null = null;
  let asset: MediaAsset;

  try {
    const fileStats = await stat(inputPath);
    mediaUrl = await storageService.uploadObject(
      createReadStream(inputPath),
      sourceKey,
      mimeType,
    );
    asset = await storePrisma.mediaAsset.create({
      data: {
        id: assetId,
        mediaUrl,
        sourceKey,
        mediaType: "VIDEO",
        mimeType,
        originalName: normalizeOriginalName(originalName),
        status: "READY",
        sizeBytes: fileStats.size,
      },
    });
  } catch (error) {
    if (mediaUrl) await storageService.deleteFile(mediaUrl);
    await storePrisma.mediaAsset.delete({ where: { id: assetId } }).catch(() => undefined);
    throw error;
  }

  try {
    await mediaProcessingQueue.add(
      "enrich-video",
      { assetId },
      {
        jobId: assetId,
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  } catch (error) {
    console.error(`[Media] No se pudo programar el poster de ${assetId}:`, error);
    asset = await storePrisma.mediaAsset.update({
      where: { id: assetId },
      data: { sourceKey: null },
    });
  }

  return asset;
}

export const mediaAssetService = {
  async createDirectVideoUpload(input: {
    fileName: string;
    mimeType: string;
    sizeBytes?: number | null;
  }) {
    const mimeType = normalizeDirectVideoMime(input.fileName, input.mimeType);
    if (!DIRECT_UPLOAD_VIDEO_MIMES.has(mimeType)) {
      throw unsupportedMedia("Solo se permite carga directa de video.");
    }

    const assetId = randomUUID();
    const extension = extensionForDirectUpload(input.fileName, mimeType);
    const sourceKey = createStorageKey(assetId, extension);
    const signedUpload = await storageService.createSignedPutUrl(sourceKey, mimeType);

    const asset = await storePrisma.mediaAsset.create({
      data: {
        id: assetId,
        mediaUrl: signedUpload.publicUrl,
        sourceKey,
        mediaType: "VIDEO",
        mimeType,
        originalName: normalizeOriginalName(input.fileName),
        status: "UPLOADING",
        sizeBytes: input.sizeBytes || null,
      },
    });

    return {
      asset,
      uploadUrl: signedUpload.uploadUrl,
      expiresInSeconds: signedUpload.expiresInSeconds,
    };
  },

  async completeDirectUpload(assetId: string) {
    const asset = await storePrisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      const error = new Error("Asset no encontrado.") as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    if (!asset.sourceKey || asset.status !== "UPLOADING") {
      const error = new Error("El asset no espera una carga directa.") as Error & {
        statusCode?: number;
      };
      error.statusCode = 409;
      throw error;
    }

    try {
      const head = await storageService.headObject(asset.sourceKey);
      const completed = await storePrisma.mediaAsset.update({
        where: { id: assetId },
        data: {
          status: "READY",
          sizeBytes: Number(head.ContentLength || asset.sizeBytes || 0) || asset.sizeBytes,
          errorMessage: null,
        },
      });

      try {
        await mediaProcessingQueue.add(
          "enrich-video",
          { assetId },
          {
            jobId: assetId,
            attempts: 2,
            backoff: { type: "exponential", delay: 3000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        );
      } catch (error) {
        console.error(`[Media] No se pudo programar el poster de ${assetId}:`, error);
        await storePrisma.mediaAsset.update({
          where: { id: assetId },
          data: { sourceKey: null },
        });
      }

      return completed;
    } catch (error) {
      await storePrisma.mediaAsset.update({
        where: { id: assetId },
        data: {
          status: "FAILED",
          errorMessage: "No fue posible confirmar la carga directa.",
        },
      }).catch(() => undefined);
      throw error;
    }
  },

  async createFromFile(inputPath: string, originalName: string) {
    const detected = await fromFile(inputPath);
    if (!detected) {
      throw unsupportedMedia("No fue posible identificar el formato del archivo.");
    }

    if (ACCEPTED_IMAGE_MIMES.has(detected.mime)) {
      return serializeMediaAsset(await createImageAsset(inputPath, originalName));
    }

    if (ACCEPTED_VIDEO_MIMES.has(detected.mime)) {
      return serializeMediaAsset(
        await createVideoAsset(inputPath, originalName, detected.mime, detected.ext),
      );
    }

    throw unsupportedMedia(
      "Formato no compatible. Usa JPG, PNG, WebP, HEIC, MP4, MOV, WebM o 3GP.",
    );
  },

  async getById(id: string) {
    const asset = await storePrisma.mediaAsset.findUnique({ where: { id } });
    return asset ? serializeMediaAsset(asset) : null;
  },

  async adoptPoster(videoAssetId: string, posterAssetId: string) {
    const [videoAsset, posterAsset] = await Promise.all([
      storePrisma.mediaAsset.findUnique({ where: { id: videoAssetId } }),
      storePrisma.mediaAsset.findUnique({
        where: { id: posterAssetId },
        include: {
          _count: {
            select: {
              coverProducts: true,
              productGallery: true,
              mediaEntries: true,
              homeSlides: true,
            },
          },
        },
      }),
    ]);

    if (!videoAsset || videoAsset.mediaType !== "VIDEO" || videoAsset.status !== "READY") {
      throw unsupportedMedia("El asset de portada no es un video listo.");
    }
    if (!posterAsset || posterAsset.mediaType !== "PHOTO" || !posterAsset.mediaUrl) {
      throw unsupportedMedia("La miniatura seleccionada no es una imagen valida.");
    }

    const references = Object.values(posterAsset._count).reduce(
      (total, count) => total + count,
      0,
    );
    if (references > 0) {
      throw unsupportedMedia("La miniatura ya esta asociada a otro contenido.");
    }

    const previousPosterUrl = videoAsset.posterUrl;
    await storePrisma.$transaction([
      storePrisma.mediaAsset.update({
        where: { id: videoAssetId },
        data: { posterUrl: posterAsset.mediaUrl },
      }),
      storePrisma.mediaAsset.delete({ where: { id: posterAssetId } }),
    ]);

    if (previousPosterUrl && previousPosterUrl !== posterAsset.mediaUrl) {
      await storageService.deleteFile(previousPosterUrl);
    }
  },

  async releaseIfUnreferenced(id: string) {
    const asset = await storePrisma.mediaAsset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            coverProducts: true,
            productGallery: true,
            mediaEntries: true,
            homeSlides: true,
          },
        },
      },
    });
    if (!asset) return false;

    const references = Object.values(asset._count).reduce(
      (total, count) => total + count,
      0,
    );
    if (references > 0) return false;

    await storePrisma.mediaAsset.delete({ where: { id } });
    await Promise.all([
      asset.mediaUrl ? storageService.deleteFile(asset.mediaUrl) : Promise.resolve(),
      asset.posterUrl && asset.posterUrl !== asset.mediaUrl
        ? storageService.deleteFile(asset.posterUrl)
        : Promise.resolve(),
      asset.sourceKey ? storageService.deleteKey(asset.sourceKey) : Promise.resolve(),
    ]);
    return true;
  },

  async releaseByUrlIfUnreferenced(url: string) {
    const asset = await storePrisma.mediaAsset.findUnique({
      where: { mediaUrl: url },
      select: { id: true },
    });
    if (asset) return this.releaseIfUnreferenced(asset.id);

    await storageService.deleteFile(url);
    return true;
  },
};
