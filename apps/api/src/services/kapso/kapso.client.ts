import type {
  KapsoConfig,
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

export const kapsoClient = {
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

  getPhoneNumber(config: KapsoConfig) {
    return kapsoRequest<{ data: Record<string, unknown> }>(
      config,
      "GET",
      `/platform/v1/whatsapp/phone_numbers/${encodeURIComponent(config.phoneNumberId)}`,
    );
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
    return kapsoRequest<{ data: Array<Record<string, unknown>> }>(
      config,
      "GET",
      `/meta/whatsapp/v24.0/${encodeURIComponent(config.businessAccountId)}/message_templates?${new URLSearchParams({
        limit: "100",
        ...(filters.name ? { name: filters.name } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.language ? { language: filters.language } : {}),
      }).toString()}`,
    );
  },

  createTemplate(config: KapsoConfig, definition: KapsoTemplateDefinition) {
    if (!config.businessAccountId) {
      throw Object.assign(
        new Error("Business Account ID is required to create templates."),
        { statusCode: 400 },
      );
    }
    return kapsoRequest<{
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      category: string;
    }>(
      config,
      "POST",
      `/meta/whatsapp/v24.0/${encodeURIComponent(config.businessAccountId)}/message_templates`,
      definition,
    );
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
};
