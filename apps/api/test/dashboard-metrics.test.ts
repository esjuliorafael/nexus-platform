import assert from "node:assert/strict";
import test from "node:test";
import {
  getPaidRaffleRevenueByDay,
  getRaffleCommercialPulse,
} from "../src/modules/store/dashboard/dashboard.service";

const createSale = (overrides: Record<string, unknown> = {}) => ({
  id: Number(overrides.id || 1),
  reservationId: "protection-reservation",
  raffleId: 3,
  ticketNumber: "001",
  customerName: "Participante",
  paymentStatus: "PAID",
  financialStatus: "RECOGNIZED",
  paymentMethod: "TRANSFER",
  mpPaidAmount: null,
  mpRefundedAmount: 0,
  discountTotal: 0,
  createdAt: new Date("2026-09-24T12:00:00.000Z"),
  raffle: { title: "Rifa de prueba", ticketPrice: 100 },
  ...overrides,
});

test("excludes unrecognized paid raffle participations from dashboard revenue", () => {
  const sales = [
    createSale({ financialStatus: "NOT_RECOGNIZED" }),
  ];

  assert.deepEqual(getPaidRaffleRevenueByDay(sales), {});
  assert.deepEqual(getRaffleCommercialPulse(sales), {
    confirmed: { count: 1, amount: 0 },
    pending: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  });
});

test("keeps recognized paid raffle revenue in dashboard metrics", () => {
  const sales = [
    createSale({ financialStatus: "RECOGNIZED" }),
  ];

  assert.deepEqual(getPaidRaffleRevenueByDay(sales), {
    "2026-09-24": 100,
  });
  assert.deepEqual(getRaffleCommercialPulse(sales), {
    confirmed: { count: 1, amount: 100 },
    pending: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  });
});
