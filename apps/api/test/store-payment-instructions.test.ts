import assert from "node:assert/strict";
import test from "node:test";
import { handleStoreWhatsappMessage } from "../src/modules/store/orders/store-payment-instructions.service";

const fakePrisma = (orders: unknown[]) => ({
  order: {
    findMany: async () => orders,
  },
});

test("ignores ordinary inbound text in the store payment assistant", async () => {
  const result = await handleStoreWhatsappMessage({
    storePrisma: fakePrisma([]) as any,
    phone: "2218626379",
    text: "Hola",
  });

  assert.deepEqual(result, { handled: false, reply: null });
});

test("reports when PAGOS has no active pending order for the phone", async () => {
  const result = await handleStoreWhatsappMessage({
    storePrisma: fakePrisma([]) as any,
    phone: "+52 221 862 6379",
    text: "PAGOS",
  });

  assert.equal(result.handled, true);
  assert.match(result.reply || "", /No encontramos una orden pendiente/);
});

test("requires an order number when the phone has multiple pending orders", async () => {
  const result = await handleStoreWhatsappMessage({
    storePrisma: fakePrisma([
      {
        id: 41,
        customerName: "Cliente",
        total: 500,
        paymentMethod: "TRANSFER",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        items: [],
      },
      {
        id: 42,
        customerName: "Cliente",
        total: 700,
        paymentMethod: "TRANSFER",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        items: [],
      },
    ]) as any,
    phone: "2218626379",
    text: "PAGOS",
  });

  assert.equal(result.handled, true);
  assert.equal(result.paymentInstructions, undefined);
  assert.match(result.reply || "", /#41, #42/);
  assert.match(result.reply || "", /PAGOS <número de orden>/);
});
