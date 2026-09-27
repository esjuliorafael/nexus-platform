import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRaffleReservationDeadline,
  calculateRaffleReservationExpiration,
} from "../src/modules/raffle/ticket-sales/raffle-reservation-expiration";

test("keeps the original reservation deadline when a payment confirmation is reverted", () => {
  const createdAt = new Date("2026-09-27T18:55:35.242Z");

  assert.equal(
    calculateRaffleReservationDeadline(createdAt, null, 24).toISOString(),
    "2026-09-28T18:55:35.242Z",
  );
});

test("caps the reservation deadline at the raffle draw date", () => {
  const createdAt = new Date("2026-09-27T18:55:35.242Z");
  const drawDate = new Date("2026-09-28T12:00:00.000Z");

  assert.equal(
    calculateRaffleReservationDeadline(createdAt, drawDate, 24).toISOString(),
    drawDate.toISOString(),
  );
});

test("preserves the existing expiration behavior for an already expired reservation", () => {
  const createdAt = new Date("2026-09-27T18:55:35.242Z");
  const now = new Date("2026-09-29T00:00:00.000Z");

  assert.equal(
    calculateRaffleReservationExpiration(createdAt, null, 24, now).toISOString(),
    now.toISOString(),
  );
});
