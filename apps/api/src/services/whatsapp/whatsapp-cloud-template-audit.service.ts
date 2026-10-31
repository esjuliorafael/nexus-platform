import { storePrisma } from "@nexus/db/store";
import type {
  Prisma,
  TemplateType,
  WhatsappCloudTemplateScope,
} from "@prisma/client-store";
import { getKapsoConfigForChannel } from "../kapso/kapso.config";
import { kapsoClient } from "../kapso/kapso.client";

type AuditClient = Pick<typeof storePrisma, "whatsappCloudTemplateEvent">;

export type CloudTemplateAuditContext = {
  actorType?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  origin: string;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  observedAt?: Date;
};

export type CloudTemplateAuditSubject = {
  ownerKey: string;
  channelId?: number | null;
  channelName?: string | null;
  channelPurpose?: string | null;
  scope: WhatsappCloudTemplateScope;
  type: TemplateType;
  variant: string;
  templateName?: string | null;
  templateId?: string | null;
  category?: string | null;
  languageCode?: string | null;
  contentHash?: string | null;
};

export function getCloudTemplateStatusTransition(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
) {
  const previous = previousStatus?.trim().toUpperCase() || null;
  const next = nextStatus?.trim().toUpperCase() || null;
  if (previous === next || !next) return null;
  return { previousStatus: previous, nextStatus: next };
}

export function getCloudTemplateStatusEventType(nextStatus: string) {
  switch (nextStatus.trim().toUpperCase()) {
    case "APPROVED":
      return "APPROVAL_OBSERVED";
    case "REJECTED":
      return "REJECTION_OBSERVED";
    case "MISSING":
      return "REMOTE_ABSENCE_OBSERVED";
    default:
      return "STATUS_OBSERVED";
  }
}

export function buildCloudTemplateDefinitionSnapshot(
  content: string,
  parameterNames: string[],
): Prisma.InputJsonObject {
  return {
    content,
    parameterNames: [...parameterNames],
  };
}

export async function recordCloudTemplateAuditEvent(
  client: AuditClient,
  subject: CloudTemplateAuditSubject,
  event: {
    eventType: string;
    context: CloudTemplateAuditContext;
    previousStatus?: string | null;
    nextStatus?: string | null;
    previousContentHash?: string | null;
    nextContentHash?: string | null;
    definitionSnapshot?: Prisma.InputJsonObject | null;
    metadata?: Prisma.InputJsonObject | null;
  },
) {
  await client.whatsappCloudTemplateEvent.create({
    data: {
      ownerKey: subject.ownerKey,
      channelId: subject.channelId ?? null,
      channelName: subject.channelName ?? null,
      channelPurpose: subject.channelPurpose ?? null,
      scope: subject.scope,
      type: subject.type,
      variant: subject.variant,
      eventType: event.eventType,
      templateName: subject.templateName ?? null,
      templateId: subject.templateId ?? null,
      category: subject.category ?? null,
      languageCode: subject.languageCode ?? null,
      contentHash: subject.contentHash ?? null,
      previousContentHash: event.previousContentHash ?? null,
      nextContentHash: event.nextContentHash ?? null,
      previousStatus: event.previousStatus ?? null,
      nextStatus: event.nextStatus ?? null,
      ...(event.definitionSnapshot != null
        ? { definitionSnapshot: event.definitionSnapshot }
        : {}),
      ...(event.metadata != null ? { metadata: event.metadata } : {}),
      actorType: event.context.actorType ?? null,
      actorId: event.context.actorId ?? null,
      actorName: event.context.actorName ?? null,
      actorRole: event.context.actorRole ?? null,
      origin: event.context.origin,
      requestId: event.context.requestId ?? null,
      ipAddress: event.context.ipAddress ?? null,
      userAgent: event.context.userAgent ?? null,
      observedAt: event.context.observedAt ?? new Date(),
    },
  });
}

export async function recordCloudTemplateStatusTransition(
  client: AuditClient,
  subject: CloudTemplateAuditSubject,
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
  context: CloudTemplateAuditContext,
  metadata?: Prisma.InputJsonObject,
) {
  const transition = getCloudTemplateStatusTransition(
    previousStatus,
    nextStatus,
  );
  if (!transition) return false;

  await recordCloudTemplateAuditEvent(client, subject, {
    eventType: getCloudTemplateStatusEventType(transition.nextStatus),
    context,
    ...transition,
    nextContentHash: subject.contentHash,
    metadata,
  });
  return true;
}

function normalizeRemoteStatus(value: unknown) {
  const status = String(value || "PENDING").trim().toUpperCase();
  return ["APPROVED", "PENDING", "REJECTED"].includes(status)
    ? status
    : "PENDING";
}

function normalizeLanguage(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/-/g, "_")
    .toLowerCase();
}

export function findRemoteCloudTemplateForAudit(
  templates: Array<Record<string, unknown>>,
  name: string,
  language: string,
) {
  const expectedName = name.trim();
  const expectedLanguage = normalizeLanguage(language);
  const namedTemplates = templates.filter(
    (template) =>
      String(template.name || "").trim() === expectedName,
  );
  return (
    namedTemplates.find(
      (template) => normalizeLanguage(template.language) === expectedLanguage,
    ) ||
    namedTemplates.find(
      (template) =>
        normalizeLanguage(template.language).split("_")[0] ===
        expectedLanguage.split("_")[0],
    )
  );
}

