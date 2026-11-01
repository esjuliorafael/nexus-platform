import type {
  KapsoConfig,
  KapsoProjectWebhookEvent,
  KapsoSendMessageResult,
  KapsoTemplateDefinition,
  KapsoTemplateMessage,
  KapsoWebhookEvent,
} from "./kapso.types";

async function kapsoRequest<T>(
  config: KapsoConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseText = await response.text();
  const responseBody = responseText ? safeJsonParse(responseText) : null;
  if (!response.ok) {
    const error = new Error(
      `Kapso API ${response.status}: ${extractKapsoError(responseBody, responseText)}`,
    );
    Object.assign(error, {
      statusCode: response.status,
      responseBody,
    });
    throw error;
  }

  return responseBody as T;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractKapsoError(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const nestedError =
      record.error && typeof record.error === "object"
        ? (record.error as Record<string, unknown>)
        : null;
    return String(
      nestedError?.message ||
        record.message ||
        record.error ||
        fallback ||
        "Unknown Kapso error",
    );
  }
  return String(body || fallback || "Unknown Kapso error");
}

const templateAccountCooldownMs = 15 * 60_000;
const templateAccountCooldowns = new Map<string, number>();

function templateAccountKey(config: KapsoConfig) {
  return `${config.apiBaseUrl}|${config.businessAccountId || ""}`;
}

export function getKapsoTemplateSyncCooldownMs(config: KapsoConfig) {
  const key = templateAccountKey(config);
  const retryAt = templateAccountCooldowns.get(key) || 0;
  if (retryAt <= Date.now()) {
    templateAccountCooldowns.delete(key);
    return 0;
  }
  return retryAt - Date.now();
}

function createKapsoTemplateCooldownError(retryAfterMs: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return Object.assign(
    new Error(
      `Kapso limitó las solicitudes. Nexus pausó nuevas consultas y sincronizaciones durante ${minutes} minutos.`,
    ),
    {
      statusCode: 429,
      code: "KAPSO_TEMPLATE_RATE_LIMITED_COOLDOWN",
      retryAfterMs,
    },
  );
}

function recordKapsoTemplateRateLimit(config: KapsoConfig, error: any) {
  if (error?.code === "KAPSO_TEMPLATE_RATE_LIMITED_COOLDOWN") return;
  const providerCode = Number(error?.responseBody?.error?.code);
  if (Number(error?.statusCode) !== 429 && providerCode !== 80008) return;
  templateAccountCooldowns.set(
    templateAccountKey(config),
    Date.now() + templateAccountCooldownMs,
  );
}

async function requestKapsoTemplate<T>(
  config: KapsoConfig,
  request: () => Promise<T>,
) {
  const retryAfterMs = getKapsoTemplateSyncCooldownMs(config);
  if (retryAfterMs > 0) throw createKapsoTemplateCooldownError(retryAfterMs);

  try {
    const result = await request();
    templateAccountCooldowns.delete(templateAccountKey(config));
    return result;
  } catch (error) {
    recordKapsoTemplateRateLimit(config, error);
    throw error;
  }
}

