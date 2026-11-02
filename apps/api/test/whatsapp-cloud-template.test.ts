import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalCloudTemplateSources,
  findCloudTemplateInCatalog,
  getCloudTemplateRemoteHealth,
  getCloudTemplateBodyContent,
  getCloudTemplateDefinitionHash,
  getCloudTemplateSimplifiedDefaultContent,
  normalizeCloudTemplateParameterValue,
  omitOptionalRaffleInvitationAdditionalInfo,
  omitOptionalRaffleParticipationInfo,
  resolveCloudTemplateOwner,
} from "../src/services/whatsapp/whatsapp-cloud-template.service";
import { getInitialWhatsappLogStatus } from "../src/services/whatsapp/whatsapp-send.service";
import {
  buildCloudTemplateDefinitionSnapshot,
  findRemoteCloudTemplateForAudit,
  getCloudTemplateAuditDelayMs,
  getCloudTemplateStatusEventType,
  getCloudTemplateStatusTransition,
} from "../src/services/whatsapp/whatsapp-cloud-template-audit.service";
import {
  getKapsoTemplateSyncCooldownMs,
  invalidateKapsoTemplateCatalogCache,
  kapsoClient,
  listKapsoTemplateCatalogCached,
} from "../src/services/kapso/kapso.client";

test("does not consider a Cloud template healthy when Kapso was not checked", () => {
  assert.equal(
    getCloudTemplateRemoteHealth({
      remoteChecked: false,
      mappingFound: true,
      templateFound: true,
      remoteStatus: "APPROVED",
    }),
    "UNKNOWN",
  );
});

test("reports a missing local active mapping separately", () => {
  assert.equal(
    getCloudTemplateRemoteHealth({
      remoteChecked: true,
      mappingFound: false,
      templateFound: false,
    }),
    "MAPPING_MISSING",
  );
});

test("detects when the active template mapping is absent from Kapso", () => {
  assert.equal(
    getCloudTemplateRemoteHealth({
      remoteChecked: true,
      mappingFound: true,
      templateFound: false,
    }),
    "TEMPLATE_MISSING",
  );
});

test("does not treat an unapproved active template as healthy", () => {
  assert.equal(
    getCloudTemplateRemoteHealth({
      remoteChecked: true,
      mappingFound: true,
      templateFound: true,
      remoteStatus: "PENDING",
    }),
    "NOT_APPROVED",
  );
});

test("considers the active template healthy only when Kapso approves it", () => {
  assert.equal(
    getCloudTemplateRemoteHealth({
      remoteChecked: true,
      mappingFound: true,
      templateFound: true,
      remoteStatus: "APPROVED",
    }),
    "HEALTHY",
  );
});

test("matches Kapso locale variants without crossing languages", () => {
  const catalog = [
    { name: "order_update", language: "en_US", status: "REJECTED" },
    { name: "order_update", language: "es", status: "APPROVED" },
  ];
  assert.equal(
    findCloudTemplateInCatalog(catalog, "order_update", "es_MX")?.status,
    "APPROVED",
  );
  assert.equal(
    findCloudTemplateInCatalog(catalog, "order_update", "fr_FR"),
    undefined,
  );
});

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

test("adds a separate raffle payment-instructions template without changing Store reminders", () => {
  const raffleSources = buildCanonicalCloudTemplateSources(
    {},
    ["RAFFLES"],
    "SIMPLIFIED",
  );
  const instructions = raffleSources.find(
    (source) => source.type === "PAYMENT_INSTRUCTIONS",
  );
  const reminder = raffleSources.find((source) => source.type === "REMINDER");

  assert.ok(instructions);
  assert.ok(reminder);
  assert.match(instructions.content, /\{\{raffle_name\}\}/);
  assert.match(instructions.content, /\{\{amount\}\}/);
  assert.match(instructions.content, /\{\{bank_name\}\}/);
  assert.match(instructions.content, /\{\{bank_account\}\}/);
  assert.match(instructions.content, /\{\{time_raffle\}\}/);
  assert.match(instructions.content, /\{\{participation_url\}\}/);
  assert.doesNotMatch(
    instructions.content,
    /\{\{(?:customer_name|part_info|ticket_list)\}\}/,
  );
  assert.match(
    getCloudTemplateBodyContent(instructions),
    /Consulta tus boletos y el estado de tu participación en el botón Ver participación\./,
  );
  assert.doesNotMatch(
    getCloudTemplateBodyContent(instructions),
    /\{\{(?:customer_name|part_info|ticket_list|participation_url)\}\}/,
  );
  assert.match(reminder.content, /\{\{bank_clabe\}\}/);

  const storeReminder = buildCanonicalCloudTemplateSources(
    {},
    ["STORE"],
    "SIMPLIFIED",
  ).find((source) => source.type === "REMINDER");
  assert.ok(storeReminder);
  assert.doesNotMatch(storeReminder.content, /\{\{bank_account\}\}/);
  assert.equal(
    buildCanonicalCloudTemplateSources({}, ["RAFFLES"], "LEGACY").some(
      (source) => source.type === "PAYMENT_INSTRUCTIONS",
    ),
    false,
  );
});