export async function reconcileWhatsappCloudTemplateStatuses() {
  const [settings, mappings, candidates] = await Promise.all([
    storePrisma.setting.findMany({
      where: {
        key: {
          in: [
            "whatsapp_main_kapso_phone_number_id",
            "whatsapp_main_kapso_business_account_id",
          ],
        },
      },
    }),
    storePrisma.whatsappCloudTemplate.findMany({
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            purpose: true,
            kapsoPhoneNumberId: true,
            kapsoBusinessAccountId: true,
          },
        },
      },
    }),
    storePrisma.whatsappCloudTemplateCandidate.findMany({
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            purpose: true,
            kapsoPhoneNumberId: true,
            kapsoBusinessAccountId: true,
          },
        },
      },
    }),
  ]);
  const settingsByKey = Object.fromEntries(
    settings.map(({ key, value }) => [key, value || ""]),
  );
  const records = [
    ...mappings.map((record) => ({ ...record, recordKind: "active" as const })),
    ...candidates.map((record) => ({ ...record, recordKind: "candidate" as const })),
  ];
  const byOwner = new Map<string, typeof records>();
  for (const record of records) {
    const group = byOwner.get(record.ownerKey) || [];
    group.push(record);
    byOwner.set(record.ownerKey, group);
  }

  let checked = 0;
  let transitions = 0;
  let failed = 0;

  for (const [ownerKey, ownerRecords] of Array.from(byOwner.entries())) {
    let config = null;
    if (ownerKey === "principal") {
      config = getKapsoConfigForChannel({
        phoneNumberId: settingsByKey.whatsapp_main_kapso_phone_number_id || "",
        businessAccountId:
          settingsByKey.whatsapp_main_kapso_business_account_id || undefined,
      });
    } else if (ownerKey.startsWith("channel:")) {
      const channel = ownerRecords.find((record) => record.channel)?.channel;
      if (channel) {
        config = getKapsoConfigForChannel({
          phoneNumberId: channel.kapsoPhoneNumberId || "",
          businessAccountId: channel.kapsoBusinessAccountId || undefined,
        });
      }
    }
    if (!config?.businessAccountId) continue;

    const uniqueTemplates = new Map<string, (typeof ownerRecords)[number]>();
    for (const record of ownerRecords) {
      uniqueTemplates.set(
        `${record.templateName}\u0000${normalizeLanguage(record.languageCode)}`,
        record,
      );
    }

    for (const record of Array.from(uniqueTemplates.values())) {
      let remote: Record<string, unknown> | undefined;
      try {
        const response = await kapsoClient.listTemplates(config, {
          name: record.templateName,
        });
        remote = findRemoteCloudTemplateForAudit(
          response.data || [],
          record.templateName,
          record.languageCode,
        );
      } catch {
        failed += 1;
        continue;
      }

      checked += 1;
      const nextStatus = remote
        ? normalizeRemoteStatus(remote.status)
        : "MISSING";
      const nextTemplateId = String(remote?.id || "") || record.templateId;
      const context: CloudTemplateAuditContext = {
        actorType: "SYSTEM",
        actorName: "Reconciliación de Kapso",
        origin: "scheduled_reconciliation",
      };
      const subject: CloudTemplateAuditSubject = {
        ownerKey,
        channelId: record.channelId,
        channelName: record.channel?.name || null,
        channelPurpose: record.channel?.purpose || null,
        scope: record.scope,
        type: record.type,
        variant: record.variant,
        templateName: record.templateName,
        templateId: nextTemplateId,
        category: String(remote?.category || record.category || "") || null,
        languageCode: record.languageCode,
        contentHash: record.contentHash,
      };

      let changed = false;
      try {
        changed = await storePrisma.$transaction(async (tx) => {
          const current =
            record.recordKind === "active"
              ? await tx.whatsappCloudTemplate.findUnique({
                  where: { id: record.id },
                })
              : await tx.whatsappCloudTemplateCandidate.findUnique({
                  where: { id: record.id },
                });
          if (!current) return false;

          const data = {
            templateId: nextTemplateId,
            category: subject.category,
            status: nextStatus,
            lastError: remote
              ? null
              : "La plantilla no apareció en una consulta por nombre a Kapso.",
            lastSyncedAt: new Date(),
          };
          if (record.recordKind === "active") {
            await tx.whatsappCloudTemplate.update({
              where: { id: record.id },
              data,
            });
          } else {
            await tx.whatsappCloudTemplateCandidate.update({
              where: { id: record.id },
              data,
            });
          }

          return recordCloudTemplateStatusTransition(
            tx,
            subject,
            current.status,
            nextStatus,
            context,
            {
              remoteStatus: String(remote?.status || "") || null,
              lookup: "exact_name_and_language_family",
            },
          );
        });
      } catch {
        failed += 1;
        continue;
      }
      if (changed) transitions += 1;
    }
  }

  return { checked, transitions, failed };
}
