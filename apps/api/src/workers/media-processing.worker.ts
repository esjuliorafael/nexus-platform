import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { processVideoAsset } from "../modules/store/media-assets/media-asset.processor";
import type { MediaProcessingJobData } from "../modules/store/media-assets/media-asset.types";
import { storageService } from "../services/storage.service";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const mediaProcessingWorker = new Worker<MediaProcessingJobData>(
  "media-processing",
  async (job: Job<MediaProcessingJobData>) => {
    try {
      return await processVideoAsset(job.data.assetId);
    } catch (error: any) {
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
      const asset = isFinalAttempt
        ? await storePrisma.mediaAsset.findUnique({
            where: { id: job.data.assetId },
            select: { mediaUrl: true, sourceKey: true },
          })
        : null;
      const fallbackMediaUrl =
        asset?.mediaUrl ||
        (asset?.sourceKey
          ? await storageService.publicUrlForKey(asset.sourceKey)
          : undefined);

      await storePrisma.mediaAsset.update({
        where: { id: job.data.assetId },
        data: {
          ...(isFinalAttempt ? { sourceKey: null } : {}),
          ...(fallbackMediaUrl ? { mediaUrl: fallbackMediaUrl } : {}),
          status: "READY",
          errorMessage: null,
        },
      });
      throw error;
    }
  },
  { connection, concurrency: 1 },
);
