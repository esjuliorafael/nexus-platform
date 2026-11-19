import assert from "node:assert/strict";
import test from "node:test";
import { OrderStatus } from "@prisma/client-store";
import {
  replacePaidBirdOrderItem,
  type ReplacePaidBirdOrderItemInput,
} from "../src/modules/store/orders/order-item-replacement.service";

const input: ReplacePaidBirdOrderItemInput = {
  sourceProductId: 10,
  replacementProductId: 11,
  reason: "El cliente eligió otra ave",
  customerAuthorized: true,
  deliveryConfirmed: true,
};

const actor = {
  type: "USER" as const,
  userId: 7,
  name: "Admin Nexus",
  role: "ADMIN",
  origin: "ADMIN" as const,
};

function createPrismaFixture(options: {
  orderStatus?: OrderStatus;
  paymentStatus?: string;
  sourcePrice?: string;
  replacementPrice?: string;
  replacementAvailable?: boolean;
  sourceSold?: boolean;
  replacementClaimFails?: boolean;
} = {}) {
  const order = {
    id: 42,
    status: options.orderStatus ?? OrderStatus.PAID,
    paymentStatus: options.paymentStatus ?? "APPROVED",
    total: "3400.00",
    items: [{
      id: 91,
      orderId: 42,
      productId: 10,
      productName: "Giro BF",
      productType: "BIRD",
      productRingNumber: "888 Verde",
      productAge: "COCK",
      productPurpose: "COMBAT",
      quantity: 1,
      unitPrice: "3400.00",
    }],
    events: [],
  };
  const products = new Map<number, any>([
    [10, {
      id: 10,
      name: "Giro BF",
      type: "BIRD",
      price: options.sourcePrice ?? "4000.00",
      active: true,
      published: true,
      saleStatus: options.sourceSold === false ? "AVAILABLE" : "SOLD",
      ringNumber: "888 Verde",
      age: "COCK",
      purpose: "COMBAT",
    }],
    [11, {
      id: 11,
      name: "Morado Patas Verdes",
      type: "BIRD",
      price: options.replacementPrice ?? "4000.00",
      active: true,
      published: true,
      saleStatus: options.replacementAvailable === false ? "SOLD" : "AVAILABLE",
      ringNumber: "993 Verde",
      age: "COCK",
      purpose: "COMBAT",
    }],
  ]);
  const events: any[] = [];
  let inventoryWrites = 0;

  const tx = {
    order: {
      updateMany: async ({ where }: any) => ({
        count: order.id === where.id &&
          order.status === where.status &&
          order.paymentStatus === where.paymentStatus ? 1 : 0,
      }),
      findUnique: async () => order,
      findUniqueOrThrow: async () => order,
    },
    product: {
      findUnique: async ({ where }: any) => products.get(where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        const product = products.get(where.id);
        if (where.id === 11 && options.replacementClaimFails) {
          return { count: 0 };
        }
        if (!product || product.saleStatus !== where.saleStatus) return { count: 0 };
        if (where.type && product.type !== where.type) return { count: 0 };
        if (where.active === true && !product.active) return { count: 0 };
        if (where.published === true && !product.published) return { count: 0 };
        product.saleStatus = data.saleStatus;
        inventoryWrites += 1;
        return { count: 1 };
      },
    },
    orderItem: {
      update: async ({ where, data }: any) => {
        const item = order.items.find((candidate: any) => candidate.id === where.id);
        Object.assign(item, data);
        return item;
      },
    },
    orderEvent: {
      create: async ({ data }: any) => {
        events.push(data);
        return data;
      },
    },
  };
  const prisma = {
    $transaction: async (callback: (client: any) => unknown) => {
      const productStatuses = new Map(
        [...products].map(([id, product]) => [id, product.saleStatus]),
      );
      const originalItems = order.items.map((item) => ({ ...item }));
      const eventCount = events.length;
      const writeCount = inventoryWrites;
      try {
        return await callback(tx);
      } catch (error) {
        for (const [id, status] of productStatuses) {
          const product = products.get(id);
          if (product) product.saleStatus = status;
        }
        order.items.splice(0, order.items.length, ...originalItems);
        events.splice(eventCount);
        inventoryWrites = writeCount;
        throw error;
      }
    },
  };

  return { prisma: prisma as any, order, products, events, getInventoryWrites: () => inventoryWrites };
}

test("replaces a paid bird atomically, preserves the charged amount, and audits consent", async () => {
  const fixture = createPrismaFixture();

  const updated = await replacePaidBirdOrderItem(
    fixture.prisma,
    42,
    input,
    actor,
  );

  assert.equal(fixture.products.get(10)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.products.get(11)?.saleStatus, "SOLD");
  assert.equal(fixture.getInventoryWrites(), 2);
  assert.equal(updated.items[0].productId, 11);
  assert.equal(updated.items[0].productName, "Morado Patas Verdes");
  assert.equal(updated.items[0].unitPrice, "3400.00");
  assert.equal(updated.total, "3400.00");
  assert.equal(fixture.events.length, 1);
  assert.equal(fixture.events[0].eventType, "ORDER_ITEM_REPLACED");
  assert.equal(fixture.events[0].actorUserId, 7);
  assert.equal(fixture.events[0].metadata.customerAuthorized, true);
  assert.equal(fixture.events[0].metadata.deliveryConfirmed, true);
  assert.equal(fixture.events[0].metadata.reason, input.reason);
  assert.equal(fixture.events[0].previousState.item.productId, 10);
  assert.equal(fixture.events[0].nextState.item.productId, 11);
});

test("rejects shipped or otherwise non-paid orders before inventory changes", async () => {
  const fixture = createPrismaFixture({ orderStatus: OrderStatus.SHIPPED });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /pagadas y no enviadas/,
  );
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});

test("rejects an order whose payment is not approved", async () => {
  const fixture = createPrismaFixture({ paymentStatus: "PENDING" });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /pagadas y no enviadas/,
  );
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});

test("rejects a different catalog price without changing inventory", async () => {
  const fixture = createPrismaFixture({ replacementPrice: "5000.00" });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /mismo precio de catálogo/,
  );
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});

test("preserves a coupon-discounted snapshot when catalog prices match", async () => {
  const fixture = createPrismaFixture();
  fixture.order.items[0].unitPrice = "3400.00";

  await replacePaidBirdOrderItem(fixture.prisma, 42, input, actor);

  assert.equal(fixture.order.items[0].unitPrice, "3400.00");
  assert.equal(fixture.order.total, "3400.00");
});

test("rejects when the replacement was claimed concurrently", async () => {
  const fixture = createPrismaFixture({ replacementClaimFails: true });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /dejar de estar disponible/,
  );
  assert.equal(fixture.products.get(10)?.saleStatus, "SOLD");
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});

test("rolls back the replacement claim if the original bird cannot be released", async () => {
  const fixture = createPrismaFixture({ sourceSold: false });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /No se pudo liberar el ave original/,
  );
  assert.equal(fixture.products.get(10)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.products.get(11)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});