export const kapsoClient = {
  ingestResumableMedia(config: KapsoConfig, source: string) {
    return kapsoRequest<{
      data: { target?: { kind?: string; handle?: string } };
    }>(config, "POST", "/platform/v1/whatsapp/media", {
      media_ingest: {
        phone_number_id: config.phoneNumberId,
        source,
        delivery: "meta_resumable_asset",
      },
    });
  },

  listCustomers(
    config: Pick<KapsoConfig, "apiKey" | "apiBaseUrl">,
    externalCustomerId?: string,
  ) {
    const query = externalCustomerId
      ? `?${new URLSearchParams({
          external_customer_id: externalCustomerId,
        }).toString()}`
      : "";
    return kapsoRequest<{
      data: Array<Record<string, unknown>>;
    }>(config as KapsoConfig, "GET", `/platform/v1/customers${query}`);
  },

  createCustomer(
    config: Pick<KapsoConfig, "apiKey" | "apiBaseUrl">,
    customer: { name: string; externalCustomerId: string },
  ) {
    return kapsoRequest<{ data: Record<string, unknown> }>(
      config as KapsoConfig,
      "POST",
      "/platform/v1/customers",
      {
        customer: {
          name: customer.name,
          external_customer_id: customer.externalCustomerId,
        },
      },
    );
  },

  createSetupLink(
    config: Pick<KapsoConfig, "apiKey" | "apiBaseUrl">,
    customerId: string,
    setupLink: {
      successRedirectUrl: string;
      failureRedirectUrl: string;
    },
  ) {
    return kapsoRequest<{ data: Record<string, unknown> }>(
      config as KapsoConfig,
      "POST",
      `/platform/v1/customers/${encodeURIComponent(customerId)}/setup_links`,
      {
        setup_link: {
          success_redirect_url: setupLink.successRedirectUrl,
          failure_redirect_url: setupLink.failureRedirectUrl,
          allowed_connection_types: ["coexistence"],
          provision_phone_number: false,
          language: "es",
        },
      },
    );
  },

  async getPhoneNumber(config: KapsoConfig) {
    try {
      const response = await kapsoRequest<{
        data: { data?: Record<string, unknown> } | Record<string, unknown>;
      }>(
        config,
        "GET",
        `/platform/v1/whatsapp/phone_numbers/${encodeURIComponent(config.phoneNumberId)}`,
      );
      // Kapso's individual endpoint wraps the phone record in an additional
      // `data` field, while the list endpoint returns the record directly.
      const nested = response.data.data;
      const phoneNumber: Record<string, unknown> =
        nested && typeof nested === "object" && !Array.isArray(nested)
          ? (nested as Record<string, unknown>)
          : response.data;
      return { data: phoneNumber };
    } catch (error: any) {
      // Kapso can list a valid Coexistence number while its per-number lookup
      // temporarily returns 404 after a device migration or re-registration.
      if (error?.statusCode !== 404) throw error;

      const response = await kapsoRequest<{
        data: Array<Record<string, unknown>>;
      }>(config, "GET", "/platform/v1/whatsapp/phone_numbers");
      const phoneNumber = response.data.find(
        (item) =>
          String(item.phone_number_id || item.id || "") ===
          config.phoneNumberId,
      );
      if (!phoneNumber) throw error;
      return { data: phoneNumber };
    }
  },

  deletePhoneNumber(config: KapsoConfig) {
    return kapsoRequest<null>(
      config,
      "DELETE",
      `/platform/v1/whatsapp/phone_numbers/${encodeURIComponent(config.phoneNumberId)}`,
    );
  },

  listTemplates(
    config: KapsoConfig,
    filters: { name?: string; status?: string; language?: string } = {},
  ) {
    if (!config.businessAccountId) {
      throw Object.assign(
        new Error("KAPSO_BUSINESS_ACCOUNT_ID is required to list templates."),
        { statusCode: 400 },
      );
    }
    return requestKapsoTemplate(config, () =>
      kapsoRequest<{ data: Array<Record<string, unknown>> }>(
        config,
        "GET",
        `/meta/whatsapp/v24.0/${encodeURIComponent(config.businessAccountId!)}/message_templates?${new URLSearchParams({
          limit: "100",
          ...(filters.name ? { name: filters.name } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.language ? { language: filters.language } : {}),
        }).toString()}`,
      ),
    );
  },

  createTemplate(config: KapsoConfig, definition: KapsoTemplateDefinition) {
    if (!config.businessAccountId) {
      throw Object.assign(
        new Error("Business Account ID is required to create templates."),
        { statusCode: 400 },
      );
    }
    return requestKapsoTemplate(config, () =>
      kapsoRequest<{
        id: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        category: string;
      }>(
        config,
        "POST",
        `/meta/whatsapp/v24.0/${encodeURIComponent(config.businessAccountId!)}/message_templates`,
        definition,
      ),
    ).then((result) => {
      invalidateKapsoTemplateCatalogCache(config);
      return result;
    });
  },

  deleteTemplate(config: KapsoConfig, templateName: string) {
    if (!config.businessAccountId) {
      throw Object.assign(
        new Error("Business Account ID is required to delete templates."),
        { statusCode: 400 },
      );
    }
    return requestKapsoTemplate(config, () =>
      kapsoRequest<{ success?: boolean }>(
        config,
        "DELETE",
        `/meta/whatsapp/v24.0/${encodeURIComponent(config.businessAccountId!)}/message_templates?${new URLSearchParams({ name: templateName }).toString()}`,
      ),
    ).then((result) => {
      invalidateKapsoTemplateCatalogCache(config);
      return result;
    });
  },

  listMessages(
    config: KapsoConfig,
    options: {
      direction?: "inbound" | "outbound";
      limit?: number;
    } = {},
  ) {
    const query = new URLSearchParams({
      limit: String(options.limit ?? 20),
      fields:
        "kapso(direction,status,processing_status,phone_number,contact_name,content,statuses)",
    });
    if (options.direction) query.set("direction", options.direction);

    return kapsoRequest<{
      data: Array<Record<string, unknown>>;
      paging?: Record<string, unknown>;
    }>(
      config,
      "GET",
      `/meta/whatsapp/v24.0/${encodeURIComponent(config.phoneNumberId)}/messages?${query.toString()}`,
    );
  },

  getMessage(config: KapsoConfig, messageId: string) {
    const query = new URLSearchParams({
      fields:
        "kapso(direction,status,processing_status,phone_number,contact_name,content,statuses)",
    });
    return kapsoRequest<Record<string, unknown>>(
      config,
      "GET",
      `/meta/whatsapp/v24.0/${encodeURIComponent(config.phoneNumberId)}/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
    );
  },

  sendText(
    config: KapsoConfig,
    recipientPhone: string,
    text: string,
    callbackData?: string,
  ) {
    return kapsoRequest<KapsoSendMessageResult>(
      config,
      "POST",
      `/meta/whatsapp/v24.0/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: { body: text },
        ...(callbackData ? { biz_opaque_callback_data: callbackData } : {}),
      },
    );
  },

  sendTemplate(
    config: KapsoConfig,
    recipientPhone: string,
    template: KapsoTemplateMessage,
    callbackData?: string,
  ) {
    return kapsoRequest<KapsoSendMessageResult>(
      config,
      "POST",
      `/meta/whatsapp/v24.0/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "template",
        template,
        ...(callbackData ? { biz_opaque_callback_data: callbackData } : {}),
      },
    );
  },

  createWebhook(
    config: KapsoConfig,
    url: string,
    secretKey: string,
    events: KapsoWebhookEvent[],
  ) {
    return kapsoRequest<{ data: Record<string, unknown> }>(
      config,
      "POST",
      `/platform/v1/whatsapp/phone_numbers/${encodeURIComponent(config.phoneNumberId)}/webhooks`,
      {
        whatsapp_webhook: {
          kind: "kapso",
          url,
          events,
          secret_key: secretKey,
        },
      },
    );
  },

  listWebhooks(config: KapsoConfig) {
    return kapsoRequest<{ data: Array<Record<string, unknown>> }>(
      config,
      "GET",
      `/platform/v1/whatsapp/phone_numbers/${encodeURIComponent(config.phoneNumberId)}/webhooks`,
    );
  },

  deleteWebhook(config: KapsoConfig, webhookId: string) {
    return kapsoRequest<{ data?: Record<string, unknown> } | null>(
      config,
      "DELETE",
      `/platform/v1/whatsapp/phone_numbers/${encodeURIComponent(config.phoneNumberId)}/webhooks/${encodeURIComponent(webhookId)}`,
    );
  },

  listProjectWebhooks(
    config: Pick<KapsoConfig, "apiKey" | "apiBaseUrl">,
  ) {
    return kapsoRequest<{ data: Array<Record<string, unknown>> }>(
      config as KapsoConfig,
      "GET",
      "/platform/v1/whatsapp/webhooks",
    );
  },

  createProjectWebhook(
    config: Pick<KapsoConfig, "apiKey" | "apiBaseUrl">,
    url: string,
    secretKey: string,
    events: KapsoProjectWebhookEvent[],
  ) {
    return kapsoRequest<{ data: Record<string, unknown> }>(
      config as KapsoConfig,
      "POST",
      "/platform/v1/whatsapp/webhooks",
      {
        whatsapp_webhook: {
          kind: "kapso",
          url,
          secret_key: secretKey,
          events,
        },
      },
    );
  },
};

const templateCatalogCacheTtlMs = 5 * 60_000;
type KapsoTemplateCatalog = { data: Array<Record<string, unknown>> };
const templateCatalogCache = new Map<
  string,
  { expiresAt: number; response: KapsoTemplateCatalog }
>();
const templateCatalogRequests = new Map<string, Promise<KapsoTemplateCatalog>>();
const templateCatalogCacheGenerations = new Map<string, number>();
const templateCatalogFailures = new Map<
  string,
  { retryAt: number; error: unknown }
>();

function templateCatalogCacheKey(config: KapsoConfig) {
  return `${config.apiBaseUrl}|${config.businessAccountId || ""}|${config.apiKey}`;
}

export function invalidateKapsoTemplateCatalogCache(config: KapsoConfig) {
  const key = templateCatalogCacheKey(config);
  templateCatalogCache.delete(key);
  templateCatalogRequests.delete(key);
  templateCatalogFailures.delete(key);
  templateCatalogCacheGenerations.set(
    key,
    (templateCatalogCacheGenerations.get(key) || 0) + 1,
  );
}

export async function listKapsoTemplateCatalogCached(config: KapsoConfig) {
  const key = templateCatalogCacheKey(config);
  const cached = templateCatalogCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  const failure = templateCatalogFailures.get(key);
  if (failure && failure.retryAt > Date.now()) throw failure.error;
  const retryAfterMs = getKapsoTemplateSyncCooldownMs(config);
  if (retryAfterMs > 0) throw createKapsoTemplateCooldownError(retryAfterMs);

  const pending = templateCatalogRequests.get(key);
  if (pending) return pending;

  const generation = templateCatalogCacheGenerations.get(key) || 0;
  const request = kapsoClient.listTemplates(config);
  templateCatalogRequests.set(key, request);
  try {
    const response = await request;
    if ((templateCatalogCacheGenerations.get(key) || 0) === generation) {
      templateCatalogFailures.delete(key);
      templateCatalogCache.set(key, {
        expiresAt: Date.now() + templateCatalogCacheTtlMs,
        response,
      });
    }
    return response;
  } catch (error: any) {
    const rateLimited =
      Number(error?.statusCode) === 429 ||
      Number(error?.responseBody?.error?.code) === 80008;
    if ((templateCatalogCacheGenerations.get(key) || 0) === generation) {
      templateCatalogFailures.set(key, {
        retryAt: Date.now() + (rateLimited ? templateAccountCooldownMs : 30_000),
        error,
      });
    }
    throw error;
  } finally {
    if (templateCatalogRequests.get(key) === request) {
      templateCatalogRequests.delete(key);
    }
  }
}
