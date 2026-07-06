import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { whatsappQueue } from "./whatsapp.queue";
import type { OrderKind, OrderItemPurpose } from "../services/evolution/channel.resolver";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

type ReservationReminderJobData =
  | {
      kind: "order";
      orderId: number;
      expectedExpiresAt: string;
    }
  | {
      kind: "raffle";
      ticketSaleIds: number[];
      expectedReleaseAt: string;
    };

export const reservationReminderQueue = new Queue<ReservationReminderJobData>(
  "reservation-reminders",
  {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  },
);

export const reservationReminderWorker = new Worker<ReservationReminderJobData>(
  "reservation-reminders",
  async (job: Job<ReservationReminderJobData>) => {
    const { data } = job;

    if (data.kind === "order") {
      const expectedExpiresAt = new Date(data.expectedExpiresAt);
      const order = await storePrisma.order.findUnique({
        where: { id: data.orderId },
        include: { items: { include: { product: true } } },
      });

      if (!order || order.status !== "PENDING" || !order.expiresAt) return;
      if (Math.abs(order.expiresAt.getTime() - expectedExpiresAt.getTime()) > 60_000) return;
      if (order.expiresAt.getTime() <= Date.now()) return;

      const products = order.items.map((item) => item.product);
      const birds = products.filter((product) => product.type === "BIRD");
      const hasItems = products.some((product) => product.type === "ITEM");

      let orderKind: OrderKind = { type: "mixed" };
      if (birds.length > 0 && !hasItems) {
        const firstPurpose = birds[0].purpose as OrderItemPurpose;
        orderKind = {
          type: "birds_only",
          purpose: birds.every((bird) => bird.purpose === firstPurpose) ? firstPurpose : null,
        };
      } else if (birds.length === 0 && hasItems) {
        orderKind = { type: "articles_only" };
      }

      await whatsappQueue.add("order-reminder", {
        kind: "order-reminder",
        orderId: order.id.toString(),
        recipientPhone: order.customerPhone,
        orderKind,
        timeRemaining: formatTimeRemaining(order.expiresAt),
      });

      return;
    }

    const expectedReleaseAt = new Date(data.expectedReleaseAt);
    if (expectedReleaseAt.getTime() <= Date.now()) return;

    const sales = await rafflePrisma.ticketSale.findMany({
      where: {
        id: { in: data.ticketSaleIds },
        paymentStatus: "PENDING",
      },
      include: { raffle: true },
    });

    if (sales.length === 0) return;

    await whatsappQueue.add("reservation-reminder", {
      kind: "reservation-reminder",
      ticketSaleIds: sales.map((sale) => sale.id),
      recipientPhone: sales[0].customerPhone,
      timeRemaining: formatTimeRemaining(expectedReleaseAt),
    });
  },
  { connection },
);

export const getReminderDelayMs = (
  releaseHours: number,
  reminderHoursBefore: number,
): number | null => {
  if (!Number.isFinite(releaseHours) || !Number.isFinite(reminderHoursBefore)) return null;
  if (releaseHours <= 0 || reminderHoursBefore <= 0) return null;
  if (reminderHoursBefore >= releaseHours) return null;

  return Math.round((releaseHours - reminderHoursBefore) * 3600 * 1000);
};

function formatTimeRemaining(expiresAt: Date): string {
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));

  if (totalMinutes < 60) {
    return `${totalMinutes} minuto${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.ceil(totalMinutes / 60);
  return `${hours} hora${hours === 1 ? "" : "s"}`;
}
