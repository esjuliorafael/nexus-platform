import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveWinningNumber,
  findDuplicateWinningTickets,
  findWinningTicketNumber,
} from "../src/modules/raffle/raffles/raffle-result.service";

test("derives the configured trailing digits from the official result", () => {
  assert.equal(deriveWinningNumber("48217", 3), "217");
  assert.equal(deriveWinningNumber("12000", 3), "000");
  assert.equal(deriveWinningNumber("17", 3), null);
});

test("resolves an additional opportunity to its primary ticket", () => {
  const assignments = [
    {
      mainTicketNumber: "001",
      extraOpportunities: ["126", "251", "376"],
    },
    {
      mainTicketNumber: "002",
      extraOpportunities: ["127", "252", "377"],
    },
  ];

  assert.equal(findWinningTicketNumber(assignments, "001"), "001");
  assert.equal(findWinningTicketNumber(assignments, "252"), "002");
  assert.equal(findWinningTicketNumber(assignments, "999"), null);
});

test("detects when the same primary ticket wins multiple configured places", () => {
  assert.deepEqual(
    findDuplicateWinningTickets([
      { winningTicketNumber: "002" },
      { winningTicketNumber: "017" },
      { winningTicketNumber: "002" },
      { winningTicketNumber: null },
    ]),
    ["002"],
  );
});
