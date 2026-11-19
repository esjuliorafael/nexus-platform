import assert from "node:assert/strict";
import test from "node:test";
import { OrderStatus } from "@prisma/client-store";
import {
  previewBirdOrderItemReplacement,
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

const couponSnapshot = {
  code: "BUENFIN",
  discountType: "PERCENTAGE",
  discountValue: "15",
  scope: "BIRD",
  birdPurpose: null,
  minSubtotal: null,
  maxDiscount: null,
};

function createPrismaFixture(options: {
  orderStatus?: OrderStatus;
  paymentStatus?: string;
  paymentMethod?: string;
  sourcePrice?: string;
  replacementPrice?: string;
  replacementPurpose?: string;
  replacementAvailable?: boolean;
  sourceInventoryStatus?: string;
  replacementClaimFails?: boolean;
  couponSnapshot?: any;
  couponDiscountValue?: string;
  couponScope?: string;
  couponBirdPurpose?: string | null;
  couponCode?: string | null;
  couponId?: number | null;
  discountTotal?: string;
  paidAmount?: string;
  total?: string;
} = {}) {
  const sourcePrice = options.sourcePrice ?? "4000.00";
  const replacementPrice = options.replacementPrice ?? "4000.00";
  const discountTotal = options.discountTotal ?? "600.00";
  const total = options.total ?? "3400.00";
  const paymentMethod = options.paymentMethod ?? "TRANSFER";
  const paymentStatus = options.paymentStatus ?? "APPROVED";
  const orderStatus = options.orderStatus ?? OrderStatus.PAID;
  const order = {
    id: 42,
    status: orderStatus,
    paymentStatus,
    paymentMethod,
    subtotal: sourcePrice,
    discountTotal,
    total,
    shippingCost: "0.00",
    paidAmount: options.paidAmount ?? (orderStatus === OrderStatus.PAID ? total : "0.00"),
    mpPaidAmount: paymentMethod === "MERCADOPAGO" ? total : null,
    mpRefundedAmount: "0.00",
    couponId: options.couponId === undefined ? 5 : options.couponId,
    couponCode: options.couponCode === undefined ? "BUENFIN" : options.couponCode,
    couponSnapshot: options.couponSnapshot === undefined ? couponSnapshot : options.couponSnapshot,
    expiresAt: orderStatus === OrderStatus.PENDING && paymentStatus === "PENDING"
      ? new Date(Date.now() + 60_000)
      : null,
    paymentExpiresAt: null,
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
      unitPrice: sourcePrice,
    }],
    events: [] as any[],
  };
  const products = new Map<number, any>([
    [10, {
      id: 10,
      name: "Giro BF",
      type: "BIRD",
      price: sourcePrice,
      active: true,
      published: true,
      saleStatus: options.sourceInventoryStatus ?? (orderStatus === OrderStatus.PAID ? "SOLD" : "RESERVED"),
      ringNumber: "888 Verde",
      age: "COCK",
      purpose: "COMBAT",
    }],
    [11, {
      id: 11,
      name: "Morado Patas Verdes",
      type: "BIRD",
      price: replacementPrice,
      active: true,
      published: true,
      saleStatus: options.replacementAvailable === false ? "SOLD" : "AVAILABLE",
      ringNumber: "993 Verde",
      age: "COCK",
      purpose: options.replacementPurpose ?? "COMBAT",
    }],
  ]);
  const events: any[] = [];
  let inventoryWrites = 0;
  const coupon = {
    code: options.couponCode ?? "BUENFIN",
    discountType: "PERCENTAGE",
    discountValue: options.couponDiscountValue ?? "15",
    scope: options.couponScope ?? "BIRD",
    birdPurpose: options.couponBirdPurpose ?? null,
    minSubtotal: null,
    maxDiscount: null,
  };

  const tx = {
    order: {
      findUnique: async () => order,
      findUniqueOrThrow: async () => order,
      updateMany: async ({ where }: any) => ({
        count: order.id === where.id &&
          order.status === where.status &&
          order.paymentStatus === where.paymentStatus ? 1 : 0,
      }),
      update: async ({ data }: any) => Object.assign(order, data),
    },
    product: {
      findUnique: async ({ where }: any) => products.get(where.id) ?? null,
      updateMany: async ({ where, data }: any) => {
        const product = products.get(where.id);
        if (where.id === 11 && options.replacementClaimFails) return { count: 0 };
        if (!product || product.saleStatus !== where.saleStatus) return { count: 0 };
        if (where.type && product.type !== where.type) return { count: 0 };
        if (where.active === true && !product.active) return { count: 0 };
        if (where.published === true && !product.published) return { count: 0 };
        product.saleStatus = data.saleStatus;
        inventoryWrites += 1;
        return { count: 1 };
      },
    },
    coupon: {
      findUnique: async ({ where }: any) => where.id === 5 ? coupon : null,
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
        order.events.unshift(data);
        return data;
      },
    },
  };
  const prisma = {
    ...tx,
    $transaction: async (callback: (client: any) => unknown) => {
      const productStatuses = new Map([...products].map(([id, product]) => [id, product.saleStatus]));
      const originalOrder = { ...order, items: order.items.map((item) => ({ ...item })), events: [...order.events] };
      const eventCount = events.length;
      const writeCount = inventoryWrites;
      try {
        return await callback(tx);
      } catch (error) {
        for (const [id, status] of productStatuses) {
          const product = products.get(id);
          if (product) product.saleStatus = status;
        }
        Object.assign(order, originalOrder);
        order.items.splice(0, order.items.length, ...originalOrder.items);
        order.events.splice(0, order.events.length, ...originalOrder.events);
        events.splice(eventCount);
        inventoryWrites = writeCount;
        throw error;
      }
    },
  };

  return { prisma: prisma as any, order, products, events, getInventoryWrites: () => inventoryWrites };
}

