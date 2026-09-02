import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalCloudTemplateSources,
  getCloudTemplateBodyContent,
  getCloudTemplateDefinitionHash,
  normalizeCloudTemplateParameterValue,
  omitOptionalRaffleInvitationAdditionalInfo,
  resolveCloudTemplateOwner,
} from "../src/services/whatsapp/whatsapp-cloud-template.service";
import { getInitialWhatsappLogStatus } from "../src/services/whatsapp/whatsapp-send.service";

test("normalizes multiline Cloud API template parameters", () => {
  assert.equal(
    normalizeCloudTemplateParameterValue(
      "02, 05 y 09\n\nOportunidades:\n02: 35, 76\n05: 47, 48",
    ),
    "02, 05 y 09 · Oportunidades: · 02: 35, 76 · 05: 47, 48",
  );
});

test("normalizes tabs and repeated whitespace in Cloud API parameters", () => {
  assert.equal(
    normalizeCloudTemplateParameterValue("Primer lugar:\t005   Boleto 02"),
    "Primer lugar: 005 Boleto 02",
  );
});

test("does not send empty Cloud API template parameters", () => {
  assert.equal(normalizeCloudTemplateParameterValue(" \n\t "), "No disponible");
});

test("adapts raffle invitations for a Cloud image header and footer", () => {
  assert.equal(
    getCloudTemplateBodyContent({
      scope: "RAFFLES",
      type: "RAFFLE_INVITATION",
      content:
        "¡Hola, {{customer_name}}!\n\nConoce {{raffle_name}}.\n\nSi prefieres no recibir próximas invitaciones, responde BAJA.",
    }),
    "¡Hola, {{customer_name}}!\n\nConoce {{raffle_name}}.",
  );
});

test("moves the raffle invitation URL into its Cloud API button", () => {
  const invitation = {
    scope: "RAFFLES" as const,
    type: "RAFFLE_INVITATION" as const,
    variant: "SIMPLIFIED" as const,
    content:
      "¡Hola, {{customer_name}}!\n\nConsulta los detalles en el siguiente botón:\n\n{{raffle_url}}\n\nSi prefieres no recibir próximas invitaciones, responde BAJA.",
  };

  assert.equal(
    getCloudTemplateBodyContent(invitation),
    "¡Hola, {{customer_name}}!\n\nConsulta los detalles en el siguiente botón:",
  );
  assert.notEqual(
    getCloudTemplateDefinitionHash(invitation),
    getCloudTemplateDefinitionHash({
      ...invitation,
      content:
        "¡Hola, {{customer_name}}!\n\nConsulta los detalles en el siguiente botón:",
    }),
  );
});

test("moves the store order URL into its Cloud API button", () => {
  const order = {
    scope: "STORE" as const,
    type: "RESERVATION" as const,
    variant: "SIMPLIFIED" as const,
    content:
      "¡Hola, {{customer_name}}!\n\nConsulta el estado de tu orden en el botón Ver orden.\n\n{{order_url}}",
  };

  assert.equal(
    getCloudTemplateBodyContent(order),
    "¡Hola, {{customer_name}}!\n\nConsulta el estado de tu orden en el botón Ver orden.",
  );
  assert.notEqual(
    getCloudTemplateDefinitionHash(order),
    getCloudTemplateDefinitionHash({
      ...order,
      content:
        "¡Hola, {{customer_name}}!\n\nConsulta el estado de tu orden en el botón Ver orden.",
    }),
  );
});

test("provides payment instructions with the order URL as a Cloud API button", () => {
  const sources = buildCanonicalCloudTemplateSources(
    {},
    ["STORE"],
    "SIMPLIFIED",
  );
  const source = sources.find(
    (candidate) => candidate.type === "PAYMENT_INSTRUCTIONS",
  );

  assert.ok(source);
  assert.match(source.content, /\{\{order_id\}\}/);
  assert.match(source.content, /\{\{bank_name\}\}/);
  assert.match(source.content, /\{\{time_store\}\}/);
  assert.match(source.content, /\{\{order_url\}\}/);
  assert.doesNotMatch(
    getCloudTemplateBodyContent(source),
    /\{\{order_url\}\}/,
  );
  assert.match(
    getCloudTemplateBodyContent(source),
    /Consulta tu orden en el botón Ver orden/,
  );
});

