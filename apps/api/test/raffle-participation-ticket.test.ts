import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  getParticipationTicketCleanupJobId,
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
  const outerBackground = await sharp(simple.buffer)
    .extract({ left: 3, top: 3, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();

  assert.equal(simple.width, Math.ceil((402 + 16 * 2) * (900 / 402)));
  assert.ok(withOpportunities.height > simple.height);
  assert.ok(withOpportunities.width / withOpportunities.height > 0.45);
  assert.ok(withOpportunities.width / withOpportunities.height < 0.55);
  assert.ok(Math.abs(outerBackground[0] - 233) < 15);
  assert.ok(Math.abs(outerBackground[1] - 231) < 15);
  assert.ok(Math.abs(outerBackground[2] - 230) < 15);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, simple.width);
  assert.equal(metadata.height, withOpportunities.height);
});

test("creates a unique BullMQ-safe delayed cleanup job id per attempt", () => {
  const first = getParticipationTicketCleanupJobId("reservation:job/52", 1);
  const retry = getParticipationTicketCleanupJobId("reservation:job/52", 2);

  assert.match(first, /^raffle-ticket-image-cleanup-[a-f0-9]{32}$/);
  assert.equal(first, getParticipationTicketCleanupJobId("reservation:job/52", 1));
  assert.notEqual(first, retry);
  assert.doesNotMatch(first, /:/);
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
