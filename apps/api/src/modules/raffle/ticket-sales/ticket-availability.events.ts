import IORedis from "ioredis";
import { queueName } from "../../../queues/queue-name";

type TicketAvailabilityEvent = {
  type: "availability-changed";
  raffleId: number;
  occurredAt: string;
};

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const channelPrefix = `${queueName("raffle-ticket-availability")}:`;
const publisher = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const subscriber = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const listeners = new Map<number, Set<(event: TicketAvailabilityEvent) => void>>();
const globalListeners = new Set<(event: TicketAvailabilityEvent) => void>();

subscriber.psubscribe(`${channelPrefix}*`).catch((error) => {
  console.error("[Raffle availability] Redis subscription failed:", error.message);
});

subscriber.on("pmessage", (_pattern, channel, payload) => {
  if (!channel.startsWith(channelPrefix)) return;

  try {
    const event = JSON.parse(payload) as TicketAvailabilityEvent;
    listeners.get(event.raffleId)?.forEach((listener) => listener(event));
    globalListeners.forEach((listener) => listener(event));
  } catch (error) {
    console.error("[Raffle availability] Invalid event payload:", error);
  }
});

export async function publishTicketAvailabilityChanged(raffleId: number) {
  const event: TicketAvailabilityEvent = {
    type: "availability-changed",
    raffleId,
    occurredAt: new Date().toISOString(),
  };

  await publisher.publish(`${channelPrefix}${raffleId}`, JSON.stringify(event));
}

export function subscribeToTicketAvailability(
  raffleId: number,
  listener: (event: TicketAvailabilityEvent) => void,
) {
  const raffleListeners = listeners.get(raffleId) ?? new Set();
  raffleListeners.add(listener);
  listeners.set(raffleId, raffleListeners);

  return () => {
    raffleListeners.delete(listener);
    if (raffleListeners.size === 0) listeners.delete(raffleId);
  };
}

export function subscribeToAllTicketAvailability(
  listener: (event: TicketAvailabilityEvent) => void,
) {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}