test("keeps the simplified store reservation fallback scoped to Store", () => {
  const storeReservation = buildCanonicalCloudTemplateSources(
    {},
    ["STORE"],
    "SIMPLIFIED",
  ).find((source) => source.type === "RESERVATION");

  assert.ok(storeReservation);
  assert.match(storeReservation.content, /\{\{order_url\}\}/);
});

test("provides every simplified Store order template with its correct CTA", () => {
  const sources = buildCanonicalCloudTemplateSources(
    {},
    ["STORE"],
    "SIMPLIFIED",
  );
  const expectedOrderTypes = [
    "RESERVATION",
    "PAYMENT_INSTRUCTIONS",
    "RESTORED",
    "REMINDER",
    "RELEASE",
    "PAYMENT_CONFIRMED",
    "PAYMENT_REFUNDED",
  ];
  const orderUrlMarker =
    String.fromCharCode(123, 123) + "order_url" + String.fromCharCode(125, 125);

  for (const type of expectedOrderTypes) {
    const source = sources.find((candidate) => candidate.type === type);
    assert.ok(source, `Missing simplified Store source: ${type}`);
    assert.equal(source.content.includes(orderUrlMarker), true);
  }

  const recovery = sources.find((source) => source.type === "PAYMENT_RECOVERY");
  assert.ok(recovery);
  const recoveryUrlMarker =
    String.fromCharCode(123, 123) + "recovery_url" + String.fromCharCode(125, 125);
  assert.equal(recovery.content.includes(recoveryUrlMarker), true);
});

test("omits optional raffle invitation info when it is empty", () => {
  const withOptionalInfo =
    "¡Hola, {{customer_name}}!\n\nℹ️ {{raffle_description}}\n\n{{raffle_extra}}\n\n📅 Apertura: {{opening_date}}";

  assert.equal(
    omitOptionalRaffleInvitationAdditionalInfo(withOptionalInfo),
    "¡Hola, {{customer_name}}!\n\nℹ️ {{raffle_description}}\n\n📅 Apertura: {{opening_date}}",
  );
});

test("keeps the Evolution source content unchanged for ordinary templates", () => {
  const content =
    "Tu orden {{order_id}} fue confirmada.\n\nConserva este mensaje.";
  assert.equal(
    getCloudTemplateBodyContent({
      scope: "STORE",
      type: "PAYMENT_CONFIRMED",
      content,
    }),
    content,
  );
});

test("versions the rich raffle invitation independently from plain text", () => {
  const invitation = {
    scope: "RAFFLES" as const,
    type: "RAFFLE_INVITATION" as const,
    content:
      "Invitación para {{customer_name}}.\n\nSi prefieres no recibir próximas invitaciones, responde BAJA.",
  };
  assert.notEqual(
    getCloudTemplateDefinitionHash(invitation),
    getCloudTemplateDefinitionHash({
      ...invitation,
      type: "OPENING",
    }),
  );
});

test("records provider acceptance as sent while awaiting delivery receipts", () => {
  assert.equal(
    getInitialWhatsappLogStatus("accepted", "wamid.example"),
    "sent",
  );
  assert.equal(
    getInitialWhatsappLogStatus("PENDING", "evolution-message"),
    "sent",
  );
});

test("reuses the principal template catalog when a channel shares the WABA", () => {
  assert.deepEqual(
    resolveCloudTemplateOwner({
      channelOwner: { kind: "channel", channelId: 7, purpose: "RAFFLES" },
      channelBusinessAccountId: "waba-123",
      principalBusinessAccountId: "waba-123",
    }),
    { kind: "principal" },
  );
});

test("keeps a dedicated template catalog when the channel uses another WABA", () => {
  assert.deepEqual(
    resolveCloudTemplateOwner({
      channelOwner: { kind: "channel", channelId: 7, purpose: "RAFFLES" },
      channelBusinessAccountId: "waba-raffles",
      principalBusinessAccountId: "waba-main",
    }),
    { kind: "channel", channelId: 7, purpose: "RAFFLES" },
  );
});

test("does not share a catalog when either WABA identifier is missing", () => {
  assert.deepEqual(
    resolveCloudTemplateOwner({
      channelOwner: { kind: "channel", channelId: 7, purpose: "RAFFLES" },
      channelBusinessAccountId: "",
      principalBusinessAccountId: "",
    }),
    { kind: "channel", channelId: 7, purpose: "RAFFLES" },
  );
});
