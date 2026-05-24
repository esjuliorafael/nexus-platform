import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { whatsappQueue } from "./whatsapp.queue";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const ticketReleaseQueue = new Queue("ticket-release", { connection });

export const ticketReleaseWorker = new Worker(
  "ticket-release",
  async (job: Job) => {
    const { ticketSaleIds } = job.data;
    const { rafflePrisma } = await import("@nexus/db/raffle");

    const sales = await rafflePrisma.ticketSale.findMany({
      where: {
        id: { in: ticketSaleIds },
        paymentStatus: "PENDING",
      },
    });

    if (sales.length > 0) {
      await rafflePrisma.ticketSale.updateMany({
        where: { id: { in: sales.map(s => s.id) } },
        data: { paymentStatus: "CANCELLED" },
      });

      console.log(`Auto-released ${sales.length} tickets.`);

      // Enqueue cancellation notification
      await whatsappQueue.add("reservation-cancelled", {
        kind: "reservation-cancelled",
        ticketSaleIds: sales.map(s => s.id),
        recipientPhone: sales[0].customerPhone,
      });
    }
  },
  { connection }
);
