import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  getParticipationTicketStorageKey,
  renderParticipationTicketJpeg,
} from "../src/modules/raffle/ticket-sales/raffle-participation-ticket.service";

const baseTicket = {
  status: "RESERVED" as const,
  raffleName: "Rifa de prueba",
  drawDate: "20 de noviembre de 2026 a las 8:00 p. m.",
  participantName: "Mariana Torres",
  eventDate: "1 nov. 10:42 a. m.",
  ticketNumbers: ["034", "081"],
  opportunities: [],
  amount: "400.00",
  expiresAt: "2 nov. a las 10:42 a. m.",
  reservedDuration: "24 horas",
};

test("renders a valid portrait JPEG whose height follows ticket content", async () => {
  const simple = await renderParticipationTicketJpeg(baseTicket);
  const withOpportunities = await renderParticipationTicketJpeg({
    ...baseTicket,
    opportunities: [
      { ticketNumber: "034", numbers: ["412", "587", "612", "901"] },
      { ticketNumber: "081", numbers: ["028", "775", "164", "246"] },
    ],
  });
  const metadata = await sharp(withOpportunities.buffer).metadata();

  assert.equal(simple.width, 900);
  assert.ok(withOpportunities.height > simple.height);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 900);
  assert.equal(metadata.height, withOpportunities.height);
});

test("renders confirmed and released states as valid ticket images", async () => {
  const confirmed = await renderParticipationTicketJpeg({
    ...baseTicket,
    status: "CONFIRMED",
    expiresAt: null,
    reservedDuration: null,
  });
  const released = await renderParticipationTicketJpeg({
    ...baseTicket,
    status: "RELEASED",
    expiresAt: null,
    reservedDuration: null,
    releaseReason: "DEADLINE",
  });

  assert.notDeepEqual(confirmed.buffer, released.buffer);
  assert.equal((await sharp(confirmed.buffer).metadata()).format, "jpeg");
  assert.equal((await sharp(released.buffer).metadata()).format, "jpeg");
});

test("uses a deterministic opaque storage key from the queue job id", () => {
  const key = getParticipationTicketStorageKey("raffle-ticket:job/52");

  assert.match(key, /^whatsapp\/raffle-participation-tickets\/[a-f0-9]{32}\.jpg$/);
  assert.equal(key, getParticipationTicketStorageKey("raffle-ticket:job/52"));
  assert.notEqual(key, getParticipationTicketStorageKey("raffle-ticket:job/53"));
});
