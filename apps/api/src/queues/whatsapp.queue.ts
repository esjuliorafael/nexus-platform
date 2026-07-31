import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { OrderKind } from "../services/evolution/channel.resolver";
import type { WhatsappProviderKind } from "../services/whatsapp/whatsapp-provider.types";
import { queueName } from "./queue-name";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export type WhatsappJobRouting = {
  forcePrincipal?: boolean;
  forceProvider?: WhatsappProviderKind;
  fallbackDepth?: number;
  /** @deprecated Use forceProvider instead. */
  forceEvolution?: boolean;
  fallbackOfMessageId?: string;
};

export type WhatsappJobData = (
  | {
      kind: "order";
      orderId: string;
      recipientPhone: string;
      orderKind: OrderKind;
      timeLimit?: string;
    }
  | {
      kind: "reservation";
      ticketSaleIds: number[];
      recipientPhone: string;
      timeLimit?: string;
    }
  | {
      kind: "order-cancelled";
      orderId: string;
      recipientPhone: string;
      orderKind: OrderKind;
      timeLimit?: string;
    }
  | {
      kind: "reservation-cancelled";
      ticketSaleIds: number[];
      recipientPhone: string;
      timeLimit?: string;
    }
  | {
      kind: "order-paid";
      orderId: string;
      recipientPhone: string;
      orderKind: OrderKind;
    }
  | {
      kind: "order-refunded";
      orderId: string;
      recipientPhone: string;
      orderKind: OrderKind;
    }
  | {
      kind: "order-restored";
      orderId: string;
      recipientPhone: string;
      orderKind: OrderKind;
      timeLimit?: string;
    }
  | {
      kind: "order-reminder";
      orderId: string;
      recipientPhone: string;
      orderKind: OrderKind;
      timeRemaining: string;
    }
  | {
      kind: "reservation-paid";
      ticketSaleIds: number[];
      recipientPhone: string;
    }
  | {
      kind: "reservation-refunded";
      ticketSaleIds: number[];
      recipientPhone: string;
    }
  | {
      kind: "reservation-restored";
      ticketSaleIds: number[];
      recipientPhone: string;
      timeLimit: string;
    }
  | {
      kind: "reservation-reminder";
      ticketSaleIds: number[];
      recipientPhone: string;
      timeRemaining: string;
    }
  | {
      kind: "raffle-opening";
      subscriptionId: string;
      recipientPhone: string;
    }
  | {
      kind: "raffle-result";
      campaignRecipientId: string;
      recipientPhone: string;
    }
  | {
      kind: "raffle-draw-reminder";
      campaignRecipientId: string;
      recipientPhone: string;
    }
  | {
      kind: "raffle-draw-reminder-dispatch";
      campaignId: string;
    }
  | {
      kind: "raffle-invitation";
      campaignRecipientId: string;
      recipientPhone: string;
    }
  | {
      kind: "store-payment-recovery";
      holdId: string;
      recoveryToken: string;
      recipientPhone: string;
    }
  | {
      kind: "raffle-payment-recovery";
      holdId: string;
      recoveryToken: string;
      recipientPhone: string;
    }
) &
  WhatsappJobRouting;

export const whatsappQueue = new Queue<WhatsappJobData>(
  queueName("whatsapp-notifications"),
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      // Disconnected instances are recovered after Evolution reports them open again.
      removeOnFail: 5000,
    },
  },
);
