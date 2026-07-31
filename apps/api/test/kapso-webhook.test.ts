import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  getKapsoWebhookError,
  getKapsoInboundMessage,
  normalizeKapsoWebhookStatus,
  shouldAdvanceKapsoStatus,
  verifyKapsoWebhookSignature,
} from "../src/services/kapso/kapso-webhook";
import {
  getWhatsappMarketingOptInKeyword,
  getWhatsappMarketingOptOutKeyword,
} from "../src/services/whatsapp-marketing-consent.service";

test("verifies Kapso webhook HMAC signatures", () => {
  const payload = { message: { id: "wamid.123" } };
  const secret = "local-test-secret";
  const signature = createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  assert.equal(verifyKapsoWebhookSignature(payload, signature, secret), true);
  assert.equal(verifyKapsoWebhookSignature(payload, "invalid", secret), false);
});

test("maps Kapso delivery events and prevents status regression", () => {
  assert.equal(
    normalizeKapsoWebhookStatus("whatsapp.message.delivered", {}),
    "delivered",
  );
  assert.equal(shouldAdvanceKapsoStatus("sent", "delivered"), true);
  assert.equal(shouldAdvanceKapsoStatus("read", "delivered"), false);
  assert.equal(shouldAdvanceKapsoStatus("delivered", "failed"), false);
});

test("explains missing WhatsApp Business billing currency", () => {
  assert.equal(
    getKapsoWebhookError({
      message: {
        kapso: {
          statuses: [
            {
              status: "failed",
              errors: [{ code: 131042, title: "Business eligibility payment issue" }],
            },
          ],
        },
      },
    }),
    "La cuenta de WhatsApp Business no tiene configurada su moneda de facturación. Configúrala en Meta antes de reintentar el mensaje.",
  );
});

test("extracts inbound Kapso messages using the documented v2 payload", () => {
  assert.deepEqual(
    getKapsoInboundMessage({
      phone_number_id: "phone-1",
      message: {
        id: "wamid.inbound",
        from: "5212218626379",
        text: { body: "BAJA" },
        kapso: { direction: "inbound", content: "BAJA" },
      },
    }),
    {
      messageId: "wamid.inbound",
      senderPhone: "5212218626379",
      text: "BAJA",
      phoneNumberId: "phone-1",
    },
  );
});

test("recognizes only explicit global opt-out keywords", () => {
  assert.equal(getWhatsappMarketingOptOutKeyword(" baja "), "BAJA");
  assert.equal(getWhatsappMarketingOptOutKeyword("Detener"), "DETENER");
  assert.equal(getWhatsappMarketingOptOutKeyword("No, gracias"), null);
  assert.equal(getWhatsappMarketingOptOutKeyword("baja temporal"), null);
});

test("recognizes only the explicit marketing opt-in keyword", () => {
  assert.equal(getWhatsappMarketingOptInKeyword(" alta "), "ALTA");
  assert.equal(getWhatsappMarketingOptInKeyword("si"), null);
  assert.equal(getWhatsappMarketingOptInKeyword("alta para rifas"), null);
});