test("preserves a paid transfer order total and coupon when the replacement costs the same", async () => {
  const fixture = createPrismaFixture();

  const updated = await replacePaidBirdOrderItem(fixture.prisma, 42, input, actor);

  assert.equal(fixture.products.get(10)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.products.get(11)?.saleStatus, "SOLD");
  assert.equal(updated.items[0].productId, 11);
  assert.equal(updated.items[0].unitPrice, "4000.00");
  assert.equal(updated.total, 3400);
  assert.equal(updated.discountTotal, 600);
  assert.equal(Number(updated.paidAmount), 3400);
  assert.equal(updated.status, OrderStatus.PAID);
  assert.equal(fixture.events.length, 1);
  assert.equal(fixture.events[0].actorUserId, 7);
  assert.equal(fixture.events[0].metadata.customerAuthorized, true);
  assert.equal(fixture.events[0].metadata.deliveryConfirmed, true);
  assert.equal(fixture.events[0].metadata.reason, input.reason);
  assert.equal(fixture.events[0].previousState.item.productId, 10);
  assert.equal(fixture.events[0].nextState.item.productId, 11);
  assert.equal(fixture.events[0].metadata.due, undefined);
});

test("recalculates an unpaid transfer order and coupon before setting the new amount due", async () => {
  const fixture = createPrismaFixture({
    orderStatus: OrderStatus.PENDING,
    paymentStatus: "PENDING",
    replacementPrice: "8000.00",
  });
  const quote = await previewBirdOrderItemReplacement(fixture.prisma, 42, input);

  assert.equal(quote.currentTotal, 3400);
  assert.equal(quote.newSubtotal, 8000);
  assert.equal(quote.newDiscount, 1200);
  assert.equal(quote.newTotal, 6800);
  assert.equal(quote.balanceDue, 6800);
  assert.equal(quote.noticeDue, 6800);

  const updated = await replacePaidBirdOrderItem(fixture.prisma, 42, input, actor);
  assert.equal(updated.items[0].unitPrice, "8000.00");
  assert.equal(updated.total, 6800);
  assert.equal(updated.discountTotal, 1200);
  assert.equal(updated.status, OrderStatus.PENDING);
  assert.equal(updated.paymentStatus, "PENDING");
  assert.equal(fixture.products.get(10)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.products.get(11)?.saleStatus, "RESERVED");
  assert.match(fixture.events[0].metadata.due, /6,800\.00/);
});

