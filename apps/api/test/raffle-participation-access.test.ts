import assert from "node:assert/strict";
import test from "node:test";
import { getRaffleWinnerPrizes } from "../src/modules/raffle/ticket-sales/raffle-participation-access.service";

const publishedWinner = {
  position: 1,
  title: "8 pollos para show",
  description: "Premio principal",
  winningNumber: "123",
  winningTicketNumber: "045",
  winningParticipationId: "participation-1",
  resultResolutionStatus: "ELIGIBLE_WINNER",
  resultPublishedAt: new Date("2026-09-29T20:00:00.000Z"),
};

test("returns the published prize linked to the private participation", () => {
  assert.deepEqual(
    getRaffleWinnerPrizes(
      [publishedWinner],
      [{ reservationId: "participation-1", ticketNumber: "045" }],
    ),
    [
      {
        position: 1,
        title: "8 pollos para show",
        description: "Premio principal",
        winningNumber: "123",
        winningTicketNumber: "045",
      },
    ],
  );
});

test("does not expose unpublished or ineligible prize records", () => {
  assert.deepEqual(
    getRaffleWinnerPrizes(
      [
        publishedWinner,
        {
          ...publishedWinner,
          position: 2,
          resultPublishedAt: null,
          winningParticipationId: "participation-1",
        },
        {
          ...publishedWinner,
          position: 3,
          resultResolutionStatus: "UNPAID_TICKET",
          winningParticipationId: "participation-1",
        },
      ],
      [{ reservationId: "participation-1", ticketNumber: "045" }],
    ).map((prize) => prize.position),
    [1],
  );
});
