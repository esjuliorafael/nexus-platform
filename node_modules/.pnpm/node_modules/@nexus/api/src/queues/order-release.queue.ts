import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const orderReleaseQueue = new Queue("order-release", { connection });

export const orderReleaseWorker = new Worker(
  "order-release",
  async (job: Job) => {
    const { orderId } = job.data;

    const order = await storePrisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (order && order.status === "PENDING") {
      await storePrisma.$transaction(async (tx) => {
        // Cancel the order
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });

        // Restore product availability for each item in the order
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { saleStatus: "AVAILABLE" },
          });
        }
      });

      console.log(`Order ${orderId} auto-cancelled and inventory released.`);
    }
  },
  { connection }
);
