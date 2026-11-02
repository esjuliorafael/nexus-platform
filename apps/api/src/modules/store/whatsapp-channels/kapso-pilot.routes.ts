import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { rafflePrisma } from "@nexus/db/raffle";
import { toWhatsAppCloudPhoneNumber } from "../../../utils/customer-phone";
import { ensureRaffleWhatsappHeader } from "../../raffle/raffles/raffle-whatsapp-media.service";
import { renderParticipationTicketJpeg } from "../../raffle/ticket-sales/raffle-participation-ticket.service";
import { storageService } from "../../../services/storage.service";
import {
  getKapsoConfig,
  getKapsoConfigForChannel,
  isKapsoPilotEnabled,
  requireKapsoConfig,
  requireKapsoPlatformConfig,
} from "../../../services/kapso/kapso.config";
import {
  getKapsoTemplateSyncCooldownMs,
  kapsoClient,
  listKapsoTemplateCatalogCached,
} from "../../../services/kapso/kapso.client";
import {
  getKapsoWebhookError,
  getKapsoInboundMessage,
  normalizeKapsoWebhookStatus,
  registerKapsoRawBodyCapture,
  shouldAdvanceKapsoStatus,
  verifyKapsoWebhookSignature,
} from "../../../services/kapso/kapso-webhook";
import {
  buildCanonicalCloudTemplateSources,
  CLOUD_TEMPLATE_SETTING_KEYS,
  getCloudTemplateDefinitionHash,
  findCloudTemplateInCatalog,
  buildTemplateName,
  getCloudTemplateOwnerKey,
  getCloudTemplateScopesForPurpose,
  getTemplateActiveVersionSettingKey,
  getCloudTemplateRemoteHealth,
  resolveCloudTemplateOwner,
  syncCloudTemplateCatalog,
  type CloudTemplateSource,
  type CloudTemplateType,
} from "../../../services/whatsapp/whatsapp-cloud-template.service";
import {
  buildCloudTemplateDefinitionSnapshot,
  recordCloudTemplateAuditEvent,
  recordCloudTemplateStatusTransition,
} from "../../../services/whatsapp/whatsapp-cloud-template-audit.service";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import { enqueueRafflePaymentInstructionsAfterDelivery } from "../../raffle/ticket-sales/raffle-payment-instructions-queue";
import { finalizeManualParticipationLinkDelivery } from "../../raffle/ticket-sales/raffle-participation-private-link-delivery";
import {
  getWhatsappMarketingOptInKeyword,
  getWhatsappMarketingOptOutKeyword,
  whatsappMarketingConsentService,
} from "../../../services/whatsapp-marketing-consent.service";
import { buildWhatsappAsyncFallbackPatch } from "../../../services/whatsapp/whatsapp-async-fallback";
import { sendMarketingConsentConfirmation } from "../../../services/whatsapp/whatsapp-marketing-consent-confirmation.service";
import { whatsappCustomerServiceWindowService } from "../../../services/whatsapp/whatsapp-customer-service-window.service";
import { sendWhatsappAndLog } from "../../../services/whatsapp/whatsapp-send.service";
import { handleRaffleWhatsappMessage } from "../../raffle/ticket-sales/raffle-whatsapp-assistant.service";
import {
  handleStoreWhatsappMessage,
  sendStorePaymentInstructions,
} from "../orders/store-payment-instructions.service";
import type { ChannelConfig } from "../../../services/evolution/channel.resolver";
import { isKapsoTenantDeliveryEnabled } from "../../../services/whatsapp/whatsapp-delivery-policy";

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
  variant: z.enum(["LEGACY", "SIMPLIFIED", "SIMPLIFIED_TICKET"]).default("LEGACY"),
  scope: z.enum(["STORE", "RAFFLES"]).optional(),
  type: z.string().trim().min(1).optional(),
});

const cloudTemplateSyncSchema = cloudTemplateTargetSchema.extend({
  scope: z.enum(["STORE", "RAFFLES"]).optional(),
  type: z.string().trim().min(1).optional(),
});

const cloudTemplateActivationSchema = cloudTemplateTargetSchema.extend({
  scope: z.enum(["STORE", "RAFFLES"]),
  type: z.string().trim().min(1),
});

