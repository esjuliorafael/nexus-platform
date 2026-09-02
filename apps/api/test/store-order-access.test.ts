import assert from "node:assert/strict";
import test from "node:test";
import { toStoreOrderAccessItem } from "../src/modules/store/orders/store-order-access.service";

test("keeps the bird details captured when the order was created", () => {
  const result = toStoreOrderAccessItem({
    id: 7,
    productId: 42,
    productName: "Ave de cría",
    productType: "BIRD",
    productRingNumber: "411",
    productAge: "STAG",
    productPurpose: "BREEDING",
    quantity: 1,
    unitPrice: "320.00",
    product: {
      ringNumber: "999",
      age: "HEN",
      purpose: "COMBAT",
    },
  });

  assert.deepEqual(result.productInfo, {
    ringNumber: "411",
    age: "STAG",
    purpose: "BREEDING",
  });
  assert.equal(result.lineTotal, 320);
});

test("uses current product details only for legacy orders without a snapshot", () => {
  const result = toStoreOrderAccessItem({
    id: 8,
    productId: 43,
    productName: "Ave histórica",
    productType: "BIRD",
    quantity: 1,
    unitPrice: 450,
    product: {
      ringNumber: "512",
      age: "COCK",
      purpose: "COMBAT",
    },
  });

  assert.deepEqual(result.productInfo, {
    ringNumber: "512",
    age: "COCK",
    purpose: "COMBAT",
  });
});

test("does not attach bird details to ordinary store products", () => {
  const result = toStoreOrderAccessItem({
    id: 9,
    productId: 44,
    productName: "Alimento",
    productType: "ITEM",
    quantity: 2,
    unitPrice: 100,
    product: {
      ringNumber: null,
      age: null,
      purpose: null,
    },
  });

  assert.equal(result.productInfo, null);
});
