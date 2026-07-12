import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { whatsappQueue } from "./whatsapp.queue";
import type { OrderKind, OrderItemPurpose } from "../services/evolution/channel.resolver";
import { queueName } from "./queue-name";

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
  queueName("reservation-reminders"),
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

export const getOrderReminderJobId = (orderId: number, expiresAt: Date) =>
  `order-reminder-${orderId}-${expiresAt.getTime()}`;

export const reservationReminderWorker = new Worker<ReservationReminderJobData>(
  queueName("reservation-reminders"),
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

export const reconcilePendingOrderReminders = async (limit = 200) => {
  const settings = await storePrisma.setting.findMany({
    where: {
      key: {
        in: ["inventory_reminder_active", "inventory_reminder_hours_before"],
      },
    },
    select: { key: true, value: true },
  });
  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value || ""]));
  const reminderActive = ["1", "true"].includes(
    (settingsMap.get("inventory_reminder_active") || "").toLowerCase(),
  );
  const reminderHoursBefore = Number(
    settingsMap.get("inventory_reminder_hours_before") || 4,
  );

  if (!reminderActive || !Number.isFinite(reminderHoursBefore) || reminderHoursBefore <= 0) {
    return { scanned: 0, scheduled: 0 };
  }

  const now = new Date();
  const orders = await storePrisma.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "TRANSFER",
      expiresAt: { gt: now },
    },
    select: { id: true, expiresAt: true },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  if (orders.length === 0) return { scanned: 0, scheduled: 0 };

  const attemptedLogs = await storePrisma.whatsappMessageLog.findMany({
    where: {
      orderId: { in: orders.map((order) => order.id.toString()) },
      templateUsed: "order_reminder",
    },
    select: { orderId: true },
  });
  const attemptedOrderIds = new Set(attemptedLogs.map((log) => log.orderId));
  const queuedJobs = await reservationReminderQueue.getJobs(
    ["delayed", "waiting", "active"],
    0,
    Math.max(limit * 2, 400),
  );
  const queuedOrderExpirations = new Set(
    queuedJobs.flatMap((job) => {
      if (job.data.kind !== "order") return [];
      return [`${job.data.orderId}:${job.data.expectedExpiresAt}`];
    }),
  );
  let scheduled = 0;

  for (const order of orders) {
    if (!order.expiresAt || attemptedOrderIds.has(order.id.toString())) continue;

    const expectedExpiresAt = order.expiresAt.toISOString();
    if (queuedOrderExpirations.has(`${order.id}:${expectedExpiresAt}`)) continue;

    const jobId = getOrderReminderJobId(order.id, order.expiresAt);
    if (await reservationReminderQueue.getJob(jobId)) continue;

    const reminderAt = new Date(
      order.expiresAt.getTime() - reminderHoursBefore * 3600 * 1000,
    );
    const delay = Math.max(0, reminderAt.getTime() - Date.now());

    await reservationReminderQueue.add(
      "order-reminder",
      {
        kind: "order",
        orderId: order.id,
        expectedExpiresAt,
      },
      { delay, jobId },
    );
    scheduled += 1;
  }

  return { scanned: orders.length, scheduled };
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
