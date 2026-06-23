import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { fromFile } from "file-type";
import sharp from "sharp";
import { storePrisma } from "@nexus/db/store";
import { mediaProcessingQueue } from "../../../queues/media-processing.queue";
import { storageService } from "../../../services/storage.service";
import {
  createStorageKey,
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

function unsupportedMedia(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 415;
  return error;
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
  const sourceKey = createStorageKey(assetId, extension, "-source");
  let sourceUrl: string | null = null;

  try {
    const fileStats = await stat(inputPath);
    sourceUrl = await storageService.uploadObject(
      createReadStream(inputPath),
      sourceKey,
      mimeType,
    );
    const asset = await storePrisma.mediaAsset.create({
      data: {
        id: assetId,
        sourceKey,
        mediaType: "VIDEO",
        mimeType,
        originalName: normalizeOriginalName(originalName),
        status: "PROCESSING",
        sizeBytes: fileStats.size,
      },
    });

    await mediaProcessingQueue.add(
      "normalize-video",
      { assetId },
      {
        jobId: assetId,
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    return asset;
  } catch (error) {
    if (sourceUrl) await storageService.deleteFile(sourceUrl);
    await storePrisma.mediaAsset.delete({ where: { id: assetId } }).catch(() => undefined);
    throw error;
  }
}

export const mediaAssetService = {
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
