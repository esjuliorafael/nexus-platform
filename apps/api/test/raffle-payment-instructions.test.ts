import assert from "node:assert/strict";
import test from "node:test";
import {
  getRafflePaymentInstructionsJobId,
  shouldSendRafflePaymentInstructions,
} from "../src/modules/raffle/ticket-sales/raffle-payment-instructions";

const eligibleSale = {
  customerPhone: "+52 222 123 4567",
  paymentMethod: "TRANSFER",
  paymentStatus: "PENDING",
  origin: "PARTICIPANT",
};

const eligibleRequest = {
  kind: "reservation",
  sales: [eligibleSale],
  expectedSaleCount: 1,
  recipientPhone: "522221234567",
  bankValues: { bank_clabe: "012345678901234567" },
};

test("permits instructions after participant transfer reservations and restorations", () => {
  assert.equal(shouldSendRafflePaymentInstructions(eligibleRequest), true);
  assert.equal(
    shouldSendRafflePaymentInstructions({
      ...eligibleRequest,
      kind: "reservation-restored",
    }),
    true,
  );
});

test("does not send instructions for cards, non-pending sales, or internal records", () => {
  for (const sales of [
    [{ ...eligibleSale, paymentMethod: "MERCADOPAGO" }],
    [{ ...eligibleSale, paymentStatus: "PAID" }],
    [{ ...eligibleSale, origin: "OPERATIONAL_PROTECTION" }],
  ]) {
    assert.equal(
      shouldSendRafflePaymentInstructions({ ...eligibleRequest, sales }),
      false,
    );
  }
});

test("requires all requested sales, the matching recipient, and usable bank details", () => {
  assert.equal(
    shouldSendRafflePaymentInstructions({
      ...eligibleRequest,
      expectedSaleCount: 2,
    }),
    false,
  );
  assert.equal(
    shouldSendRafflePaymentInstructions({
      ...eligibleRequest,
      recipientPhone: "+52 999 000 0000",
    }),
    false,
  );
  assert.equal(
    shouldSendRafflePaymentInstructions({
      ...eligibleRequest,
      bankValues: { bank_account: "N/A", bank_clabe: "", bank_card: " " },
    }),
    false,
  );
});

test("creates stable BullMQ-safe follow-up job IDs", () => {
  const first = getRafflePaymentInstructionsJobId("parent:job:123");
  assert.equal(first, getRafflePaymentInstructionsJobId("parent:job:123"));
  assert.match(first, /^raffle-payment-instructions-[a-f0-9]{32}$/);
  assert.doesNotMatch(first, /:/);
});
