import { FastifyInstance } from "fastify";
import { z } from "zod";
import { rafflePrisma } from "@nexus/db/raffle";
import { toWhatsAppCloudPhoneNumber } from "../../../utils/customer-phone";
import { ensureRaffleWhatsappHeader } from "../../raffle/raffles/raffle-whatsapp-media.service";
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
  buildTemplateName,
  extractCloudTemplateVariables,
  getCloudTemplateBodyContent,
  getCloudTemplateOwnerKey,
  getCloudTemplateScopesForPurpose,
  getTemplateActiveVersionSettingKey,
  resolveCloudTemplateOwner,
  syncCloudTemplateCatalog,
  type CloudTemplateSource,
  type CloudTemplateType,
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
  variant: z.enum(["LEGACY", "SIMPLIFIED"]).default("LEGACY"),
});

const cloudTemplateSyncSchema = cloudTemplateTargetSchema.extend({
  scope: z.enum(["STORE", "RAFFLES"]).optional(),
  type: z.string().trim().min(1).optional(),
});

const KAPSO_MESSAGE_EVENTS = [
  "whatsapp.message.received",
  "whatsapp.message.sent",
  "whatsapp.message.delivered",
  "whatsapp.message.read",
  "whatsapp.message.failed",
] as const;

function normalizeKapsoTemplateStatus(value: unknown) {
  const normalized = String(value || "PENDING").toUpperCase();
  return ["APPROVED", "PENDING", "REJECTED"].includes(normalized)
    ? normalized
    : "PENDING";
}

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

  const resolveCloudTemplateTarget = async (
    channelId?: number,
    variant: "LEGACY" | "SIMPLIFIED" = "LEGACY",
    scope?: "STORE" | "RAFFLES",
    type?: CloudTemplateType,
  ) => {
    const settings = await server.storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            ...CLOUD_TEMPLATE_SETTING_KEYS.map((item) => item.key),
            ...CLOUD_TEMPLATE_SETTING_KEYS.map((item) => `${item.key}_simplified`),
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
      const sources = buildCanonicalCloudTemplateSources(
        settingsMap,
        ["STORE", "RAFFLES"],
        variant,
      )
        .filter((source) => !scope || source.scope === scope)
        .filter((source) => !type || source.type === type);

      return {
        owner: { kind: "principal" as const },
        config: getKapsoConfigForChannel({
          phoneNumberId: settingsMap.whatsapp_main_kapso_phone_number_id || "",
          businessAccountId:
            settingsMap.whatsapp_main_kapso_business_account_id || undefined,
        }),
        sources,
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
      variant,
    )
      .filter((source) => !scope || source.scope === scope)
      .filter((source) => !type || source.type === type);

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

  const resolveRaffleInvitationHeaderHandle = async (
    config: NonNullable<ReturnType<typeof getKapsoConfigForChannel>>,
  ) => {
    const raffle = await rafflePrisma.raffle.findFirst({
      where: { image: { not: null } },
      orderBy: { id: "desc" },
      select: { id: true, image: true, imageType: true, imagePoster: true, whatsappHeaderUrl: true },
    });
    if (raffle?.whatsappHeaderUrl) {
      const uploaded = await kapsoClient.ingestResumableMedia(
        config,
        raffle.whatsappHeaderUrl,
      );
      return uploaded.data.target?.handle || null;
    }
    const sourceUrl =
      raffle?.imageType === "VIDEO"
        ? raffle.imagePoster || raffle.image
        : raffle?.image;
    if (!raffle || !sourceUrl) return null;
    const publicUrl = await ensureRaffleWhatsappHeader(raffle.id, sourceUrl);
    if (!publicUrl) return null;
    const uploaded = await kapsoClient.ingestResumableMedia(config, publicUrl);
    return uploaded.data.target?.handle || null;
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
      let body: z.infer<typeof cloudTemplateSyncSchema>;
      try {
        body = cloudTemplateSyncSchema.parse(request.body || {});
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      const target = await resolveCloudTemplateTarget(
        body.channelId,
        body.variant,
        body.scope,
        body.type as CloudTemplateType | undefined,
      );
      if (!target) {
        return reply.status(404).send({ message: "Canal no encontrado." });
      }
      if (!target.config?.businessAccountId) {
        return reply.status(409).send({
          message:
            "Configura Phone Number ID y Business Account ID antes de sincronizar.",
        });
      }
      if ((body.scope || body.type) && target.sources.length === 0) {
        return reply.status(400).send({
          message: "La plantilla seleccionada no está disponible para este canal.",
        });
      }

      const templates = await syncCloudTemplateCatalog({
        owner: target.owner,
        config: target.config,
        sources: target.sources,
        resolveRichInvitationHeaderHandle: () =>
          resolveRaffleInvitationHeaderHandle(target.config!),
      });
      const failedTemplate = templates.find(
        (item) => item.status === "ERROR",
      );
      if (failedTemplate) {
        const message =
          String(failedTemplate.error || failedTemplate.lastError || "").trim() ||
          "Kapso rechazÃ³ la plantilla Cloud API.";
        request.log.error(
          { template: failedTemplate },
          "Cloud template synchronization failed",
        );
        return reply.status(502).send({
          ok: false,
          message,
          templates,
        });
      }
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

      const target = await resolveCloudTemplateTarget(query.channelId, query.variant);
      if (!target) {
        return reply.status(404).send({ message: "Canal no encontrado." });
      }
      const ownerKey = getCloudTemplateOwnerKey(target.owner);
      const mappings = await server.storePrisma.whatsappCloudTemplate.findMany({
        where: { ownerKey },
      });
      const candidates =
        await server.storePrisma.whatsappCloudTemplateCandidate.findMany({
          where: { ownerKey },
        });
      let remoteTemplates: Array<Record<string, unknown>> = [];
      if (target.config?.businessAccountId) {
        try {
          const remote = await kapsoClient.listTemplates(target.config);
          remoteTemplates = remote.data || [];
        } catch (error) {
          request.log.warn(
            { error, ownerKey },
            "Could not refresh Cloud API template readiness from Kapso",
          );
        }
      }

      const templates = await Promise.all(target.sources.map(async (source) => {
        const mapping = mappings.find(
          (item) =>
            item.scope === source.scope &&
            item.type === source.type &&
            item.variant === source.variant,
        );
        const sourceReady = Boolean(source.content.trim());
        const contentHash = sourceReady
          ? getCloudTemplateDefinitionHash(source)
          : null;
        const candidate = contentHash
          ? candidates.find(
              (item) =>
                item.scope === source.scope &&
                item.type === source.type &&
                item.variant === source.variant &&
                item.contentHash === contentHash,
            )
          : null;
        const expectedTemplateName = buildTemplateName(
          target.owner,
          source,
          contentHash || "",
        );
        const remoteNames = new Set(
          [candidate?.templateName, mapping?.templateName, expectedTemplateName]
            .map((value) => String(value || "").trim())
            .filter(Boolean),
        );
        // Kapso can return the locale as `es` or `es_MX` depending on the
        // connected WABA. The template name and remote status are the
        // authoritative identity here; a locale spelling difference must not
        // hide an already approved template.
        const remoteTemplate = remoteTemplates.find((item) =>
          remoteNames.has(String(item.name || "").trim()),
        );
        const remoteStatus = remoteTemplate
          ? normalizeKapsoTemplateStatus(remoteTemplate.status)
          : null;

        const activeVersionKey = getTemplateActiveVersionSettingKey(
          source.scope,
          source.type,
          "CLOUD",
          target.owner,
        );
        const activeVersionSetting = activeVersionKey
          ? await server.storePrisma.setting.findUnique({
              where: { key: activeVersionKey },
              select: { value: true },
            })
          : null;
        const activeVersion = activeVersionSetting?.value || "LEGACY";
        const activeMapping = mappings.find(
          (item) =>
            item.scope === source.scope &&
            item.type === source.type &&
            item.variant === activeVersion,
        );
        const activeCandidate = candidates.find(
          (item) =>
            item.scope === source.scope &&
            item.type === source.type &&
            item.variant === activeVersion &&
            item.status === "APPROVED",
        );

        if (remoteTemplate && candidate) {
          await server.storePrisma.whatsappCloudTemplateCandidate.update({
            where: { id: candidate.id },
            data: {
              templateId:
                String(remoteTemplate.id || "") || candidate.templateId,
              languageCode:
                String(remoteTemplate.language || "") || candidate.languageCode,
              status: remoteStatus!,
              category: String(remoteTemplate.category || candidate.category),
              lastError: null,
              lastSyncedAt: new Date(),
            },
          });
        }
        if (remoteTemplate && mapping) {
          await server.storePrisma.whatsappCloudTemplate.update({
            where: { id: mapping.id },
            data: {
              templateId:
                String(remoteTemplate.id || "") || mapping.templateId,
              languageCode:
                String(remoteTemplate.language || "") || mapping.languageCode,
              status: remoteStatus!,
              category: String(remoteTemplate.category || mapping.category),
              lastError: null,
              lastSyncedAt: new Date(),
            },
          });
        }

        // Recover a mapping if Kapso already contains the approved template
        // but a previous sync did not persist it locally. This makes the
        // activation action and the runtime sender converge on the same
        // approved remote template.
        if (remoteTemplate && !candidate && !mapping) {
          await server.storePrisma.whatsappCloudTemplate.upsert({
            where: {
              ownerKey_scope_type_variant: {
                ownerKey,
                scope: source.scope,
                type: source.type,
                variant: source.variant || query.variant,
              },
            },
            create: {
              channelId:
                target.owner.kind === "channel" ? target.owner.channelId : null,
              ownerKey,
              scope: source.scope,
              type: source.type,
              variant: source.variant,
              templateName: String(remoteTemplate.name || expectedTemplateName),
              templateId: String(remoteTemplate.id || "") || null,
              category: String(remoteTemplate.category || "UTILITY"),
              languageCode:
                String(remoteTemplate.language || "") || "es_MX",
              status: normalizeKapsoTemplateStatus(remoteTemplate.status),
              parameterNames: extractCloudTemplateVariables(
                getCloudTemplateBodyContent(source),
              ),
              contentHash: contentHash || "",
              lastSyncedAt: new Date(),
            },
            update: {
              templateName: String(remoteTemplate.name || expectedTemplateName),
              templateId: String(remoteTemplate.id || "") || null,
              category: String(remoteTemplate.category || "UTILITY"),
              languageCode:
                String(remoteTemplate.language || "") || "es_MX",
              status: normalizeKapsoTemplateStatus(remoteTemplate.status),
              contentHash: contentHash || "",
              lastSyncedAt: new Date(),
            },
          });
        }

        const current =
          sourceReady &&
          (mapping?.contentHash === contentHash ||
            candidate?.status === "APPROVED");
        return {
          scope: source.scope,
          type: source.type,
          variant: source.variant,
          sourceReady,
          templateName:
            candidate?.templateName || mapping?.templateName || remoteTemplate?.name || null,
          status:
            remoteStatus ||
            candidate?.status ||
            (current ? mapping?.status || "NOT_SYNCED" : "NOT_SYNCED"),
          current:
            current ||
            Boolean(
              remoteTemplate &&
                normalizeKapsoTemplateStatus(remoteTemplate.status) === "APPROVED",
            ),
          activeVersion,
          contentHash: candidate?.contentHash || mapping?.contentHash || null,
          activeContentHash:
            activeCandidate?.contentHash || activeMapping?.contentHash || null,
          activeTemplateName:
            activeCandidate?.templateName || activeMapping?.templateName || null,
          lastError: candidate?.lastError || mapping?.lastError || null,
          replacementPending: Boolean(
            candidate && candidate.status !== "APPROVED",
          ),
        };
      }));
      return {
        catalogMode: target.catalogMode || "DEDICATED",
        ownerKey,
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
          const outcome = await whatsappMarketingConsentService.optOut(
            server.storePrisma,
            {
              phone: inbound.senderPhone,
              keyword,
              externalEventId: `kapso:${messageId}`,
              metadata: {
                provider: "KAPSO",
                phoneNumberId: inbound.phoneNumberId,
              },
            },
          );
          optedOut += 1;
          if (outcome.changed) {
            await sendMarketingConsentConfirmation({
              recipientPhone: inbound.senderPhone,
              kind: "OPTED_OUT",
              transport: {
                provider: "KAPSO",
                phoneNumberId: inbound.phoneNumberId,
              },
              inboundMessageId: messageId,
            });
          }
        }
        const optInKeyword = getWhatsappMarketingOptInKeyword(inbound.text);
        if (optInKeyword && inbound.senderPhone) {
          const outcome = await whatsappMarketingConsentService.grant(
            server.storePrisma,
            {
              phone: inbound.senderPhone,
              source: "INBOUND_KEYWORD",
              externalEventId: `kapso:${messageId}`,
              keyword: optInKeyword,
              metadata: {
                provider: "KAPSO",
                keyword: optInKeyword,
                phoneNumberId: inbound.phoneNumberId,
              },
            },
          );
          if (outcome.changed) {
            await sendMarketingConsentConfirmation({
              recipientPhone: inbound.senderPhone,
              kind: "GRANTED",
              transport: {
                provider: "KAPSO",
                phoneNumberId: inbound.phoneNumberId,
              },
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
