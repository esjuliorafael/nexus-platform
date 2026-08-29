import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRaffleWinningRuleText,
  classifyResultProviderState,
  deriveRaffleResultCampaignStatus,
  renderRaffleResultList,
} from "../src/modules/raffle/raffles/raffle-result-communication.utils";

test("builds the winning rule for every configured raffle place", () => {
  assert.equal(
    buildRaffleWinningRuleText(3, [
      { position: 1, resultSource: "MAJOR_PRIZE" },
      { position: 2, resultSource: "SECOND_PRIZE" },
      { position: 3, resultSource: "THIRD_PRIZE" },
    ]),
    "Cada lugar tiene un número ganador propio, que se obtiene a partir de los últimos 3 dígitos de la referencia oficial de la Lotería Nacional asignada a ese lugar: para el 1.er lugar se utiliza el Premio Mayor; para el 2.º lugar, el Segundo Premio; y para el 3.er lugar, el Tercer Premio.",
  );
});

test("keeps the concise winning rule for a single place", () => {
  assert.equal(
    buildRaffleWinningRuleText(3, [
      { position: 1, resultSource: "MAJOR_PRIZE" },
    ]),
    "El número ganador se determina con los últimos 3 dígitos del Premio Mayor de la Lotería Nacional.",
  );
});

test("renders every configured place and identifies results without an eligible winner", () => {
  assert.equal(
    renderRaffleResultList([
      {
        position: 1,
        winningNumber: "217",
        winningTicketNumber: "025",
        resultResolutionStatus: "ELIGIBLE_WINNER",
      },
      {
        position: 2,
        winningNumber: "418",
        winningTicketNumber: "090",
        resultResolutionStatus: "UNPAID_TICKET",
      },
    ]),
    [
      "Primer lugar: número 217, boleto 025",
      "Segundo lugar: número 418, boleto 090 (sin ganador elegible)",
    ].join("\n"),
  );
});

test("distinguishes provider acceptance, delivery and failure", () => {
  assert.equal(
    classifyResultProviderState({
      status: "sent",
      providerStatus: "SERVER_ACK",
    }),
    "ACCEPTED",
  );
  assert.equal(
    classifyResultProviderState({
      status: "delivered",
      providerStatus: "DELIVERY_ACK",
    }),
    "DELIVERED",
  );
  assert.equal(
    classifyResultProviderState({
      status: "failed",
      providerStatus: "rejected",
    }),
    "FAILED",
  );
});

test("derives terminal and partial campaign states from recipient counts", () => {
  assert.equal(
    deriveRaffleResultCampaignStatus({
      sentCount: 0,
      failedCount: 0,
      processingCount: 0,
    }),
    "EMPTY",
  );
  assert.equal(
    deriveRaffleResultCampaignStatus({
      sentCount: 0,
      failedCount: 0,
      processingCount: 2,
    }),
    "PROCESSING",
  );
  assert.equal(
    deriveRaffleResultCampaignStatus({
      sentCount: 1,
      failedCount: 1,
      processingCount: 0,
    }),
    "PARTIAL",
  );
  assert.equal(
    deriveRaffleResultCampaignStatus({
      sentCount: 2,
      failedCount: 0,
      processingCount: 0,
    }),
    "SENT",
  );
});