const cloudTemplateDeletionSchema = cloudTemplateActivationSchema.extend({
  templateName: z.string().trim().regex(/^[a-z0-9_]+$/),
  contentHash: z.string().trim().min(1),
  confirmationName: z.string().trim().min(1),
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

function getCloudTemplateAuditContext(request: any, origin: string) {
  const actor = request.user || {};
  return {
    actorType: "USER",
    actorId: actor.id == null ? null : String(actor.id),
    actorName: actor.name || actor.username || null,
    actorRole: actor.role || null,
    origin,
    requestId: request.id || null,
    ipAddress: request.ip || null,
    userAgent: String(request.headers?.["user-agent"] || "") || null,
  };
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
    variant: "LEGACY" | "SIMPLIFIED" | "SIMPLIFIED_TICKET" = "LEGACY",
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
      name: channel.name,
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
        name: channel.name,
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

  const resolveParticipationTicketHeaderHandle = async (
    config: NonNullable<ReturnType<typeof getKapsoConfigForChannel>>,
  ) => {
    const logo = await server.storePrisma.setting.findUnique({
      where: { key: "branding_logo_url" },
      select: { value: true },
    });
    const sample = await renderParticipationTicketJpeg(
      {
        status: "RESERVED",
        raffleName: "Rifa de muestra",
        drawDate: "20 de noviembre de 2026 a las 8:00 p. m.",
        participantName: "Mariana Torres",
        eventDate: "1 nov. 10:42 a. m.",
        ticketNumbers: ["034", "081", "122"],
        opportunities: [
          { ticketNumber: "034", numbers: ["412", "587"] },
          { ticketNumber: "081", numbers: ["612", "901"] },
          { ticketNumber: "122", numbers: ["028", "775"] },
        ],
        amount: "600.00",
        expiresAt: "2 nov. a las 10:42 a. m.",
        reservedDuration: "24 horas",
      },
      logo?.value,
    );
    const key = `whatsapp/template-samples/participation-ticket/${randomUUID()}.jpg`;
    await storageService.uploadPrivateObject(sample.buffer, key, "image/jpeg");
    try {
      const url = await storageService.createSignedReadUrl(key);
      const uploaded = await kapsoClient.ingestResumableMedia(config, url);
      return uploaded.data.target?.handle || null;
    } finally {
      await storageService.deleteKey(key);
    }
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
      const retryAfterMs = getKapsoTemplateSyncCooldownMs(target.config);
      if (retryAfterMs > 0) {
        reply.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
        return reply.status(429).send({
          message:
            "Kapso limitó las solicitudes. Nexus pausó la sincronización de este canal; espera antes de volver a intentarlo.",
          retryAfterMs,
        });
      }

      let ticketHeaderHandle: Promise<string | null> | null = null;
      const templates = await syncCloudTemplateCatalog({
        owner: target.owner,
        config: target.config,
        sources: target.sources,
        auditContext: getCloudTemplateAuditContext(request, "admin_sync"),
        channelName: target.channelOwner?.name || null,
        channelPurpose: target.channelOwner?.purpose || null,
        resolveRichInvitationHeaderHandle: () =>
          resolveRaffleInvitationHeaderHandle(target.config!),
        resolveParticipationTicketHeaderHandle: () => {
          ticketHeaderHandle ||= resolveParticipationTicketHeaderHandle(
            target.config!,
          );
          return ticketHeaderHandle;
        },
      });
      const failedTemplate = templates.find(
        (item) => item.status === "ERROR",
      );
      if (failedTemplate) {
        const retryAfterMs = getKapsoTemplateSyncCooldownMs(target.config);
        if (retryAfterMs > 0) {
          reply.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
          return reply.status(429).send({
            ok: false,
            message:
              "Kapso limitó las solicitudes. Nexus pausó la sincronización de este canal; espera antes de volver a intentarlo.",
            retryAfterMs,
            templates,
          });
        }
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

  server.post(
    "/activate-template",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof cloudTemplateActivationSchema>;
      try {
        body = cloudTemplateActivationSchema.parse(request.body || {});
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
        body.type as CloudTemplateType,
      );
      if (!target) {
        return reply.status(404).send({ message: "Canal no encontrado." });
      }
      if (!target.config?.businessAccountId) {
        return reply.status(409).send({
          message:
            "Configura Phone Number ID y Business Account ID antes de activar.",
        });
      }

      const source = target.sources.find(
        (item) => item.scope === body.scope && item.type === body.type,
      );
      if (!source || !source.content.trim()) {
        return reply.status(400).send({
          message: "La plantilla seleccionada no está disponible para este canal.",
        });
      }

      const ownerKey = getCloudTemplateOwnerKey(target.owner);
      const contentHash = getCloudTemplateDefinitionHash(source);
      const variant = source.variant || body.variant;
      let mapping = await server.storePrisma.whatsappCloudTemplate.findUnique({
        where: {
          ownerKey_scope_type_variant: {
            ownerKey,
            scope: source.scope,
            type: source.type,
            variant,
          },
        },
      });

      let candidate = await server.storePrisma.whatsappCloudTemplateCandidate.findUnique({
        where: {
          ownerKey_scope_type_variant_contentHash: {
            ownerKey,
            scope: source.scope,
            type: source.type,
            variant,
            contentHash,
          },
        },
      });

      if (!mapping && !candidate) {
        return reply.status(409).send({
          message: "Sincroniza primero la versión aprobada de esta plantilla.",
        });
      }

      const hasReplacement = !mapping || mapping.contentHash !== contentHash;
      if (hasReplacement && !candidate) {
        return reply.status(409).send({
          message: "Sincroniza primero esta versión para registrar su candidata.",
        });
      }

      const targetTemplate = hasReplacement ? candidate! : mapping!;
      const auditContext = getCloudTemplateAuditContext(
        request,
        "admin_activation",
      );
      const auditSubject = {
        ownerKey,
        channelId: targetTemplate.channelId,
        channelName: target.channelOwner?.name || null,
        channelPurpose: target.channelOwner?.purpose || null,
        scope: source.scope,
        type: source.type,
        variant,
        templateName: targetTemplate.templateName,
        templateId: targetTemplate.templateId,
        category: targetTemplate.category,
        languageCode: targetTemplate.languageCode,
        contentHash: targetTemplate.contentHash,
      };
      let remoteTemplate: Record<string, unknown> | undefined;

      const persistObservedStatus = async (
        status: string,
        lastError: string | null,
      ) => {
        const data = {
          templateId: auditSubject.templateId,
          languageCode: auditSubject.languageCode,
          category: auditSubject.category,
          status,
          lastError,
          lastSyncedAt: new Date(),
        };
        await server.storePrisma.$transaction(async (tx) => {
          const current = hasReplacement
            ? await tx.whatsappCloudTemplateCandidate.findUnique({
                where: { id: candidate!.id },
              })
            : await tx.whatsappCloudTemplate.findUnique({
                where: { id: mapping!.id },
              });
          if (!current) return;

          if (hasReplacement) {
            await tx.whatsappCloudTemplateCandidate.update({
              where: { id: candidate!.id },
              data,
            });
          } else {
            await tx.whatsappCloudTemplate.update({
              where: { id: mapping!.id },
              data,
            });
          }
          await recordCloudTemplateStatusTransition(
            tx,
            auditSubject,
            current.status,
            status,
            auditContext,
            {
              source: "activation_verification",
              lookup: "exact_name_and_language_family",
              remoteStatus: remoteTemplate
                ? String(remoteTemplate.status || "")
                : null,
            },
          );
        });
      };

      try {
        const remote = await kapsoClient.listTemplates(target.config!, {
          name: targetTemplate.templateName,
        });
        remoteTemplate = findCloudTemplateInCatalog(
          remote.data,
          targetTemplate.templateName,
          targetTemplate.languageCode,
        );
      } catch (error) {
        request.log.warn(
          { error, ownerKey, templateName: targetTemplate.templateName },
          "Could not verify Cloud API template activation in Kapso",
        );
        return reply.status(424).send({
          message: "No se pudo verificar la plantilla en Kapso. Intenta de nuevo.",
        });
      }

      if (!remoteTemplate) {
        await persistObservedStatus(
          "MISSING",
          "La plantilla no apareció en una consulta por nombre a Kapso.",
        );
        return reply.status(409).send({
          message: "La plantilla no aparece en el catálogo de Kapso. Sincronízala antes de activarla.",
        });
      }

      const remoteStatus = normalizeKapsoTemplateStatus(remoteTemplate.status);
      auditSubject.templateId =
        String(remoteTemplate.id || "") || targetTemplate.templateId;
      auditSubject.languageCode =
        String(remoteTemplate.language || "") || targetTemplate.languageCode;
      auditSubject.category =
        String(remoteTemplate.category || targetTemplate.category || "") || null;
      if (remoteStatus !== "APPROVED") {
        await persistObservedStatus(
          remoteStatus,
          `Kapso reportó la plantilla como ${remoteStatus}.`,
        );
        return reply.status(409).send({
          message: `Kapso reporta esta plantilla como ${remoteStatus}. Solo se pueden activar plantillas aprobadas.`,
        });
      }

      const remoteTemplateData = {
        templateId: String(remoteTemplate.id || "") || targetTemplate.templateId,
        languageCode:
          String(remoteTemplate.language || "") || targetTemplate.languageCode,
        category:
          String(remoteTemplate.category || targetTemplate.category || "") ||
          null,
        status: remoteStatus,
        lastError: null,
        lastSyncedAt: new Date(),
      };
      const activeVersionKey = getTemplateActiveVersionSettingKey(
        source.scope,
        source.type,
        "CLOUD",
        body.channelId
          ? {
              kind: "channel",
              channelId: body.channelId,
              purpose: target.channelOwner?.purpose || "",
            }
          : { kind: "principal" },
      );
      const definitionSnapshot = buildCloudTemplateDefinitionSnapshot(
        source.content,
        Array.isArray(targetTemplate.parameterNames)
          ? targetTemplate.parameterNames.map(String)
          : [],
      );

      mapping = await server.storePrisma.$transaction(async (tx) => {
        let activatedMapping;
        if (hasReplacement && candidate) {
          await tx.whatsappCloudTemplateCandidate.update({
            where: { id: candidate.id },
            data: remoteTemplateData,
          });
          await recordCloudTemplateStatusTransition(
            tx,
            auditSubject,
            candidate.status,
            remoteStatus,
            auditContext,
            { source: "activation_verification", remoteStatus },
          );

          if (mapping) {
            activatedMapping = await tx.whatsappCloudTemplate.update({
              where: { id: mapping.id },
              data: {
                channelId: candidate.channelId,
                templateName: candidate.templateName,
                templateId: remoteTemplateData.templateId,
                category: remoteTemplateData.category,
                languageCode: remoteTemplateData.languageCode,
                status: remoteStatus,
                parameterNames: Array.isArray(candidate.parameterNames)
                  ? candidate.parameterNames.map(String)
                  : [],
                contentHash: candidate.contentHash,
                lastError: null,
                lastSyncedAt: remoteTemplateData.lastSyncedAt,
              },
            });
          } else {
            activatedMapping = await tx.whatsappCloudTemplate.create({
              data: {
                channelId: candidate.channelId,
                ownerKey: candidate.ownerKey,
                scope: candidate.scope,
                type: candidate.type,
                variant: candidate.variant,
                templateName: candidate.templateName,
                templateId: remoteTemplateData.templateId,
                category: remoteTemplateData.category,
                languageCode: remoteTemplateData.languageCode,
                status: remoteStatus,
                parameterNames: Array.isArray(candidate.parameterNames)
                  ? candidate.parameterNames.map(String)
                  : [],
                contentHash: candidate.contentHash,
                lastError: null,
                lastSyncedAt: remoteTemplateData.lastSyncedAt,
              },
            });
          }
          await tx.whatsappCloudTemplateCandidate.delete({
            where: { id: candidate.id },
          });
        } else {
          activatedMapping = await tx.whatsappCloudTemplate.update({
            where: { id: mapping!.id },
            data: remoteTemplateData,
          });
          await recordCloudTemplateStatusTransition(
            tx,
            auditSubject,
            mapping!.status,
            remoteStatus,
            auditContext,
            { source: "activation_verification", remoteStatus },
          );
        }

        if (activeVersionKey) {
          await tx.setting.upsert({
            where: { key: activeVersionKey },
            update: { value: body.variant, group: "whatsapp" },
            create: {
              key: activeVersionKey,
              value: body.variant,
              group: "whatsapp",
            },
          });
        }

        await recordCloudTemplateAuditEvent(tx, auditSubject, {
          eventType: "VERSION_ACTIVATED",
          context: auditContext,
          previousStatus: hasReplacement ? mapping?.status : mapping!.status,
          nextStatus: remoteStatus,
          previousContentHash: mapping?.contentHash || null,
          nextContentHash: activatedMapping.contentHash,
          definitionSnapshot,
          metadata: {
            previousTemplateName: mapping?.templateName || null,
            nextTemplateName: activatedMapping.templateName,
            candidatePromoted: Boolean(hasReplacement && candidate),
            activeVersionSettingKey: activeVersionKey,
          },
        });
        return activatedMapping;
      });

      return {
        ok: true,
        ownerKey,
        scope: source.scope,
        type: source.type,
        variant,
        contentHash,
        templateName: mapping!.templateName,
        status: remoteStatus,
      };
    },
  );

  server.post(
    "/delete-template",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      let body: z.infer<typeof cloudTemplateDeletionSchema>;
      try {
        body = cloudTemplateDeletionSchema.parse(request.body || {});
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }

      if (body.confirmationName !== body.templateName) {
        return reply.status(400).send({
          message: "Escribe el nombre exacto de la plantilla para confirmar.",
        });
      }

      const target = await resolveCloudTemplateTarget(
        body.channelId,
        body.variant,
        body.scope,
        body.type as CloudTemplateType,
      );
      if (!target) {
        return reply.status(404).send({ message: "Canal no encontrado." });
      }
      if (!target.config?.businessAccountId) {
        return reply.status(409).send({
          message: "El canal no tiene un Business Account ID de Kapso configurado.",
        });
      }

      const source = target.sources.find(
        (item) => item.scope === body.scope && item.type === body.type,
      );
      if (!source) {
        return reply.status(404).send({
          message: "La plantilla no corresponde a este canal y alcance.",
        });
      }

      const ownerKey = getCloudTemplateOwnerKey(target.owner);
      const versionEvents = await server.storePrisma.whatsappCloudTemplateEvent.findMany({
        where: {
          ownerKey,
          scope: body.scope,
          type: body.type as any,
          variant: body.variant,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      const knownVersion = versionEvents.some((event) => {
        if (
          event.templateName === body.templateName &&
          (event.contentHash === body.contentHash ||
            event.nextContentHash === body.contentHash)
        ) {
          return true;
        }
        const metadata =
          event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : {};
        return (
          metadata.previousTemplateName === body.templateName &&
          metadata.previousContentHash === body.contentHash
        );
      });
      if (!knownVersion) {
        return reply.status(409).send({
          message: "Nexus no tiene un registro de esta versión. Sincroniza primero su historial antes de eliminarla.",
        });
      }

      const activeVersionKey = getTemplateActiveVersionSettingKey(
        body.scope,
        body.type as CloudTemplateType,
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
      const activeMapping = await server.storePrisma.whatsappCloudTemplate.findUnique({
        where: {
          ownerKey_scope_type_variant: {
            ownerKey,
            scope: body.scope,
            type: body.type as any,
            variant: activeVersion,
          },
        },
      });
      if (!activeMapping || activeMapping.templateName === body.templateName) {
        return reply.status(409).send({
          message: "No se puede eliminar la versión activa. Activa y verifica primero otra versión aprobada.",
        });
      }

      const [activeReferences, candidateReferences] = await Promise.all([
        server.storePrisma.whatsappCloudTemplate.findMany({
          where: { templateName: body.templateName },
          select: { ownerKey: true, scope: true, type: true, variant: true },
        }),
        server.storePrisma.whatsappCloudTemplateCandidate.findMany({
          where: { templateName: body.templateName },
          select: { ownerKey: true, scope: true, type: true, variant: true },
        }),
      ]);
      if (activeReferences.length || candidateReferences.length) {
        return reply.status(409).send({
          message: "Esta plantilla todavía está referenciada por un mapeo activo o una candidata de Nexus.",
        });
      }

      let remoteVersion: Record<string, unknown> | undefined;
      let remoteReplacement: Record<string, unknown> | undefined;
      try {
        const remoteOld = await kapsoClient.listTemplates(target.config, {
          name: body.templateName,
        });
        remoteVersion = (remoteOld.data || []).find(
          (item) => String(item.name || "") === body.templateName,
        );
        if (!remoteVersion) {
          return reply.status(409).send({
            message: "La versión ya no aparece en Kapso. No se envió la solicitud de eliminación.",
          });
        }
        const remoteActive = await kapsoClient.listTemplates(target.config, {
          name: activeMapping.templateName,
        });
        remoteReplacement = (remoteActive.data || []).find(
          (item) => String(item.name || "") === activeMapping.templateName,
        );
      } catch (error: any) {
        request.log.warn(
          { error, ownerKey, templateName: body.templateName },
          "Could not verify remote WhatsApp template deletion prerequisites",
        );
        const statusCode = Number(error?.statusCode) === 429 ? 429 : 424;
        return reply.status(statusCode).send({
          message: "No se pudo verificar en Kapso la versión antigua y su reemplazo activo. No se eliminó nada.",
        });
      }

      if (
        !remoteReplacement ||
        normalizeKapsoTemplateStatus(remoteReplacement.status) !== "APPROVED"
      ) {
        return reply.status(409).send({
          message: "La versión de reemplazo no está aprobada y verificada en Kapso. No se eliminó nada.",
        });
      }

      const finalActiveReferences = await server.storePrisma.whatsappCloudTemplate.findMany({
        where: { templateName: body.templateName },
        select: { id: true },
      });
      const finalCandidateReferences = await server.storePrisma.whatsappCloudTemplateCandidate.findMany({
        where: { templateName: body.templateName },
        select: { id: true },
      });
      if (finalActiveReferences.length || finalCandidateReferences.length) {
        return reply.status(409).send({
          message: "La plantilla volvió a quedar referenciada durante la verificación. No se eliminó nada.",
        });
      }

      const latestActiveVersionSetting = activeVersionKey
        ? await server.storePrisma.setting.findUnique({
            where: { key: activeVersionKey },
            select: { value: true },
          })
        : null;
      const latestActiveVersion = latestActiveVersionSetting?.value || "LEGACY";
      const latestActiveMapping = await server.storePrisma.whatsappCloudTemplate.findUnique({
        where: {
          ownerKey_scope_type_variant: {
            ownerKey,
            scope: body.scope,
            type: body.type as any,
            variant: latestActiveVersion,
          },
        },
      });
      if (
        latestActiveVersion !== activeVersion ||
        latestActiveMapping?.templateName !== activeMapping.templateName
      ) {
        return reply.status(409).send({
          message: "La versión activa cambió mientras se verificaba la solicitud. Actualiza el estado e inténtalo de nuevo.",
        });
      }

      const deletionAuditSubject = {
        ownerKey,
        channelId: target.channelOwner?.channelId ?? null,
        channelName: target.channelOwner?.name || null,
        channelPurpose: target.channelOwner?.purpose || null,
        scope: body.scope,
        type: body.type as any,
        variant: body.variant,
        templateName: body.templateName,
        templateId: String(remoteVersion.id || "") || null,
        category: String(remoteVersion.category || "") || null,
        languageCode: String(remoteVersion.language || "") || null,
        contentHash: body.contentHash,
      };
      const deletionAuditContext = getCloudTemplateAuditContext(
        request,
        "admin_remote_delete",
      );
      const deletionAuditMetadata = {
        businessAccountId: target.config.businessAccountId,
        replacementTemplateName: activeMapping.templateName,
        replacementVariant: activeVersion,
        replacementStatus: normalizeKapsoTemplateStatus(remoteReplacement.status),
        deletionConfirmedByExactName: true,
      };
      await server.storePrisma.$transaction(async (tx) => {
        await recordCloudTemplateAuditEvent(tx, deletionAuditSubject, {
          eventType: "TEMPLATE_REMOTE_DELETE_REQUESTED",
          context: deletionAuditContext,
          previousStatus: normalizeKapsoTemplateStatus(remoteVersion.status),
          nextStatus: "DELETE_REQUESTED",
          previousContentHash: body.contentHash,
          metadata: deletionAuditMetadata,
        });
      });

      try {
        await kapsoClient.deleteTemplate(target.config, body.templateName);
      } catch (error: any) {
        request.log.error(
          { error, ownerKey, templateName: body.templateName },
          "Kapso template deletion failed",
        );
        try {
          await server.storePrisma.$transaction(async (tx) => {
            await recordCloudTemplateAuditEvent(tx, deletionAuditSubject, {
              eventType: "TEMPLATE_REMOTE_DELETE_FAILED",
              context: deletionAuditContext,
              previousStatus: normalizeKapsoTemplateStatus(remoteVersion?.status),
              nextStatus: "DELETE_FAILED",
              previousContentHash: body.contentHash,
              metadata: {
                ...deletionAuditMetadata,
                providerStatusCode: Number(error?.statusCode) || 0,
              },
            });
          });
        } catch (auditError) {
          request.log.error(
            { auditError, ownerKey, templateName: body.templateName },
            "Could not record failed Kapso template deletion",
          );
        }
        return reply.status(Number(error?.statusCode) === 429 ? 429 : 502).send({
          message: "Kapso no pudo eliminar la plantilla. Nexus conserva su historial y no registró el borrado como completado.",
        });
      }

      try {
        await server.storePrisma.$transaction(async (tx) => {
          await recordCloudTemplateAuditEvent(tx, deletionAuditSubject, {
            eventType: "TEMPLATE_REMOTE_DELETED",
            context: deletionAuditContext,
            previousStatus: normalizeKapsoTemplateStatus(remoteVersion?.status),
            nextStatus: "DELETED",
            previousContentHash: body.contentHash,
            metadata: deletionAuditMetadata,
          });
        });
      } catch (error) {
        request.log.error(
          { error, ownerKey, templateName: body.templateName },
          "Kapso template was deleted but its completion audit event could not be recorded",
        );
        return reply.status(500).send({
          message: "Kapso eliminó la plantilla, pero Nexus no pudo registrar la confirmación final. El intento previo permanece en el historial; revisa el estado antes de repetir la acción.",
        });
      }
      return {
        ok: true,
        ownerKey,
        scope: body.scope,
        type: body.type,
        variant: body.variant,
        templateName: body.templateName,
        replacementTemplateName: activeMapping.templateName,
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
      let remoteChecked = false;
      if (target.config?.businessAccountId) {
        try {
          const remote = await listKapsoTemplateCatalogCached(target.config);
          remoteTemplates = remote.data || [];
          remoteChecked = true;
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
        const currentRecord =
          candidate || (mapping?.contentHash === contentHash ? mapping : null);
        const currentTemplateName =
          currentRecord?.templateName || expectedTemplateName;
        const currentRemoteTemplate = findCloudTemplateInCatalog(
          remoteTemplates,
          currentTemplateName,
          currentRecord?.languageCode || mapping?.languageCode || "es_MX",
        );
        const currentRemoteStatus = currentRemoteTemplate
          ? normalizeKapsoTemplateStatus(currentRemoteTemplate.status)
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
        const activeTemplateName = activeMapping?.templateName || null;
        const activeRemoteTemplate = activeTemplateName
          ? findCloudTemplateInCatalog(
              remoteTemplates,
              activeTemplateName,
              activeMapping?.languageCode,
            )
          : undefined;
        const activeRemoteStatus = activeRemoteTemplate
          ? normalizeKapsoTemplateStatus(activeRemoteTemplate.status)
          : null;
        const activeHealth = getCloudTemplateRemoteHealth({
          remoteChecked,
          mappingFound: Boolean(activeMapping),
          templateFound: Boolean(activeRemoteTemplate),
          remoteStatus: activeRemoteStatus,
        });
        let versions: Array<Record<string, unknown>> = [];
        if (query.scope === source.scope && query.type === source.type) {
          const historyEvents = await server.storePrisma.whatsappCloudTemplateEvent.findMany({
            where: {
              ownerKey,
              scope: source.scope,
              type: source.type,
              variant: source.variant,
            },
            orderBy: { createdAt: "desc" },
            take: 500,
          });
          const remotelyDeletedNames = new Set(
            historyEvents
              .filter((event) => event.eventType === "TEMPLATE_REMOTE_DELETED")
              .map((event) => event.templateName)
              .filter((name): name is string => Boolean(name)),
          );
          const knownVersions = new Map<string, {
            templateName: string;
            contentHash: string | null;
            templateId: string | null;
            languageCode: string;
            lastSeenAt: Date;
          }>();
          const addKnownVersion = (version: {
            templateName?: unknown;
            contentHash?: unknown;
            templateId?: unknown;
            languageCode?: unknown;
            observedAt: Date;
          }) => {
            const templateName = String(version.templateName || "").trim();
            if (!templateName) return;
            const contentHash = String(version.contentHash || "").trim() || null;
            const key = `${templateName}|${contentHash || ""}`;
            if (!knownVersions.has(key)) {
              knownVersions.set(key, {
                templateName,
                contentHash,
                templateId: String(version.templateId || "").trim() || null,
                languageCode: String(version.languageCode || "es_MX"),
                lastSeenAt: version.observedAt,
              });
            }
          };
          for (const event of historyEvents) {
            addKnownVersion({
              templateName: event.templateName,
              contentHash: event.contentHash || event.nextContentHash,
              templateId: event.templateId,
              languageCode: event.languageCode,
              observedAt: event.createdAt,
            });
            const metadata =
              event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
                ? (event.metadata as Record<string, unknown>)
                : {};
            addKnownVersion({
              templateName: metadata.previousTemplateName,
              contentHash: metadata.previousContentHash,
              observedAt: event.createdAt,
            });
            addKnownVersion({
              templateName: metadata.nextTemplateName,
              contentHash: metadata.nextContentHash,
              observedAt: event.createdAt,
            });
          }
          addKnownVersion({
            templateName: mapping?.templateName,
            contentHash: mapping?.contentHash,
            templateId: mapping?.templateId,
            languageCode: mapping?.languageCode,
            observedAt: mapping?.updatedAt || new Date(),
          });
          for (const item of candidates.filter(
            (candidateItem) =>
              candidateItem.scope === source.scope &&
              candidateItem.type === source.type &&
              candidateItem.variant === source.variant,
          )) {
            addKnownVersion({
              templateName: item.templateName,
              contentHash: item.contentHash,
              templateId: item.templateId,
              languageCode: item.languageCode,
              observedAt: item.updatedAt,
            });
          }
          versions = Array.from(knownVersions.values())
            .map((version) => {
              const remoteVersion = findCloudTemplateInCatalog(
                remoteTemplates,
                version.templateName,
                version.languageCode,
              );
              const isActive = activeMapping?.templateName === version.templateName;
              const isCandidate = candidates.some(
                (item) => item.templateName === version.templateName,
              );
              const remoteStatus = remoteVersion
                ? normalizeKapsoTemplateStatus(remoteVersion.status)
                : null;
              const canDelete = Boolean(
                remoteChecked &&
                  remoteVersion &&
                  version.contentHash &&
                  !isActive &&
                  !isCandidate &&
                  activeHealth === "HEALTHY",
              );
              let deleteBlockedReason: string | null = null;
              if (isActive) deleteBlockedReason = "Versión activa";
              else if (isCandidate) deleteBlockedReason = "Candidata en Nexus";
              else if (!remoteChecked) deleteBlockedReason = "Estado remoto sin verificar";
              else if (!remoteVersion) deleteBlockedReason = "Ya no aparece en Kapso";
              else if (activeHealth !== "HEALTHY") deleteBlockedReason = "Activa otra versión aprobada para habilitar la limpieza";
              return {
                ...version,
                remoteExists: Boolean(remoteVersion),
                remoteStatus,
                wasDeleted: remotelyDeletedNames.has(version.templateName),
                isActive,
                isCandidate,
                canDelete,
                deleteBlockedReason,
              };
            })
            .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
        }
        const current = sourceReady && currentRemoteStatus === "APPROVED";
        const activationRecordAvailable = Boolean(
          candidate || mapping?.contentHash === contentHash,
        );
        return {
          scope: source.scope,
          type: source.type,
          variant: source.variant,
          sourceReady,
          templateName: currentTemplateName || null,
          status: remoteChecked
            ? currentRemoteStatus || (currentRecord ? "MISSING" : "NOT_SYNCED")
            : currentRecord?.status || "UNKNOWN",
          current,
          activeVersion,
          contentHash: contentHash || null,
          activeContentHash: activeMapping?.contentHash || null,
          activeTemplateName,
          activeTemplateFound: remoteChecked
            ? Boolean(activeRemoteTemplate)
            : null,
          activeTemplateStatus: activeRemoteStatus,
          activeHealth,
          activationRecordAvailable,
          lastError: candidate?.lastError || mapping?.lastError || null,
          replacementPending: Boolean(
            candidate && currentRemoteStatus !== "APPROVED",
          ),
          versions,
        };
      }));
      return {
        catalogMode: target.catalogMode || "DEDICATED",
        ownerKey,
        remoteChecked,
        ready:
          templates.length > 0 &&
          templates.every(
            (item) => item.activeHealth === "HEALTHY",
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
  registerKapsoRawBodyCapture(server);

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
        request.rawBody,
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

        if (inbound.senderPhone) {
          const channel = inbound.phoneNumberId
            ? await server.storePrisma.whatsappChannel.findFirst({
                where: { kapsoPhoneNumberId: String(inbound.phoneNumberId) },
                select: {
                  id: true,
                  name: true,
                  purpose: true,
                  instanceName: true,
                  evolutionUrl: true,
                  evolutionKey: true,
                  provider: true,
                  deliveryStrategy: true,
                  kapsoPhoneNumberId: true,
                  kapsoBusinessAccountId: true,
                  phone: true,
                  template: true,
                },
              })
            : null;
          const principalSettings = await server.storePrisma.setting.findMany({
            where: {
              key: {
                in: [
                  "whatsapp_main_kapso_phone_number_id",
                  "whatsapp_main_kapso_business_account_id",
                  "whatsapp_main_delivery_strategy",
                  "whatsapp_kapso_delivery_enabled",
                ],
              },
            },
            select: { key: true, value: true },
          });
          const settings = Object.fromEntries(
            principalSettings.map((setting) => [setting.key, setting.value || ""]),
          );
          const phoneNumberId =
            String(inbound.phoneNumberId || "") || settings.whatsapp_main_kapso_phone_number_id;
          const businessAccountId =
            channel?.kapsoBusinessAccountId || settings.whatsapp_main_kapso_business_account_id;
          const kapsoConfig = phoneNumberId
            ? getKapsoConfigForChannel({ phoneNumberId, businessAccountId })
            : null;

          if (kapsoConfig) {
            const storeAssistant = await handleStoreWhatsappMessage({
              storePrisma: server.storePrisma,
              phone: inbound.senderPhone,
              text: inbound.text,
            });
            if (storeAssistant.handled) {
              if (storeAssistant.paymentInstructions) {
                await sendStorePaymentInstructions({
                  paymentInstructions: storeAssistant.paymentInstructions,
                  preferredChannel: channel as ChannelConfig | null,
                  principal: {
                    provider: "KAPSO",
                    evolution: null,
                    kapsoPhoneNumberId:
                      settings.whatsapp_main_kapso_phone_number_id || "",
                    kapsoBusinessAccountId:
                      settings.whatsapp_main_kapso_business_account_id || "",
                    deliveryStrategy:
                      (settings.whatsapp_main_delivery_strategy as
                        | "STANDARD"
                        | "KAPSO_PREFERRED"
                        | "EVOLUTION_ONLY") || "STANDARD",
                  },
                  fallbackTransport: { provider: "KAPSO", config: kapsoConfig },
                  kapsoEnabled: isKapsoTenantDeliveryEnabled(
                    settings.whatsapp_kapso_delivery_enabled,
                  ),
                });
              } else if (storeAssistant.reply) {
                await sendWhatsappAndLog({
                  transport: { provider: "KAPSO", config: kapsoConfig },
                  recipientPhone: inbound.senderPhone,
                  message: { text: storeAssistant.reply },
                  templateName: "store_whatsapp_assistant",
                  routing: {
                    route: "DIRECT",
                    preferredInstanceName: `kapso:${phoneNumberId}`,
                    policyClass: "OPERATIONAL",
                    providerPriority: ["KAPSO"],
                  },
                });
              }
              continue;
            }

            const assistant = await handleRaffleWhatsappMessage({
              rafflePrisma,
              storePrisma: server.storePrisma,
              phone: inbound.senderPhone,
              channelKey: `kapso:${phoneNumberId}`,
              text: inbound.text,
            });
            if (assistant.handled && assistant.reply) {
              await sendWhatsappAndLog({
                transport: { provider: "KAPSO", config: kapsoConfig },
                recipientPhone: inbound.senderPhone,
                message: { text: assistant.reply },
                templateName: "raffle_whatsapp_assistant",
                routing: {
                  route: "DIRECT",
                  preferredInstanceName: `kapso:${phoneNumberId}`,
                  policyClass: "OPERATIONAL",
                  providerPriority: ["KAPSO", "EVOLUTION"],
                },
              });
            }
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
      const shouldResolveJob =
        nextStatus === "delivered" ||
        nextStatus === "read" ||
        nextStatus === "failed";
      const relatedJob = shouldResolveJob && existing.jobId
        ? await whatsappQueue.getJob(existing.jobId)
        : null;
      if (
        (nextStatus === "delivered" || nextStatus === "read") &&
        relatedJob
      ) {
        await enqueueRafflePaymentInstructionsAfterDelivery(relatedJob);
        await finalizeManualParticipationLinkDelivery({
          rafflePrisma,
          jobData: relatedJob.data,
          outcome: "DELIVERED",
        });
      }
      if (nextStatus === "failed" && relatedJob) {
        const originalJob = relatedJob;
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
            originalJobId: String(originalJob.id ?? ""),
          });
          let fallbackScheduled = false;
          if (fallbackPatch) {
            try {
              await whatsappQueue.add(
                `${originalJob.name}-kapso-fallback`,
                {
                  ...originalJob.data,
                  ...fallbackPatch,
                  fallbackOfMessageId: messageId,
                },
                { jobId: `kapso-fallback-${messageId}` },
              );
              fallbackScheduled = true;
            } catch (error) {
              console.error(
                "[WhatsApp Kapso] Could not enqueue provider fallback:",
                error,
              );
            }
          }
          if (!fallbackScheduled) {
            await finalizeManualParticipationLinkDelivery({
              rafflePrisma,
              jobData: originalJob.data,
              outcome: "FAILED",
            });
          }
        }
      }
      updated += 1;
    }

    return reply.send({ ok: true, updated, optedOut });
  });
}
