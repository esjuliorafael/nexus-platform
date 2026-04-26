import { storePrisma } from "@nexus/db/store";
import { OrderStatus } from "@prisma/client-store";
import { orderReleaseQueue } from "../../../queues/order-release.queue";

export const orderService = {
  async getAll(status?: OrderStatus) {
    return storePrisma.order.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
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
    const orderItemsData = [];

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
        where: { state: data.shippingState },
      });

      const costBaseKey = shippingZone?.zoneType === "EXTENDED" 
        ? "shipping_cost_extended" 
        : "shipping_cost_normal";
      
      shippingCost = Number(settingsMap[costBaseKey] || 0);
    }

    const total = subtotal + shippingCost;

    const order = await storePrisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress,
          shippingState: data.shippingState,
          deliveryType: data.deliveryType,
          subtotal,
          shippingCost,
          total,
          status: "PENDING",
          items: {
            create: orderItemsData,
          },
        },
      });

      // Reserve birds
      for (const product of products) {
        if (product.type === "BIRD") {
          await tx.product.update({
            where: { id: product.id },
            data: { saleStatus: "RESERVED" },
          });
        }
      }

      return newOrder;
    });

    // Schedule auto-release
    const releaseHours = Number(settingsMap["inventory_release_hours"] || 24);
    await orderReleaseQueue.add(
      "release",
      { orderId: order.id },
      { delay: releaseHours * 3600 * 1000 }
    );

    return order;
  },

  async updateStatus(id: number, status: OrderStatus) {
    return storePrisma.order.update({
      where: { id },
      data: { status },
    });
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
        await tx.product.update({
          where: { id: item.productId },
          data: { saleStatus: "AVAILABLE" },
        });
      }

      return cancelledOrder;
    });
  },
};
