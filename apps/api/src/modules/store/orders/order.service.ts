import { storePrisma } from "@nexus/db/store";
import { OrderStatus } from "@prisma/client-store";
import { orderReleaseQueue } from "../../../queues/order-release.queue";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { OrderKind, OrderItemPurpose } from "../../../services/evolution/channel.resolver";

export const orderService = {
  async getAll(status: OrderStatus | undefined, userId: number) {
    const orders = await storePrisma.order.findMany({
      where: status ? { status } : {},
      include: {
        items: true,
        reads: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map(({ reads, ...order }) => ({
      ...order,
      isRead: reads.length > 0,
      readAt: reads[0]?.readAt ?? null,
    }));
  },

  async markRead(ids: number[], userId: number) {
    const orders = await storePrisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (orders.length === 0) return { count: 0 };

    const result = await storePrisma.orderRead.createMany({
      data: orders.map((order) => ({ orderId: order.id, userId })),
      skipDuplicates: true,
    });

    return { count: result.count };
  },

  async getById(id: number) {
    return storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  },

  async create(data: any) {
    const settings = await storePrisma.setting.findMany();
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const productIds = data.items.map((i: any) => i.productId);
    const products = await storePrisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new Error("Some products were not found");
    }

    // Check availability
    for (const product of products) {
      if (product.saleStatus !== "AVAILABLE" || !product.active) {
        throw new Error(`Product ${product.name} is not available`);
      }
    }

    // Calculate costs
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      subtotal += Number(product.price) * item.quantity;
      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        productType: product.type,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    let shippingCost = 0;
    if (data.deliveryType === "SHIPPING") {
      const shippingZone = await storePrisma.shippingZone.findFirst({
        where: { name: data.shippingState },
      });

      const costBaseKey = shippingZone?.zoneType === "EXTENDED" 
        ? "shipping_cost_extended" 
        : "shipping_cost_standard";
      
      shippingCost = Number(settingsMap[costBaseKey] || 0);
    }

    const total = subtotal + shippingCost;

    const isReleaseActive = settingsMap["inventory_release_active"] === "1";
    const releaseHours = Number(settingsMap["inventory_release_hours"] || 24);
    const expiresAt = isReleaseActive 
      ? new Date(Date.now() + releaseHours * 3600 * 1000) 
      : null;

    const order = await storePrisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          shippingAddress: data.shippingAddress,
          shippingState: data.shippingState,
          deliveryType: data.deliveryType,
          subtotal,
          shippingCost,
          total,
          status: "PENDING",
          expiresAt,
          items: {
            create: orderItemsData,
          },
        },
      });

      // Reserve inventory
      for (const item of orderItemsData) {
        if (item.productType === "BIRD") {
          await tx.product.update({
            where: { id: item.productId },
            data: { saleStatus: "RESERVED" },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return newOrder;
    });

    // Schedule auto-release if active
    if (isReleaseActive) {
      await orderReleaseQueue.add(
        "release",
        { orderId: order.id },
        { delay: releaseHours * 3600 * 1000 }
      );
    }

    // Enqueue WhatsApp notification
    const birds = products.filter((p) => p.type === "BIRD");
    const hasItems = products.some((p) => p.type === "ITEM");

    let orderKind: OrderKind = { type: "mixed" };
    if (birds.length > 0 && !hasItems) {
      const firstPurpose = birds[0].purpose as OrderItemPurpose;
      const allSamePurpose = birds.every((b) => b.purpose === firstPurpose);
      orderKind = {
        type: "birds_only",
        purpose: allSamePurpose ? firstPurpose : null,
      };
    } else if (birds.length === 0 && hasItems) {
      orderKind = { type: "articles_only" };
    }

    await whatsappQueue.add("order-notification", {
      kind: "order",
      orderId: order.id.toString(),
      recipientPhone: order.customerPhone,
      orderKind,
      timeLimit: `${releaseHours} horas`
    });

    return order;
  },

  async updateStatus(id: number, status: OrderStatus) {
    const currentOrder = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!currentOrder) throw new Error("Order not found");

    const order = await storePrisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: true }
      });

      if (status === 'PAID') {
        for (const item of updatedOrder.items) {
          if (item.productType === 'BIRD') {
            await tx.product.update({
              where: { id: item.productId },
              data: { saleStatus: 'SOLD' }
            });
          }
          // Items' stock was already decremented at order creation.
        }
      }

      return updatedOrder;
    });

    if (status === 'PAID') {
      console.log(`[Order] Order #${id} marked as PAID. Triggering WhatsApp...`);
      
      // Determine Order Kind for WhatsApp
      const products = await storePrisma.product.findMany({
        where: { id: { in: order.items.map(i => i.productId) } }
      });
      const birds = products.filter(p => p.type === 'BIRD');
      const hasItems = products.some(p => p.type === 'ITEM');

      let orderKind: OrderKind = { type: "mixed" };
      if (birds.length > 0 && !hasItems) {
        const firstPurpose = birds[0].purpose as OrderItemPurpose;
        orderKind = { type: "birds_only", purpose: birds.every(b => b.purpose === firstPurpose) ? firstPurpose : null };
      } else if (birds.length === 0 && hasItems) {
        orderKind = { type: "articles_only" };
      }

      await whatsappQueue.add("order-paid", {
        kind: "order-paid",
        orderId: order.id.toString(),
        recipientPhone: order.customerPhone,
        orderKind
      });
    }

    return order;
  },

  async cancelOrder(id: number) {
    const order = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    return storePrisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

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

      return cancelledOrder;
    });
  },

  async resendNotification(id: number) {
    const order = await storePrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    const settings = await storePrisma.setting.findMany({
      where: { key: "inventory_release_hours" }
    });
    const releaseHours = Number(settings[0]?.value || 24);

    const birds = order.items.filter((i) => i.productType === "BIRD");
    const hasItems = order.items.some((i) => i.productType === "ITEM");

    let orderKind: OrderKind = { type: "mixed" };
    if (birds.length > 0 && !hasItems) {
      // Simplification: just assume first bird purpose for resend
      const firstProduct = await storePrisma.product.findUnique({ where: { id: birds[0].productId } });
      orderKind = {
        type: "birds_only",
        purpose: firstProduct?.purpose as OrderItemPurpose,
      };
    } else if (birds.length === 0 && hasItems) {
      orderKind = { type: "articles_only" };
    }

    await whatsappQueue.add("order-notification", {
      kind: order.status === 'PAID' ? 'order-paid' : 'order',
      orderId: order.id.toString(),
      recipientPhone: order.customerPhone,
      orderKind,
      timeLimit: `${releaseHours} horas`
    });

    return { success: true };
  },
};
