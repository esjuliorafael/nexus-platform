import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { queueName } from "./queue-name";

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
export const paymentHoldReleaseQueue = new Queue(queueName("payment-hold-release"), { connection });

export const paymentHoldReleaseWorker = new Worker(
  queueName("payment-hold-release"),
  async (job: Job<{ kind: "store" | "raffle"; holdId: string }>) => {
    if (job.data.kind === "store") {
      const { storePaymentHoldService } = await import("../modules/store/orders/store-payment-hold.service");
      return storePaymentHoldService.expire(job.data.holdId);
    }
    const { rafflePrisma } = await import("@nexus/db/raffle");
    const { rafflePaymentHoldService } = await import("../modules/raffle/ticket-sales/raffle-payment-hold.service");
    return rafflePaymentHoldService.expire(rafflePrisma, job.data.holdId);
  },
  { connection },
);
