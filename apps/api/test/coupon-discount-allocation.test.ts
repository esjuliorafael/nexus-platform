import assert from "node:assert/strict";
import test from "node:test";
import { allocateCouponDiscount } from "../src/modules/store/coupons/coupon-discount-allocation";

test("allocates a fixed discount proportionally and preserves the exact total", () => {
  const lines = allocateCouponDiscount(3.01, [
    { productId: 1, quantity: 1, subtotal: 10, eligible: true },
    { productId: 2, quantity: 2, subtotal: 20, eligible: true },
    { productId: 3, quantity: 1, subtotal: 5, eligible: false },
  ]);

  assert.deepEqual(lines.map((line) => line.discountTotal), [1, 2.01, 0]);
  assert.equal(
    lines.reduce((sum, line) => sum + line.discountTotal, 0),
    3.01,
  );
  assert.deepEqual(lines.map((line) => line.discountedSubtotal), [9, 17.99, 5]);
});

test("never allocates more discount to a line than its eligible subtotal", () => {
  const lines = allocateCouponDiscount(50, [
    { productId: 1, quantity: 1, subtotal: 12.34, eligible: true },
    { productId: 2, quantity: 1, subtotal: 8, eligible: false },
  ]);

  assert.deepEqual(lines.map((line) => line.discountTotal), [12.34, 0]);
  assert.deepEqual(lines.map((line) => line.discountedSubtotal), [0, 8]);
});
