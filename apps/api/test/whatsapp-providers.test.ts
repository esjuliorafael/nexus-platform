import assert from "node:assert/strict";
import test from "node:test";
import { evolutionWhatsappProvider } from "../src/services/whatsapp/evolution.provider";
import { kapsoWhatsappProvider } from "../src/services/whatsapp/kapso.provider";
import {
  buildCanonicalCloudTemplateSources,
  CLOUD_TEMPLATE_SETTING_KEYS,
  extractCloudTemplateVariables,
  getCloudTemplateCategory,
  getCloudTemplateContentHash,
} from "../src/services/whatsapp/whatsapp-cloud-template.service";
import {
  getWhatsappDeliveryPolicy,
  isKapsoTenantDeliveryEnabled,
  resolveWhatsappProviderPriority,
} from "../src/services/whatsapp/whatsapp-delivery-policy";
import { buildWhatsappAsyncFallbackPatch } from "../src/services/whatsapp/whatsapp-async-fallback";
import type { WhatsappJobData } from "../src/queues/whatsapp.queue";

test("Evolution provider preserves the existing Mexican recipient format", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody: any;

  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body || "{}"));
    return new Response(
      JSON.stringify({ key: { id: "evolution-message" }, status: "PENDING" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const result = await evolutionWhatsappProvider.send(
      {
        provider: "EVOLUTION",
        instance: {
          instanceName: "tenant_main",
          baseUrl: "https://evolution.example",
          apiKey: "secret",
        },
      },
      "+522218626379",
      { text: "Prueba" },
    );

    assert.equal(
      requestUrl,
      "https://evolution.example/message/sendText/tenant_main",
    );
    assert.deepEqual(requestBody, {
      number: "5212218626379",
      text: "Prueba",
    });
    assert.equal(result.messageId, "evolution-message");
    assert.equal(result.providerStatus, "PENDING");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Kapso provider sends E.164 recipients through Cloud API", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody: any;

  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body || "{}"));
    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        contacts: [{ wa_id: "522218626379" }],
        messages: [{ id: "kapso-message" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const result = await kapsoWhatsappProvider.send(
      {
        provider: "KAPSO",
        config: {
          apiKey: "secret",
          phoneNumberId: "123456789",
          businessAccountId: "987654321",
          apiBaseUrl: "https://api.kapso.ai",
        },
      },
      "+522218626379",
      { text: "Prueba" },
      "nexus-test",
    );

    assert.equal(
      requestUrl,
      "https://api.kapso.ai/meta/whatsapp/v24.0/123456789/messages",
    );
    assert.equal(requestBody.to, "522218626379");
    assert.equal(requestBody.type, "text");
    assert.equal(requestBody.text.body, "Prueba");
    assert.equal(requestBody.biz_opaque_callback_data, "nexus-test");
    assert.equal(result.messageId, "kapso-message");
    assert.equal(result.providerStatus, "accepted");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Kapso provider sends approved templates with named parameters", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: any;
  globalThis.fetch = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body || "{}"));
    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        messages: [{ id: "kapso-template-message" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await kapsoWhatsappProvider.send(
      {
        provider: "KAPSO",
        config: {
          apiKey: "secret",
          phoneNumberId: "123456789",
          businessAccountId: "987654321",
          apiBaseUrl: "https://api.kapso.ai",
        },
      },
      "+522218626379",
      {
        text: "Hola Carlos, orden 12",
        cloudTemplate: {
          name: "nexus_store_reservation_abcd1234",
          language: { code: "es_MX" },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: "Carlos",
                  parameter_name: "customer_name",
                },
                {
                  type: "text",
                  text: "12",
                  parameter_name: "order_id",
                },
              ],
            },
          ],
        },
      },
    );

    assert.equal(requestBody.type, "template");
    assert.equal(
      requestBody.template.components[0].parameters[0].parameter_name,
      "customer_name",
    );
    assert.equal(requestBody.template.components[0].parameters[1].text, "12");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cloud template catalog extracts stable unique variables and hashes content", () => {
  const content =
    "Hola {{customer_name}}, orden {{order_id}} para {{customer_name}}.";
  assert.deepEqual(extractCloudTemplateVariables(content), [
    "customer_name",
    "order_id",
  ]);
  assert.equal(
    getCloudTemplateContentHash(content),
    getCloudTemplateContentHash(`  ${content}  `),
  );
});

test("cloud template catalog includes raffle invitations as marketing", () => {
  assert.equal(CLOUD_TEMPLATE_SETTING_KEYS.length, 18);
  assert.deepEqual(
    CLOUD_TEMPLATE_SETTING_KEYS.find(
      (template) => template.type === "RAFFLE_INVITATION",
    ),
    {
      scope: "RAFFLES",
      type: "RAFFLE_INVITATION",
      key: "whatsapp_global_raffle_invitation",
    },
  );
  assert.equal(getCloudTemplateCategory("RAFFLE_INVITATION"), "MARKETING");
  assert.equal(getCloudTemplateCategory("OPENING"), "MARKETING");
  assert.equal(getCloudTemplateCategory("RESERVATION"), "UTILITY");
});

