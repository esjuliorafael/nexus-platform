import assert from "node:assert/strict";
import test from "node:test";
import { buildRaffleOperationalOverview } from "../src/modules/raffle/ticket-sales/raffle-overview";

test("builds raffle metrics without counting cancelled or expired records", () => {
  const now = new Date("2026-07-23T18:00:00.000Z");
  const overview = buildRaffleOperationalOverview({
    raffleId: 12,
    ticketQuantity: 10,
    now,
    participations: [
      {
        id: "paid-1",
        status: "PAID",
        ticketNumbers: ["001", "002"],
        total: 200,
        createdAt: "2026-07-23T17:00:00.000Z",
      },
      {
        id: "reserved-1",
        status: "PENDING",
        ticketNumbers: ["003"],
        total: 100,
        createdAt: "2026-07-23T16:00:00.000Z",
      },
      {
        id: "cancelled-1",
        status: "CANCELLED",
        ticketNumbers: ["004"],
        total: 100,
        createdAt: "2026-07-23T15:00:00.000Z",
      },
    ],
    holds: [
      {
        id: "hold-active",
        holdStatus: "ACTIVE",
        expiresAt: "2026-07-23T18:30:00.000Z",
        ticketNumbers: ["004", "001"],
        createdAt: "2026-07-23T17:30:00.000Z",
      },
      {
        id: "hold-expired",
        holdStatus: "ACTIVE",
        expiresAt: "2026-07-23T17:30:00.000Z",
        ticketNumbers: ["005"],
        createdAt: "2026-07-23T14:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(overview.metrics, {
    paid: 2,
    reserved: 1,
    review: 1,
    occupied: 4,
    available: 6,
    revenue: 200,
    occupancy: 40,
  });
  assert.deepEqual(
    overview.ticketStatuses.map(({ ticketNumber, status, participationId }) => ({
      ticketNumber,
      status,
      participationId,
    })),
    [
      { ticketNumber: "001", status: "paid", participationId: "paid-1" },
      { ticketNumber: "002", status: "paid", participationId: "paid-1" },
      {
        ticketNumber: "003",
        status: "reserved",
        participationId: "reserved-1",
      },
      {
        ticketNumber: "004",
        status: "review",
        participationId: "hold-active",
      },
    ],
  );
  assert.equal(overview.recentParticipations[0].id, "hold-active");
});
