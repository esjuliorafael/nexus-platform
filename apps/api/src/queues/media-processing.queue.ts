import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { MediaProcessingJobData } from "../modules/store/media-assets/media-asset.types";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const mediaProcessingQueue = new Queue<MediaProcessingJobData>(
  "media-processing",
  { connection },
);
