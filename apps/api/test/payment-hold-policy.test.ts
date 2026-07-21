import assert from "node:assert/strict";
import test from "node:test";
import {
  canConvertPaymentHoldToTransfer,
  isPaymentHoldAmbiguous,
} from "../src/modules/store/payments/payment-hold-policy";

test("allows transfer before a card request or after a terminal rejection", () => {
  assert.equal(canConvertPaymentHoldToTransfer({ status: "ACTIVE" }), true);
  assert.equal(canConvertPaymentHoldToTransfer({
    status: "ACTIVE",
    mpPaymentId: "payment-1",
    mpPaymentStatus: "rejected",
  }), true);
  assert.equal(canConvertPaymentHoldToTransfer({
    status: "ACTIVE",
    mpPaymentId: "payment-2",
    mpPaymentStatus: "cancelled",
  }), true);
});

test("blocks transfer while Mercado Pago can still resolve the payment", () => {
  for (const mpPaymentStatus of ["processing", "pending", "in_process", "authorized", "approved"]) {
    assert.equal(isPaymentHoldAmbiguous({
      status: "ACTIVE",
      mpPaymentId: "payment-1",
      mpPaymentStatus,
    }), true);
  }
  assert.equal(canConvertPaymentHoldToTransfer({
    status: "PROCESSING",
    mpPaymentStatus: "processing",
  }), false);
});

test("does not reinterpret an already converted hold as an approved card payment", () => {
  const converted = {
    status: "CONSUMED",
    mpPaymentStatus: "converted_to_transfer",
  };
  assert.equal(isPaymentHoldAmbiguous(converted), false);
  assert.equal(canConvertPaymentHoldToTransfer(converted), false);
});
