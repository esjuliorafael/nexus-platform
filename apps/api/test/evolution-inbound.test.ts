import assert from "node:assert/strict";
import test from "node:test";
import {
  getEvolutionInboundMessage,
  isEvolutionIncomingMessageEvent,
} from "../src/services/evolution/evolution-inbound";

test("extracts a customer text message from an Evolution MESSAGES_UPSERT payload", () => {
  assert.deepEqual(
    getEvolutionInboundMessage({
      data: {
        key: {
          id: "evolution-message-1",
          remoteJid: "5212218626379@s.whatsapp.net",
          fromMe: false,
        },
        message: { conversation: "ALTA" },
      },
    }),
    {
      messageId: "evolution-message-1",
      senderPhone: "5212218626379",
      text: "ALTA",
      fromMe: false,
    },
  );
});

test("recognizes both Evolution spellings for incoming message events", () => {
  assert.equal(isEvolutionIncomingMessageEvent("messages.upsert"), true);
  assert.equal(isEvolutionIncomingMessageEvent("MESSAGES_UPSERT"), true);
  assert.equal(isEvolutionIncomingMessageEvent("messages.update"), false);
});
