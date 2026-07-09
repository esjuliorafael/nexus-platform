import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { storePrisma } from "@nexus/db/store";
import { whatsappQueue } from "./whatsapp.queue";
import type { OrderKind } from "../services/evolution/channel.resolver";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const orderReleaseQueue = new Queue("order-release", { connection });

export const orderReleaseWorker = new Worker(
  "order-release",
  async (job: Job) => {
    const { orderId } = job.data;

    const order = await storePrisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (
      order &&
      order.status === "PENDING" &&
      order.expiresAt &&
      order.expiresAt.getTime() <= Date.now()
    ) {
      await storePrisma.$transaction(async (tx) => {
        // Cancel the order
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            paymentStatus: order.paymentMethod === "MERCADOPAGO" ? "EXPIRED" : "CANCELLED",
            paymentExpiresAt: null,
          },
        });

        // Restore product availability for each item in the order
        for (const item of order.items) {
          if (item.productType === "BIRD") {
            await tx.product.update({
              where: { id: item.productId },
              data: { saleStatus: "AVAILABLE" },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.orderEvent.create({
          data: {
            orderId,
            eventType: "AUTO_CANCELLED",
            message: order.paymentMethod === "MERCADOPAGO"
              ? "Intento de pago con tarjeta expirado. Inventario liberado sin notificacion de apartado."
              : "Orden cancelada automaticamente por vencimiento del tiempo limite.",
          },
        });
      });

      console.log(`Order ${orderId} auto-cancelled and inventory released.`);

      if (order.paymentMethod === "MERCADOPAGO") return;

      // Determine orderKind for notification
      const products = order.items.map(i => i.product);
      const birds = products.filter((p) => p.type === "BIRD");
      const hasItems = products.some((p) => p.type === "ITEM");

      let orderKind: OrderKind = { type: "mixed" };
      if (birds.length > 0 && !hasItems) {
        const firstPurpose = birds[0].purpose as any;
        const allSamePurpose = birds.every((b) => b.purpose === firstPurpose);
        orderKind = {
          type: "birds_only",
          purpose: allSamePurpose ? firstPurpose : null,
        };
      } else if (birds.length === 0 && hasItems) {
        orderKind = { type: "articles_only" };
      }

      // Enqueue cancellation notification
      await whatsappQueue.add("order-cancelled", {
        kind: "order-cancelled",
        orderId: order.id.toString(),
        recipientPhone: order.customerPhone,
        orderKind,
      });
    }
  },
  { connection }
);
