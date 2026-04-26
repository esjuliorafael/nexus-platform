import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const ticketReleaseQueue = new Queue("ticket-release", { connection });

export const ticketReleaseWorker = new Worker(
  "ticket-release",
  async (job: Job) => {
    const { raffleId, releaseHours } = job.data;
    const { rafflePrisma } = await import("@nexus/db/raffle");

    const threshold = new Date();
    threshold.setHours(threshold.getHours() - (releaseHours || 24));

    const result = await rafflePrisma.ticketSale.updateMany({
      where: {
        raffleId,
        paymentStatus: "PENDING",
        createdAt: { lt: threshold },
      },
      data: {
        paymentStatus: "CANCELLED",
      },
    });

    if (result.count > 0) {
      console.log(`Auto-released ${result.count} tickets for raffle ${raffleId}.`);
    }
  },
  { connection }
);
