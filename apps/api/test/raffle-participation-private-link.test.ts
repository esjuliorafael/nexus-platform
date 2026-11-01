import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeManualParticipationLinkDelivery,
  getManualParticipationLinkJobId,
  type ManualParticipationLinkJobData,
} from "../src/modules/raffle/ticket-sales/raffle-participation-private-link-delivery";

const jobData: ManualParticipationLinkJobData = {
  kind: "raffle-participation-link-manual",
  requestEventId: 41,
  ticketSaleId: 536,
  recipientPhone: "+522221234567",
  participationUrl: "https://storefront.test/participations/token",
  accessToken: "token",
  customerName: "Julio Rafael",
  raffleName: "Rifa de prueba",
};

function createEventStore(eventType = "PRIVATE_LINK_SEND_REQUESTED") {
  const event = {
    eventType,
    metadata: { ticketNumbers: ["005"] },
  };
  const rafflePrisma = {
    raffleParticipationEvent: {
      findUnique: async () => ({ ...event }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(event, data);
      },
    },
  };
  return { event, rafflePrisma };
}

test("manual private-link queue IDs are stable and BullMQ safe", () => {
  const id = getManualParticipationLinkJobId(41);
  assert.equal(id, getManualParticipationLinkJobId(41));
  assert.match(id, /^raffle-private-link-41$/);
  assert.doesNotMatch(id, /:/);
});

test("only a pending request can transition to delivered", async () => {
  const { event, rafflePrisma } = createEventStore();
  const result = await finalizeManualParticipationLinkDelivery({
    rafflePrisma: rafflePrisma as any,
    jobData,
    outcome: "DELIVERED",
  });

  assert.equal(result, true);
  assert.equal(event.eventType, "PRIVATE_LINK_SENT");
  assert.equal(event.message, "WhatsApp confirmó la entrega del enlace privado.");
  assert.deepEqual(event.metadata, {
    ticketNumbers: ["005"],
    deliveryStatus: "DELIVERED",
    whatsappJobId: "raffle-private-link-41",
  });
  assert.equal(
    await finalizeManualParticipationLinkDelivery({
      rafflePrisma: rafflePrisma as any,
      jobData,
      outcome: "FAILED",
    }),
    false,
  );
  assert.equal(event.eventType, "PRIVATE_LINK_SENT");
});

test("terminal failures revoke the access token and update the request", async () => {
  const { event, rafflePrisma } = createEventStore();
  const revoked: string[] = [];
  const result = await finalizeManualParticipationLinkDelivery({
    rafflePrisma: rafflePrisma as any,
    jobData,
    outcome: "FAILED",
    revokeAccess: async (_prisma, token) => {
      revoked.push(token);
    },
  });

  assert.equal(result, true);
  assert.deepEqual(revoked, ["token"]);
  assert.equal(event.eventType, "PRIVATE_LINK_SEND_FAILED");
  assert.equal(event.message, "No se pudo entregar el enlace privado por WhatsApp.");
});

test("completed request events are not overwritten by later webhook statuses", async () => {
  const { event, rafflePrisma } = createEventStore("PRIVATE_LINK_SENT");
  const result = await finalizeManualParticipationLinkDelivery({
    rafflePrisma: rafflePrisma as any,
    jobData,
    outcome: "FAILED",
    revokeAccess: async () => assert.fail("must not revoke a delivered link"),
  });

  assert.equal(result, false);
  assert.equal(event.eventType, "PRIVATE_LINK_SENT");
});
