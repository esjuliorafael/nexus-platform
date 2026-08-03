import { FastifyInstance } from "fastify";
import { z } from "zod";
import { toWhatsAppCloudPhoneNumber } from "../../../utils/customer-phone";
import {
  getKapsoConfig,
  getKapsoConfigForChannel,
  isKapsoPilotEnabled,
  requireKapsoConfig,
  requireKapsoPlatformConfig,
} from "../../../services/kapso/kapso.config";
import { kapsoClient } from "../../../services/kapso/kapso.client";
import {
  getKapsoWebhookError,
  getKapsoInboundMessage,
  normalizeKapsoWebhookStatus,
  shouldAdvanceKapsoStatus,
  verifyKapsoWebhookSignature,
} from "../../../services/kapso/kapso-webhook";
import {
  buildCanonicalCloudTemplateSources,
  CLOUD_TEMPLATE_SETTING_KEYS,
  getCloudTemplateDefinitionHash,
  getCloudTemplateOwnerKey,
  getCloudTemplateScopesForPurpose,
  resolveCloudTemplateOwner,
  syncCloudTemplateCatalog,
  type CloudTemplateSource,
} from "../../../services/whatsapp/whatsapp-cloud-template.service";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import {
  getWhatsappMarketingOptInKeyword,
  getWhatsappMarketingOptOutKeyword,
  whatsappMarketingConsentService,
} from "../../../services/whatsapp-marketing-consent.service";
import { buildWhatsappAsyncFallbackPatch } from "../../../services/whatsapp/whatsapp-async-fallback";
import { sendMarketingConsentConfirmation } from "../../../services/whatsapp/whatsapp-marketing-consent-confirmation.service";
import { whatsappCustomerServiceWindowService } from "../../../services/whatsapp/whatsapp-customer-service-window.service";

const testTemplateSchema = z.object({
  recipientPhone: z.string().trim().min(1),
  templateName: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/),
  languageCode: z.string().trim().min(2).default("es_MX"),
});

const testTextSchema = z.object({
  recipientPhone: z.string().trim().min(1),
  text: z.string().trim().min(1).max(4096),
});

const registerWebhookSchema = z.object({
  publicApiUrl: z.string().url(),
});

const channelDiagnosticsSchema = z.object({
  phoneNumberId: z.string().trim().min(1),
  businessAccountId: z.string().trim().optional(),
});

const cloudTemplateTargetSchema = z.object({
  channelId: z.coerce.number().int().positive().optional(),
});

const KAPSO_MESSAGE_EVENTS = [
  "whatsapp.message.received",
  "whatsapp.message.sent",
  "whatsapp.message.delivered",
  "whatsapp.message.read",
  "whatsapp.message.failed",
] as const;

