import { rafflePrisma } from "@nexus/db/raffle";
import { whatsappQueue } from "../queues/whatsapp.queue";

const MAX_OPENING_NOTIFICATION_ATTEMPTS = 9;
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

type SchedulableSubscription = {
  id: string;
  phone: string;
  attempts: number;
  status: "PENDING" | "FAILED" | "PROCESSING" | "SENT" | "CANCELLED";
  raffle: {
    id: number;
    status: "ACTIVE" | "FINISHED" | "CANCELLED";
    published: boolean;
    participationStartsAt: Date | null;
    participationEndsAt: Date | null;
  };
};

const scheduleSubscription = async (subscription: SchedulableSubscription) => {
  const { raffle } = subscription;
  const now = Date.now();

  if (subscription.attempts >= MAX_OPENING_NOTIFICATION_ATTEMPTS) {
    if (subscription.status !== "FAILED") {
      await rafflePrisma.raffleOpeningSubscription.update({
        where: { id: subscription.id },
        data: { status: "FAILED" },
      });
    }
    return false;
  }

  if (
    raffle.status !== "ACTIVE" ||
    !raffle.participationStartsAt ||
    (raffle.participationEndsAt && raffle.participationEndsAt.getTime() <= now)
  ) {
    if (subscription.status !== "CANCELLED") {
      await rafflePrisma.raffleOpeningSubscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELLED" },
      });
    }
    return false;
  }

  if (!raffle.published) return false;

  const startsAt = raffle.participationStartsAt.getTime();
  const jobId = [
    "raffle-opening",
    subscription.id,
    startsAt,
    subscription.attempts,
  ].join("-");
  const existingJob = await whatsappQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "completed" || state === "failed") {
      await existingJob.remove();
    } else {
      return false;
    }
  }

  await whatsappQueue.add(
    "raffle-opening",
    {
      kind: "raffle-opening",
      subscriptionId: subscription.id,
      recipientPhone: subscription.phone,
    },
    {
      jobId,
      delay: Math.max(0, startsAt - now),
    },
  );

  return true;
};

export async function scheduleRaffleOpeningSubscription(subscriptionId: string) {
  const subscription = await rafflePrisma.raffleOpeningSubscription.findUnique({
    where: { id: subscriptionId },
    include: { raffle: true },
  });
  if (!subscription) return false;
  return scheduleSubscription(subscription as SchedulableSubscription);
}

export async function reconcileRaffleOpeningNotifications(raffleId?: number) {
  const staleBefore = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
  await rafflePrisma.raffleOpeningSubscription.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: staleBefore },
      ...(raffleId ? { raffleId } : {}),
    },
    data: {
      status: "FAILED",
      lastError: "El proceso anterior no concluyó y será reintentado.",
    },
  });

  const subscriptions = await rafflePrisma.raffleOpeningSubscription.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_OPENING_NOTIFICATION_ATTEMPTS },
      ...(raffleId ? { raffleId } : {}),
    },
    include: { raffle: true },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });

  let scheduled = 0;
  for (const subscription of subscriptions) {
    if (await scheduleSubscription(subscription as SchedulableSubscription)) {
      scheduled += 1;
    }
  }

  return { scanned: subscriptions.length, scheduled };
}
