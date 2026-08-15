import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { whatsappQueue } from "./whatsapp.queue";
import { queueName } from "./queue-name";
import { publishTicketAvailabilityChanged } from "../modules/raffle/ticket-sales/ticket-availability.events";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const ticketReleaseQueue = new Queue(queueName("ticket-release"), { connection });

export const ticketReleaseWorker = new Worker(
  queueName("ticket-release"),
  async (job: Job) => {
    const { ticketSaleIds, expectedReleaseAt } = job.data;
    const { rafflePrisma } = await import("@nexus/db/raffle");

    if (expectedReleaseAt && new Date(expectedReleaseAt).getTime() > Date.now()) {
      return;
    }

    let sales = await rafflePrisma.ticketSale.findMany({
      where: {
        id: { in: ticketSaleIds },
        paymentStatus: "PENDING",
      },
    });

    if (sales.length > 0) {
      const participationId = sales[0].reservationId || `sale-${sales[0].id}`;
      const newerDeadline = await rafflePrisma.raffleParticipationEvent.findFirst({
        where: {
          participationId,
          eventType: "RESERVATION_DEADLINE_UPDATED",
          createdAt: { gt: new Date(job.timestamp) },
        },
        select: { id: true },
      });
      if (newerDeadline) return;
      const newerRestoration = await rafflePrisma.raffleParticipationEvent.findFirst({
        where: {
          participationId,
          eventType: "RESTORED",
          createdAt: { gt: new Date(job.timestamp) },
        },
        select: { id: true },
      });
      if (newerRestoration) return;
    }

    if (sales[0]?.paymentMethod === "MERCADOPAGO" && sales[0].mpPaymentId) {
      try {
        const { mpService } = await import("../modules/store/payments/mercadopago.service");
        await mpService.reconcilePayment(sales[0].mpPaymentId, sales[0].mpSellerUserId);
        sales = await rafflePrisma.ticketSale.findMany({
          where: { id: { in: ticketSaleIds }, paymentStatus: "PENDING" },
        });
      } catch (error) {
        console.error(`[Raffle release] Could not reconcile Mercado Pago payment ${sales[0].mpPaymentId}:`, error);
        throw error;
      }
    }

    if (sales.length > 0) {
      const couponIds = Array.from(new Set(sales.map((sale) => sale.couponId).filter((id): id is number => Boolean(id))));
      const participationId = sales[0].reservationId || `sale-${sales[0].id}`;
      await rafflePrisma.$transaction(async (tx) => {
        await tx.ticketSale.updateMany({
          where: { id: { in: sales.map(s => s.id) } },
          data: { paymentStatus: "CANCELLED" },
        });

        if (couponIds.length > 0) {
          await Promise.all(couponIds.map((couponId) => tx.raffleCoupon.update({
            where: { id: couponId },
            data: { usedCount: { decrement: 1 } },
          })));
        }

        await tx.raffleParticipationEvent.create({
          data: {
            participationId,
            raffleId: sales[0].raffleId,
            eventType: "AUTO_CANCELLED",
            message: "Participación cancelada automáticamente por vencimiento del apartado.",
            actorType: "SYSTEM",
            actorName: "Sistema",
            origin: "SYSTEM",
            previousState: { paymentStatus: "PENDING" },
            nextState: { paymentStatus: "CANCELLED" },
            metadata: {
              ticketNumbers: sales.map((sale) => sale.ticketNumber),
            },
          },
        });
      });

      console.log(`Auto-released ${sales.length} tickets.`);
      void publishTicketAvailabilityChanged(sales[0].raffleId).catch((error) => {
        console.error("[Raffle availability] Could not publish release change:", error);
      });

      if (sales[0].paymentMethod !== "MERCADOPAGO") {
        await whatsappQueue.add("reservation-cancelled", {
          kind: "reservation-cancelled",
          ticketSaleIds: sales.map(s => s.id),
          recipientPhone: sales[0].customerPhone,
        });
      }
    }
  },
  { connection }
);
