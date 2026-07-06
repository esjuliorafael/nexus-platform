import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { OrderKind } from "../services/evolution/channel.resolver";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export type WhatsappJobData =
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
      kind: "reservation-reminder";
      ticketSaleIds: number[];
      recipientPhone: string;
      timeRemaining: string;
    };

export const whatsappQueue = new Queue<WhatsappJobData>(
  "whatsapp-notifications",
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  }
);