export async function kapsoPilotAdminRoutes(server: FastifyInstance) {
  const getPublicWebhookUrl = (request: any) => {
    const configuredBaseUrl =
      process.env.KAPSO_WEBHOOK_BASE_URL ||
      process.env.API_PUBLIC_URL ||
      process.env.PUBLIC_API_URL ||
      process.env.WEBHOOK_BASE_URL ||
      process.env.MP_TENANT_PUBLIC_API_URL ||
      "";
    if (configuredBaseUrl) {
      return `${configuredBaseUrl.replace(/\/+$/, "")}/api/v1/webhooks/kapso`;
    }
    const protocol =
      request.headers["x-forwarded-proto"] || request.protocol || "http";
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    return `${protocol}://${host}/api/v1/webhooks/kapso`;
  };

  const ensureChannelWebhook = async (
    request: any,
    config: ReturnType<typeof getKapsoConfigForChannel>,
  ) => {
    if (!config?.webhookSecret) {
      return {
        ready: false,
        reason: "KAPSO_WEBHOOK_SECRET no está configurado.",
      };
    }
    const webhookUrl = getPublicWebhookUrl(request);
    const current = await kapsoClient.listWebhooks(config);
    const existing = current.data.find(
      (item) => String(item.url || "") === webhookUrl && item.active !== false,
    );
    if (existing) return { ready: true, webhookId: existing.id || null };

    const created = await kapsoClient.createWebhook(
      config,
      webhookUrl,
      config.webhookSecret,
      [...KAPSO_MESSAGE_EVENTS],
    );
    return { ready: true, webhookId: created.data.id || null };
  };

  const resolveCloudTemplateTarget = async (channelId?: number) => {
    const settings = await server.storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            ...CLOUD_TEMPLATE_SETTING_KEYS.map((item) => item.key),
            "whatsapp_main_kapso_phone_number_id",
            "whatsapp_main_kapso_business_account_id",
          ],
        },
      },
    });
    const settingsMap = Object.fromEntries(
      settings.map((item) => [item.key, item.value || ""]),
    );

    if (!channelId) {
      return {
        owner: { kind: "principal" as const },
        config: getKapsoConfigForChannel({
          phoneNumberId: settingsMap.whatsapp_main_kapso_phone_number_id || "",
          businessAccountId:
            settingsMap.whatsapp_main_kapso_business_account_id || undefined,
        }),
        sources: buildCanonicalCloudTemplateSources(settingsMap),
      };
    }

    const channel = await server.storePrisma.whatsappChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) return null;

    const scopes = getCloudTemplateScopesForPurpose(channel.purpose);
    const sources: CloudTemplateSource[] = buildCanonicalCloudTemplateSources(
      settingsMap,
      scopes,
    );

    const channelOwner = {
      kind: "channel" as const,
      channelId: channel.id,
      purpose: channel.purpose,
    };
    const owner = resolveCloudTemplateOwner({
      channelOwner,
      channelBusinessAccountId: channel.kapsoBusinessAccountId,
      principalBusinessAccountId:
        settingsMap.whatsapp_main_kapso_business_account_id,
    });

    return {
      owner,
      catalogMode: owner.kind === "principal" ? "SHARED" : "DEDICATED",
      channelOwner: {
        kind: "channel" as const,
        channelId: channel.id,
        purpose: channel.purpose,
      },
      config: getKapsoConfigForChannel({
        phoneNumberId: channel.kapsoPhoneNumberId || "",
        businessAccountId: channel.kapsoBusinessAccountId || undefined,
      }),
      sources,
    };
  };

  server.post(
    "/channel-diagnostics",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof channelDiagnosticsSchema>;
      try {
        body = channelDiagnosticsSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      const config = getKapsoConfigForChannel(body);
      if (!config) {
        return reply.status(503).send({
          message: "KAPSO_API_KEY is not configured for this API.",
        });
      }

      const phoneNumber = await kapsoClient.getPhoneNumber(config);
      return {
        configured: true,
        phoneNumber: phoneNumber.data,
      };
    },
  );

  server.post(
    "/sync-templates",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof cloudTemplateTargetSchema>;
      try {
        body = cloudTemplateTargetSchema.parse(request.body || {});
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      const target = await resolveCloudTemplateTarget(body.channelId);
      if (!target) {
        return reply.status(404).send({ message: "Canal no encontrado." });
      }
      if (!target.config?.businessAccountId) {
        return reply.status(409).send({
          message:
            "Configura Phone Number ID y Business Account ID antes de sincronizar.",
        });
      }

      const templates = await syncCloudTemplateCatalog({
        owner: target.owner,
        config: target.config,
        sources: target.sources,
      });
      const webhook = await ensureChannelWebhook(request, target.config);
      return {
        ok: true,
        catalogMode: target.catalogMode || "DEDICATED",
        ready:
          templates.length > 0 &&
          templates
            .filter((item) => item.status !== "MISSING_SOURCE")
            .every((item) => item.status === "APPROVED"),
        templates,
        webhook,
      };
    },
  );

  server.get(
    "/template-readiness",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let query: z.infer<typeof cloudTemplateTargetSchema>;
      try {
        query = cloudTemplateTargetSchema.parse(request.query || {});
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      const target = await resolveCloudTemplateTarget(query.channelId);
      if (!target) {
        return reply.status(404).send({ message: "Canal no encontrado." });
      }
      const ownerKey = getCloudTemplateOwnerKey(target.owner);
      const mappings = await server.storePrisma.whatsappCloudTemplate.findMany({
        where: { ownerKey },
      });
      const templates = target.sources.map((source) => {
        const mapping = mappings.find(
          (item) => item.scope === source.scope && item.type === source.type,
        );
        const sourceReady = Boolean(source.content.trim());
        const current =
          sourceReady &&
          mapping?.contentHash === getCloudTemplateDefinitionHash(source);
        return {
          scope: source.scope,
          type: source.type,
          sourceReady,
          templateName: mapping?.templateName || null,
          status: current ? mapping?.status || "NOT_SYNCED" : "NOT_SYNCED",
          current,
          lastError: mapping?.lastError || null,
        };
      });
      return {
        catalogMode: target.catalogMode || "DEDICATED",
        ready:
          templates.length > 0 &&
          templates.every(
            (item) =>
              item.sourceReady && item.current && item.status === "APPROVED",
          ),
        templates,
      };
    },
  );

  server.get(
    "/diagnostics",
    { preHandler: [server.authenticate] },
    async () => {
      const config = getKapsoConfig();
      if (!config) {
        return {
          enabled: isKapsoPilotEnabled(),
          configured: false,
          message:
            "Set KAPSO_API_KEY and KAPSO_PHONE_NUMBER_ID in apps/api/.env.",
        };
      }

      const phoneNumber = await kapsoClient.getPhoneNumber(config);
      return {
        enabled: isKapsoPilotEnabled(),
        configured: true,
        hasWebhookSecret: Boolean(config.webhookSecret),
        hasBusinessAccountId: Boolean(config.businessAccountId),
        phoneNumber: phoneNumber.data,
      };
    },
  );

  server.get("/templates", { preHandler: [server.authenticate] }, async () => {
    const result = await kapsoClient.listTemplates(requireKapsoConfig());
    return {
      data: result.data.map((template) => ({
        id: template.id,
        name: template.name,
        language: template.language,
        category: template.category,
        status: template.status,
      })),
    };
  });

  server.get(
    "/messages",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let query: { direction?: "inbound" | "outbound"; limit: number };
      try {
        query = z
          .object({
            direction: z.enum(["inbound", "outbound"]).optional(),
            limit: z.coerce.number().int().min(1).max(100).default(20),
          })
          .parse(request.query);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      return kapsoClient.listMessages(requireKapsoConfig(), query);
    },
  );

  server.post(
    "/test-text",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof testTextSchema>;
      try {
        body = testTextSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      if (!isKapsoPilotEnabled()) {
        return reply.status(409).send({
          message:
            "Kapso pilot is disabled. Set KAPSO_PILOT_ENABLED=true locally.",
        });
      }

      const config = requireKapsoConfig();
      const recipientPhone = toWhatsAppCloudPhoneNumber(body.recipientPhone);
      const result = await kapsoClient.sendText(
        config,
        recipientPhone,
        body.text,
        `nexus-local-text-test:${Date.now()}`,
      );

      return {
        ok: true,
        messageId: result.messages?.[0]?.id || null,
        provider: "KAPSO",
      };
    },
  );

  server.post(
    "/test-template",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof testTemplateSchema>;
      try {
        body = testTemplateSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      if (!isKapsoPilotEnabled()) {
        return reply.status(409).send({
          message:
            "Kapso pilot is disabled. Set KAPSO_PILOT_ENABLED=true locally.",
        });
      }

      const config = requireKapsoConfig();
      const recipientPhone = toWhatsAppCloudPhoneNumber(body.recipientPhone);
      const result = await kapsoClient.sendTemplate(
        config,
        recipientPhone,
        {
          name: body.templateName,
          language: { code: body.languageCode },
        },
        `nexus-local-test:${Date.now()}`,
      );
      const messageId = result.messages?.[0]?.id;

      if (messageId) {
        await server.storePrisma.whatsappMessageLog.create({
          data: {
            attempt: 1,
            recipientPhone: body.recipientPhone,
            instanceName: `kapso:${config.phoneNumberId}`,
            provider: "KAPSO",
            messageId,
            providerStatus: "accepted",
            responsePayload: {
              provider: "KAPSO",
              payload: result,
              nexusRouting: { route: "DIRECT" },
            },
            templateUsed: `kapso_test:${body.templateName}`,
            status: "sent",
          },
        });
      }

      return {
        ok: true,
        messageId: messageId || null,
        provider: "KAPSO",
      };
    },
  );

  server.post(
    "/register-webhook",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof registerWebhookSchema>;
      try {
        body = registerWebhookSchema.parse(request.body);
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      const config = requireKapsoConfig();
      if (!config.webhookSecret) {
        return reply.status(400).send({
          message:
            "KAPSO_WEBHOOK_SECRET is required before registering the webhook.",
        });
      }

      const baseUrl = body.publicApiUrl.replace(/\/+$/, "");
      const result = await kapsoClient.createWebhook(
        config,
        `${baseUrl}/api/v1/webhooks/kapso`,
        config.webhookSecret,
        [...KAPSO_MESSAGE_EVENTS],
      );
      return { ok: true, webhook: result.data };
    },
  );
}

