import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { expirePendingOrder } from "../services/order-expiration.service";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const orderReleaseQueue = new Queue("order-release", { connection });

export const orderReleaseWorker = new Worker(
  "order-release",
  async (job: Job) => {
    const { orderId } = job.data;
    const expiredOrder = await expirePendingOrder(orderId);
    if (expiredOrder) console.log(`Order ${orderId} auto-cancelled and inventory released.`);
  },
  { connection }
);
