import assert from "node:assert/strict";
import test from "node:test";
import {
  getRafflePaymentInstructionsJobId,
  isRaffleReservationNoticeDelivered,
  shouldSendRafflePaymentInstructions,
} from "../src/modules/raffle/ticket-sales/raffle-payment-instructions";
import {
  buildWhatsappAsyncFallbackPatch,
  buildWhatsappTicketTextFallbackPatch,
  getWhatsappTicketTextFallbackJobId,
} from "../src/services/whatsapp/whatsapp-async-fallback";

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

test("only schedules payment instructions after the reservation notice is delivered", () => {
  for (const status of ["pending", "sent", "failed", null, undefined]) {
    assert.equal(isRaffleReservationNoticeDelivered(status), false);
  }
  assert.equal(isRaffleReservationNoticeDelivered("delivered"), true);
  assert.equal(isRaffleReservationNoticeDelivered("READ"), true);
});

test("async provider fallbacks keep the source reservation job ID", () => {
  const originalJob = {
    kind: "reservation" as const,
    ticketSaleIds: [123],
    recipientPhone: "+522221234567",
  };
  const initialFallback = buildWhatsappAsyncFallbackPatch({
    failedProvider: "KAPSO",
    routing: { route: "DIRECT", preferredInstanceName: "Rifas" },
    originalJob,
    originalJobId: "reservation-source-123",
  });
  assert.equal(initialFallback?.sourceJobId, "reservation-source-123");

  const nextFallback = buildWhatsappAsyncFallbackPatch({
    failedProvider: "EVOLUTION",
    routing: { route: "PRINCIPAL_FALLBACK", preferredInstanceName: "Rifas" },
    originalJob: { ...originalJob, ...initialFallback },
    originalJobId: "provider-fallback-message-456",
  });
  assert.equal(nextFallback?.sourceJobId, "reservation-source-123");
});

test("ticket media failures retry once with text through Kapso", () => {
  const originalJob = {
    kind: "reservation" as const,
    ticketSaleIds: [123],
    recipientPhone: "+522221234567",
  };
  const fallback = buildWhatsappTicketTextFallbackPatch({
    routing: { route: "DIRECT", preferredInstanceName: "Rifas" },
    originalJob,
    originalJobId: "reservation-source-123",
  });

  assert.equal(fallback?.forceTextOnly, true);
  assert.equal(fallback?.forceProvider, "KAPSO");
  assert.equal(fallback?.forcePrincipal, false);
  assert.equal(fallback?.sourceJobId, "reservation-source-123");
  assert.equal(
    buildWhatsappTicketTextFallbackPatch({
      originalJob: { ...originalJob, ...fallback },
    }),
    null,
  );
  assert.match(
    getWhatsappTicketTextFallbackJobId("wamid:123/456"),
    /^kapso-ticket-text-fallback-[a-f0-9]{32}$/,
  );
});