test("builds only ticket-enabled raffle templates with an image-header variant", () => {
  const sources = buildCanonicalCloudTemplateSources(
    {},
    ["STORE", "RAFFLES"],
    "SIMPLIFIED_TICKET",
  );

  assert.deepEqual(
    sources.map(({ scope, type }) => `${scope}:${type}`).sort(),
    [
      "RAFFLES:PAYMENT_CONFIRMED",
      "RAFFLES:RELEASE",
      "RAFFLES:RESERVATION",
      "RAFFLES:RESTORED",
    ],
  );
  assert.ok(sources.every((source) => source.variant === "SIMPLIFIED_TICKET"));

  const ticketReservation = sources.find(
    (source) => source.type === "RESERVATION",
  );
  const textReservation = buildCanonicalCloudTemplateSources(
    {},
    ["RAFFLES"],
    "SIMPLIFIED",
  ).find((source) => source.type === "RESERVATION");

  assert.ok(ticketReservation);
  assert.ok(textReservation);
  assert.equal(ticketReservation.content, textReservation.content);
  assert.equal(
    ticketReservation.content,
    getCloudTemplateSimplifiedDefaultContent("RAFFLES", "RESERVATION"),
  );
  assert.notEqual(
    getCloudTemplateDefinitionHash(ticketReservation),
    getCloudTemplateDefinitionHash(textReservation),
  );
});

