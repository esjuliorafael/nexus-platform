import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { processVideoAsset } from "../modules/store/media-assets/media-asset.processor";
import type { MediaProcessingJobData } from "../modules/store/media-assets/media-asset.types";
import { queueName } from "../queues/queue-name";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const mediaProcessingWorker = new Worker<MediaProcessingJobData>(
  queueName("media-processing"),
  async (job: Job<MediaProcessingJobData>) => {
    try {
      return await processVideoAsset(job.data.assetId, job.data.revision);
    } catch (error: any) {
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      await storePrisma.mediaAsset.update({
        where: { id: job.data.assetId },
        data: {
          status: isFinalAttempt ? "FAILED" : "PROCESSING",
          errorMessage: isFinalAttempt
            ? "No fue posible optimizar el video para reproduccion web."
            : null,
        },
      });
      throw error;
    }
  },
  { connection, concurrency: 1 },
);