test("specialized Cloud catalogs copy canonical Principal content", () => {
  const settings = {
    whatsapp_global_store_res: "Plantilla principal de apartado",
    whatsapp_global_store_pay: "Plantilla principal de pago",
  };

  const sources = buildCanonicalCloudTemplateSources(settings, ["STORE"]);

  assert.equal(sources.length, 7);
  assert.equal(
    sources.find((source) => source.type === "RESERVATION")?.content,
    "Plantilla principal de apartado",
  );
  assert.equal(
    sources.find((source) => source.type === "PAYMENT_CONFIRMED")?.content,
    "Plantilla principal de pago",
  );
  assert.equal(
    sources.find((source) => source.type === "RELEASE")?.content,
    "",
  );
});

test("payment recovery templates exist for store and raffles as utility", () => {
  assert.deepEqual(
    CLOUD_TEMPLATE_SETTING_KEYS.filter(
      (template) => template.type === "PAYMENT_RECOVERY",
    ),
    [
      {
        scope: "STORE",
        type: "PAYMENT_RECOVERY",
        key: "whatsapp_global_store_payment_recovery",
      },
      {
        scope: "RAFFLES",
        type: "PAYMENT_RECOVERY",
        key: "whatsapp_global_raffle_payment_recovery",
      },
    ],
  );
  assert.equal(getCloudTemplateCategory("PAYMENT_RECOVERY"), "UTILITY");
});

test("delivery policy reserves Kapso priority for critical and campaign messages", () => {
  assert.deepEqual(getWhatsappDeliveryPolicy("PAYMENT_CONFIRMED"), {
    classification: "CRITICAL",
    providerPriority: ["KAPSO", "EVOLUTION"],
  });
  assert.deepEqual(getWhatsappDeliveryPolicy("RESULT_WINNER"), {
    classification: "CRITICAL",
    providerPriority: ["KAPSO", "EVOLUTION"],
  });
  assert.deepEqual(getWhatsappDeliveryPolicy("RESULT_PARTICIPANTS"), {
    classification: "CAMPAIGN",
    providerPriority: ["KAPSO", "EVOLUTION"],
  });
  assert.deepEqual(getWhatsappDeliveryPolicy("RESERVATION"), {
    classification: "OPERATIONAL",
    providerPriority: ["EVOLUTION", "KAPSO"],
  });
  assert.deepEqual(getWhatsappDeliveryPolicy("REMINDER"), {
    classification: "OPERATIONAL",
    providerPriority: ["EVOLUTION", "KAPSO"],
  });
});

test("an explicit provider override is limited to that provider", () => {
  assert.deepEqual(
    resolveWhatsappProviderPriority({
      type: "PAYMENT_CONFIRMED",
      forceProvider: "EVOLUTION",
    }),
    ["EVOLUTION"],
  );
});

test("tenant switch removes Kapso from every delivery route", () => {
  assert.equal(isKapsoTenantDeliveryEnabled(undefined), true);
  assert.equal(isKapsoTenantDeliveryEnabled("1"), true);
  assert.equal(isKapsoTenantDeliveryEnabled("0"), false);
  assert.equal(isKapsoTenantDeliveryEnabled("false"), false);
  assert.deepEqual(
    resolveWhatsappProviderPriority({
      type: "RESULT_WINNER",
      forceProvider: "KAPSO",
      kapsoEnabled: false,
    }),
    ["EVOLUTION"],
  );
  assert.deepEqual(
    resolveWhatsappProviderPriority({
      type: "RESULT_PARTICIPANTS",
      kapsoEnabled: false,
    }),
    ["EVOLUTION"],
  );
});

test("async fallback moves from a specialized sender to the principal sender", () => {
  const originalJob: WhatsappJobData = {
    kind: "raffle-result",
    campaignRecipientId: "recipient-1",
    recipientPhone: "+522218626379",
  };
  assert.deepEqual(
    buildWhatsappAsyncFallbackPatch({
      failedProvider: "KAPSO",
      routing: {
        route: "DIRECT",
        preferredInstanceName: "Rifas",
      },
      originalJob,
    }),
    {
      forcePrincipal: true,
      forceProvider: undefined,
      forceEvolution: undefined,
      fallbackDepth: 1,
    },
  );
});

test("async fallback changes provider after a principal failure and stops cycling", () => {
  const originalJob: WhatsappJobData = {
    kind: "raffle-result",
    campaignRecipientId: "recipient-1",
    recipientPhone: "+522218626379",
    fallbackDepth: 1,
  };
  assert.deepEqual(
    buildWhatsappAsyncFallbackPatch({
      failedProvider: "KAPSO",
      routing: {
        route: "PRINCIPAL_FALLBACK",
        preferredInstanceName: "Rifas",
      },
      originalJob,
    }),
    {
      forcePrincipal: false,
      forceProvider: "EVOLUTION",
      forceEvolution: undefined,
      fallbackDepth: 2,
    },
  );
  assert.equal(
    buildWhatsappAsyncFallbackPatch({
      failedProvider: "EVOLUTION",
      routing: { route: "PRINCIPAL_FALLBACK" },
      originalJob: { ...originalJob, fallbackDepth: 2 },
    }),
    null,
  );
});