test("provides a separate neutral manual participation-link template", () => {
  const sources = buildCanonicalCloudTemplateSources(
    {},
    ["RAFFLES"],
    "SIMPLIFIED",
  );
  const source = sources.find(
    (candidate) => candidate.type === "PARTICIPATION_LINK_MANUAL",
  );

  assert.ok(source);
  assert.match(source.content, /Te compartimos el enlace privado/);
  assert.match(source.content, /\{\{customer_name\}\}/);
  assert.match(source.content, /\{\{raffle_name\}\}/);
  assert.match(source.content, /\{\{participation_url\}\}/);
  assert.doesNotMatch(getCloudTemplateBodyContent(source), /\{\{participation_url\}\}/);
  assert.notEqual(
    getCloudTemplateDefinitionHash(source),
    getCloudTemplateDefinitionHash({ ...source, type: "PARTICIPATION_LOOKUP_CODE" }),
  );
  assert.equal(
    buildCanonicalCloudTemplateSources({}, ["RAFFLES"], "LEGACY").some(
      (candidate) => candidate.type === "PARTICIPATION_LINK_MANUAL",
    ),
    false,
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

test("omits optional shared participation info when it is empty", () => {
  const withOptionalInfo =
    "Tu participación quedó apartada correctamente. ✅\n\n{{part_info}}\n\n💰 Total pendiente: $250.00 MXN";

  assert.equal(
    omitOptionalRaffleParticipationInfo(withOptionalInfo),
    "Tu participación quedó apartada correctamente. ✅\n\n💰 Total pendiente: $250.00 MXN",
  );
});

test("keeps templates without shared participation info unchanged", () => {
  const content =
    "Tu participación quedó apartada correctamente. ✅\n\n💰 Total pendiente: $250.00 MXN";

  assert.equal(omitOptionalRaffleParticipationInfo(content), content);
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

test("records only actual Cloud template status transitions", () => {
  assert.deepEqual(getCloudTemplateStatusTransition("pending", "APPROVED"), {
    previousStatus: "PENDING",
    nextStatus: "APPROVED",
  });
  assert.equal(getCloudTemplateStatusTransition("approved", "APPROVED"), null);
  assert.equal(getCloudTemplateStatusTransition("PENDING", null), null);
  assert.equal(getCloudTemplateStatusEventType("APPROVED"), "APPROVAL_OBSERVED");
  assert.equal(getCloudTemplateStatusEventType("REJECTED"), "REJECTION_OBSERVED");
  assert.equal(
    getCloudTemplateStatusEventType("MISSING"),
    "REMOTE_ABSENCE_OBSERVED",
  );
});

test("snapshots the reusable template definition and parameter names", () => {
  const parameterNames = ["customer_name", "order_id"];
  const snapshot = buildCloudTemplateDefinitionSnapshot(
    "Hola {{customer_name}}, tu orden es {{order_id}}.",
    parameterNames,
  );

  parameterNames.push("runtime_customer_value");
  assert.deepEqual(snapshot, {
    content: "Hola {{customer_name}}, tu orden es {{order_id}}.",
    parameterNames: ["customer_name", "order_id"],
  });
});

test("reconciles Kapso locale aliases without matching another language", () => {
  const catalog = [
    { name: "order_update", language: "en_US", status: "APPROVED" },
    { name: "order_update", language: "es", status: "APPROVED" },
  ];

  assert.equal(
    findRemoteCloudTemplateForAudit(catalog, "order_update", "es_MX")?.status,
    "APPROVED",
  );
  assert.equal(
    findRemoteCloudTemplateForAudit(catalog, "order_update", "fr_FR"),
    undefined,
  );
  assert.equal(
    findRemoteCloudTemplateForAudit(catalog, "other_template", "es_MX"),
    undefined,
  );
});

test("reuses one Kapso catalog request and invalidates it after a sync", async () => {
  const config = {
    apiKey: "test-key",
    apiBaseUrl: "https://kapso.test",
    phoneNumberId: "phone-1",
    businessAccountId: `waba-${Date.now()}`,
  };
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(JSON.stringify({ data: [{ name: "approved_template" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const [first, concurrent] = await Promise.all([
      listKapsoTemplateCatalogCached(config),
      listKapsoTemplateCatalogCached(config),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first, concurrent);
    await listKapsoTemplateCatalogCached(config);
    assert.equal(calls, 1);

    invalidateKapsoTemplateCatalogCache(config);
    await listKapsoTemplateCatalogCached(config);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateKapsoTemplateCatalogCache(config);
  }
});

test("deletes a Kapso template by exact name and invalidates the cached catalog", async () => {
  const config = {
    apiKey: "test-key",
    apiBaseUrl: "https://kapso.test",
    phoneNumberId: "phone-1",
    businessAccountId: `delete-waba-${Date.now()}`,
  };
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string | undefined; apiKey: string | null }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method,
      apiKey: new Headers(init?.headers).get("X-API-Key"),
    });
    return new Response(
      JSON.stringify(init?.method === "DELETE" ? { success: true } : { data: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await listKapsoTemplateCatalogCached(config);
    await kapsoClient.deleteTemplate(config, "nexus_principal_raffles_payment_confirmed_ab12cd34");
    await listKapsoTemplateCatalogCached(config);

    assert.equal(requests.length, 3);
    assert.equal(requests[1].method, "DELETE");
    assert.equal(
      requests[1].url,
      `https://kapso.test/meta/whatsapp/v24.0/${config.businessAccountId}/message_templates?name=nexus_principal_raffles_payment_confirmed_ab12cd34`,
    );
    assert.equal(requests[1].apiKey, "test-key");
    assert.equal(requests[2].method, "GET");
  } finally {
    globalThis.fetch = originalFetch;
    invalidateKapsoTemplateCatalogCache(config);
  }
});

test("backs off Kapso template catalog retries after rate limiting", async () => {
  const config = {
    apiKey: "test-key",
    apiBaseUrl: "https://kapso.test",
    phoneNumberId: "phone-1",
    businessAccountId: `limited-waba-${Date.now()}`,
  };
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ error: { code: 80008, message: "Too many calls" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await assert.rejects(listKapsoTemplateCatalogCached(config));
    await assert.rejects(listKapsoTemplateCatalogCached(config));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateKapsoTemplateCatalogCache(config);
  }
});

test("pauses catalog and sync requests for a WABA after Meta rate limits", async () => {
  const config = {
    apiKey: "test-key",
    apiBaseUrl: "https://kapso.test",
    phoneNumberId: "phone-1",
    businessAccountId: `sync-limited-waba-${Date.now()}`,
  };
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ error: { code: 80008, message: "Too many calls" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await assert.rejects(kapsoClient.listTemplates(config));
    assert.ok(getKapsoTemplateSyncCooldownMs(config) > 0);
    await assert.rejects(
      kapsoClient.createTemplate(config, {
        name: "test_template",
        language: "es_MX",
        category: "UTILITY",
        parameter_format: "NAMED",
        components: [{ type: "BODY", text: "Hola" }],
      }),
      /pausó nuevas consultas y sincronizaciones/,
    );
    await assert.rejects(listKapsoTemplateCatalogCached(config));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateKapsoTemplateCatalogCache(config);
  }
});

test("spaces scheduled template audits with capped exponential backoff", () => {
  assert.equal(getCloudTemplateAuditDelayMs(0), 15 * 60_000);
  assert.equal(getCloudTemplateAuditDelayMs(1), 15 * 60_000);
  assert.equal(getCloudTemplateAuditDelayMs(2), 30 * 60_000);
  assert.equal(getCloudTemplateAuditDelayMs(3), 60 * 60_000);
  assert.equal(getCloudTemplateAuditDelayMs(20), 4 * 60 * 60_000);
});
