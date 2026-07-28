import assert from "node:assert/strict";
import test from "node:test";
import { raffleAudienceService } from "../src/modules/raffle/intelligence/raffle-audience.service";

const sale = (
  id: number,
  reservationId: string,
  phone: string,
  raffleId: number,
  createdAt: string,
) => ({
  id,
  reservationId,
  raffleId,
  customerName: "Participante",
  customerPhone: phone,
  customerState: "Tlaxcala",
  paymentStatus: "PAID",
  paymentMethod: "MERCADOPAGO",
  discountTotal: 0,
  mpPaidAmount: 100,
  mpRefundedAmount: 0,
  createdAt: new Date(createdAt),
  raffle: { ticketPrice: 100 },
});

test("builds reusable profiles and removes duplicate recipients by canonical phone", async () => {
  const rafflePrisma = {
    ticketSale: {
      findMany: async () => [
        sale(1, "reservation-a", "2218626379", 1, "2026-07-01T10:00:00.000Z"),
        sale(2, "reservation-b", "+522218626379", 2, "2026-07-05T10:00:00.000Z"),
        sale(3, "reservation-c", "+15005550006", 2, "2026-07-06T10:00:00.000Z"),
      ],
    },
    raffleParticipationEvent: {
      findMany: async () => [
        { participationId: "reservation-a", createdAt: new Date("2026-07-01T11:00:00.000Z") },
        { participationId: "reservation-b", createdAt: new Date("2026-07-05T12:00:00.000Z") },
        { participationId: "reservation-c", createdAt: new Date("2026-07-06T15:00:00.000Z") },
      ],
    },
    rafflePrize: { findMany: async () => [] },
    raffleOpeningSubscription: { findMany: async () => [] },
  };
  const storePrisma = {
    whatsappMarketingPreference: {
      findMany: async () => [{
        phone: "+522218626379",
        status: "GRANTED",
        lastMarketingAt: null,
      }],
    },
  };

  const preview = await raffleAudienceService.preview(
    rafflePrisma,
    storePrisma,
    {
      rules: { minPaidParticipations: 2, minPaidTickets: 2 },
      frequencyWindowDays: 30,
    },
  );

  assert.equal(preview.summary.profilesAnalyzed, 2);
  assert.equal(preview.summary.duplicatesRemoved, 1);
  assert.equal(preview.summary.audienceMatched, 1);
  assert.equal(preview.summary.eligible, 1);
  assert.equal(preview.sample[0].phone, "+522218626379");
  assert.equal(preview.sample[0].paidParticipations, 2);
  assert.equal(preview.sample[0].netRevenue, 200);
});

test("explains consent, target-raffle and frequency exclusions without sending", async () => {
  const now = new Date();
  const rafflePrisma = {
    ticketSale: {
      findMany: async () => [
        sale(1, "reservation-a", "+522218626379", 10, "2026-07-01T10:00:00.000Z"),
        sale(2, "reservation-b", "+15005550006", 11, "2026-07-01T10:00:00.000Z"),
        sale(3, "reservation-c", "+50255555555", 12, "2026-07-01T10:00:00.000Z"),
      ],
    },
    raffleParticipationEvent: {
      findMany: async () => [
        { participationId: "reservation-a", createdAt: new Date("2026-07-01T11:00:00.000Z") },
        { participationId: "reservation-b", createdAt: new Date("2026-07-01T12:00:00.000Z") },
        { participationId: "reservation-c", createdAt: new Date("2026-07-01T13:00:00.000Z") },
      ],
    },
    rafflePrize: { findMany: async () => [] },
    raffleOpeningSubscription: { findMany: async () => [] },
  };
  const storePrisma = {
    whatsappMarketingPreference: {
      findMany: async () => [
        { phone: "+522218626379", status: "GRANTED", lastMarketingAt: null },
        { phone: "+15005550006", status: "OPTED_OUT", lastMarketingAt: null },
        { phone: "+50255555555", status: "GRANTED", lastMarketingAt: now },
      ],
    },
  };

  const preview = await raffleAudienceService.preview(
    rafflePrisma,
    storePrisma,
    {
      rules: { minPaidParticipations: 1 },
      targetRaffleId: 10,
      frequencyWindowDays: 30,
    },
  );

  assert.equal(preview.summary.audienceMatched, 3);
  assert.equal(preview.summary.eligible, 0);
  assert.equal(preview.summary.exclusions.alreadyParticipating, 1);
  assert.equal(preview.summary.exclusions.optedOut, 1);
  assert.equal(preview.summary.exclusions.recentlyContacted, 1);
});