export async function kapsoWebhookRoutes(server: FastifyInstance) {
  server.post("/kapso", async (request, reply) => {
    // This endpoint receives events for every tenant phone number. The linked
    // identity lives in channel settings, so a global phone number must not be
    // required merely to verify Kapso's project webhook.
    const config = requireKapsoPlatformConfig();
    if (!config.webhookSecret) {
      return reply
        .status(503)
        .send({ message: "Kapso webhook is not configured." });
    }

    if (
      !verifyKapsoWebhookSignature(
        request.body,
        request.headers["x-webhook-signature"],
        config.webhookSecret,
      )
    ) {
      return reply.status(401).send({ message: "Invalid webhook signature." });
    }

    const eventName = String(request.headers["x-webhook-event"] || "");
    const body = request.body as any;
    const payloads =
      request.headers["x-webhook-batch"] === "true" || body?.batch === true
        ? Array.isArray(body?.data)
          ? body.data
          : []
        : [body];

    let updated = 0;
    let optedOut = 0;
    for (const payload of payloads) {
      const messageId = String(payload?.message?.id || "");
      if (!messageId) continue;

      if (eventName === "whatsapp.message.received") {
        const inbound = getKapsoInboundMessage(payload);
        if (inbound.senderPhone) {
          await whatsappCustomerServiceWindowService.openKapsoWindow({
            recipientPhone: inbound.senderPhone,
            phoneNumberId: inbound.phoneNumberId,
            inboundMessageId: inbound.messageId,
          });
        }
        const keyword = getWhatsappMarketingOptOutKeyword(inbound.text);
        if (keyword && inbound.senderPhone) {
          const outcome = await whatsappMarketingConsentService.optOut(server.storePrisma, {
            phone: inbound.senderPhone,
            keyword,
            externalEventId: `kapso:${messageId}`,
            metadata: {
              provider: "KAPSO",
              phoneNumberId: inbound.phoneNumberId,
            },
          });
          optedOut += 1;
          if (outcome.changed) {
            await sendMarketingConsentConfirmation({
              recipientPhone: inbound.senderPhone,
              kind: "OPTED_OUT",
              transport: { provider: "KAPSO", phoneNumberId: inbound.phoneNumberId },
              inboundMessageId: messageId,
            });
          }
        }
        const optInKeyword = getWhatsappMarketingOptInKeyword(inbound.text);
        if (optInKeyword && inbound.senderPhone) {
          const outcome = await whatsappMarketingConsentService.grant(server.storePrisma, {
            phone: inbound.senderPhone,
            source: "INBOUND_KEYWORD",
            externalEventId: `kapso:${messageId}`,
            keyword: optInKeyword,
            metadata: {
              provider: "KAPSO",
              keyword: optInKeyword,
              phoneNumberId: inbound.phoneNumberId,
            },
          });
          if (outcome.changed) {
            await sendMarketingConsentConfirmation({
              recipientPhone: inbound.senderPhone,
              kind: "GRANTED",
              transport: { provider: "KAPSO", phoneNumberId: inbound.phoneNumberId },
              inboundMessageId: messageId,
            });
          }
        }
        continue;
      }

      const existing = await server.storePrisma.whatsappMessageLog.findFirst({
        where: { messageId, provider: "KAPSO" },
        orderBy: { sentAt: "desc" },
      });
      if (!existing) continue;

      const nextStatus = normalizeKapsoWebhookStatus(eventName, payload);
      if (!shouldAdvanceKapsoStatus(existing.status, nextStatus)) continue;

      const previousPayload =
        existing.responsePayload &&
        typeof existing.responsePayload === "object" &&
        !Array.isArray(existing.responsePayload)
          ? (existing.responsePayload as Record<string, unknown>)
          : {};
      await server.storePrisma.whatsappMessageLog.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          providerStatus: String(payload?.message?.kapso?.status || nextStatus),
          lastStatusAt: new Date(),
          errorMessage:
            nextStatus === "failed" ? getKapsoWebhookError(payload) : null,
          responsePayload: {
            provider: "KAPSO",
            event: eventName,
            payload,
            nexusRouting: previousPayload.nexusRouting || { route: "DIRECT" },
          },
        },
      });
      if (nextStatus === "failed" && existing.jobId) {
        const originalJob = await whatsappQueue.getJob(existing.jobId);
        if (originalJob) {
          const routing =
            previousPayload.nexusRouting &&
            typeof previousPayload.nexusRouting === "object"
              ? (previousPayload.nexusRouting as Record<string, unknown>)
              : {};
          const fallbackPatch = buildWhatsappAsyncFallbackPatch({
            failedProvider: "KAPSO",
            routing: routing as any,
            originalJob: originalJob.data,
          });
          if (fallbackPatch) {
            await whatsappQueue.add(
              `${originalJob.name}-kapso-fallback`,
              {
                ...originalJob.data,
                ...fallbackPatch,
                fallbackOfMessageId: messageId,
              },
              { jobId: `kapso-fallback-${messageId}` },
            );
          }
        }
      }
      updated += 1;
    }

    return reply.send({ ok: true, updated, optedOut });
  });
}