test("records the outstanding difference after replacing a paid transfer order with a more expensive bird", async () => {
  const fixture = createPrismaFixture({ replacementPrice: "8000.00" });
  const updated = await replacePaidBirdOrderItem(fixture.prisma, 42, input, actor);

  assert.equal(updated.total, 6800);
  assert.equal(updated.paidAmount, 3400);
  assert.equal(updated.status, OrderStatus.PENDING);
  assert.equal(updated.paymentStatus, "PARTIALLY_PAID");
  assert.equal(fixture.products.get(10)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.products.get(11)?.saleStatus, "RESERVED");
  assert.equal(fixture.events[0].metadata.balanceDue, 3400);
  assert.match(fixture.events[0].metadata.due, /3,400\.00/);
});

test("rejects a replacement when the displayed preview no longer matches the order calculation", async () => {
  const fixture = createPrismaFixture({ replacementPrice: "8000.00" });
  const stalePreviewInput: ReplacePaidBirdOrderItemInput = {
    ...input,
    expectedCurrentTotal: 3400,
    expectedNewTotal: 6700,
    expectedNewSubtotal: 8000,
    expectedNewDiscount: 1200,
    expectedPaidAmount: 3400,
  };

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, stalePreviewInput, actor),
    /cambió desde la vista previa/,
  );
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});

test("rejects a paid replacement whose recalculated total is below the amount received", async () => {
  const fixture = createPrismaFixture({ replacementPrice: "3000.00" });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /devolución o el crédito/,
  );
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});

test("blocks a Mercado Pago replacement when its recalculated total changes", async () => {
  const fixture = createPrismaFixture({
    paymentMethod: "MERCADOPAGO",
    replacementPrice: "8000.00",
  });

  await assert.rejects(
    previewBirdOrderItemReplacement(fixture.prisma, 42, input),
    /Mercado Pago no admite ajustes de saldo/,
  );
  assert.equal(fixture.getInventoryWrites(), 0);
});

test("reapplies coupon eligibility to the replacement bird", async () => {
  const fixture = createPrismaFixture({
    replacementPrice: "8000.00",
    replacementPurpose: "BREEDING",
    couponBirdPurpose: "COMBAT",
    couponSnapshot: { ...couponSnapshot, birdPurpose: "COMBAT" },
  });
  const quote = await previewBirdOrderItemReplacement(fixture.prisma, 42, input);

  assert.equal(quote.newDiscount, 0);
  assert.equal(quote.newTotal, 8000);
  assert.equal(quote.balanceDue, 4600);
});

test("fails closed when historical coupon terms cannot reproduce the recorded discount", async () => {
  const fixture = createPrismaFixture({
    couponSnapshot: null,
    couponDiscountValue: "10",
  });

  await assert.rejects(
    previewBirdOrderItemReplacement(fixture.prisma, 42, input),
    /no se puede verificar que las condiciones actuales del cupón reproduzcan el descuento original/i,
  );
});

test("rejects non-paid non-pending orders and unavailable replacement products", async () => {
  const shipped = createPrismaFixture({ orderStatus: OrderStatus.SHIPPED as OrderStatus });
  await assert.rejects(
    replacePaidBirdOrderItem(shipped.prisma, 42, input, actor),
    /Solo se pueden sustituir aves/,
  );

  const unavailable = createPrismaFixture({ replacementAvailable: false });
  await assert.rejects(
    replacePaidBirdOrderItem(unavailable.prisma, 42, input, actor),
    /ya no está disponible/,
  );
  assert.equal(unavailable.getInventoryWrites(), 0);
});

test("rolls back replacement inventory when the source bird cannot be released", async () => {
  const fixture = createPrismaFixture({ sourceInventoryStatus: "AVAILABLE" });

  await assert.rejects(
    replacePaidBirdOrderItem(fixture.prisma, 42, input, actor),
    /No se pudo liberar el ave original/,
  );
  assert.equal(fixture.products.get(10)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.products.get(11)?.saleStatus, "AVAILABLE");
  assert.equal(fixture.getInventoryWrites(), 0);
  assert.equal(fixture.events.length, 0);
});
