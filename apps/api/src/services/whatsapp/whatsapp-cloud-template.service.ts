import { createHash } from "node:crypto";
import { storePrisma } from "@nexus/db/store";
import { kapsoClient } from "../kapso/kapso.client";
import type {
  KapsoConfig,
  KapsoTemplateDefinition,
  KapsoTemplateMessage,
} from "../kapso/kapso.types";

export type CloudTemplateScope = "STORE" | "RAFFLES";
export type CloudTemplateType =
  | "RESERVATION"
  | "RELEASE"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_RECOVERY"
  | "RESTORED"
  | "REMINDER"
  | "OPENING"
  | "DRAW_REMINDER"
  | "RAFFLE_INVITATION"
  | "RESULT_WINNER"
  | "RESULT_PARTICIPANTS";

export type CloudTemplateSource = {
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  content: string;
};

export type CloudTemplateOwner =
  | { kind: "principal" }
  | { kind: "channel"; channelId: number; purpose: string };

export const CLOUD_TEMPLATE_SETTING_KEYS: Array<{
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  key: string;
}> = [
  { scope: "STORE", type: "RESERVATION", key: "whatsapp_global_store_res" },
  {
    scope: "STORE",
    type: "PAYMENT_CONFIRMED",
    key: "whatsapp_global_store_pay",
  },
  {
    scope: "STORE",
    type: "PAYMENT_REFUNDED",
    key: "whatsapp_global_store_refunded",
  },
  {
    scope: "STORE",
    type: "PAYMENT_RECOVERY",
    key: "whatsapp_global_store_payment_recovery",
  },
  { scope: "STORE", type: "RESTORED", key: "whatsapp_global_store_restored" },
  { scope: "STORE", type: "REMINDER", key: "whatsapp_global_store_reminder" },
  { scope: "STORE", type: "RELEASE", key: "whatsapp_global_store_rel" },
  { scope: "RAFFLES", type: "OPENING", key: "whatsapp_global_raffle_opening" },
  {
    scope: "RAFFLES",
    type: "DRAW_REMINDER",
    key: "whatsapp_global_raffle_draw_reminder",
  },
  { scope: "RAFFLES", type: "RESERVATION", key: "whatsapp_global_raffle_res" },
  { scope: "RAFFLES", type: "RESTORED", key: "whatsapp_global_raffle_restored" },
  {
    scope: "RAFFLES",
    type: "PAYMENT_CONFIRMED",
    key: "whatsapp_global_raffle_pay",
  },
  {
    scope: "RAFFLES",
    type: "PAYMENT_REFUNDED",
    key: "whatsapp_global_raffle_refunded",
  },
  {
    scope: "RAFFLES",
    type: "PAYMENT_RECOVERY",
    key: "whatsapp_global_raffle_payment_recovery",
  },
  {
    scope: "RAFFLES",
    type: "REMINDER",
    key: "whatsapp_global_raffle_reminder",
  },
  { scope: "RAFFLES", type: "RELEASE", key: "whatsapp_global_raffle_rel" },
  {
    scope: "RAFFLES",
    type: "RAFFLE_INVITATION",
    key: "whatsapp_global_raffle_invitation",
  },
  {
    scope: "RAFFLES",
    type: "RESULT_WINNER",
    key: "whatsapp_global_raffle_winner",
  },
  {
    scope: "RAFFLES",
    type: "RESULT_PARTICIPANTS",
    key: "whatsapp_global_raffle_results",
  },
];

export function buildCanonicalCloudTemplateSources(
  settings: Record<string, string | null | undefined>,
  scopes: CloudTemplateScope[] = ["STORE", "RAFFLES"],
): CloudTemplateSource[] {
  return CLOUD_TEMPLATE_SETTING_KEYS.filter((item) =>
    scopes.includes(item.scope),
  ).map((item) => ({
    scope: item.scope,
    type: item.type,
    content: settings[item.key] || "",
  }));
}

const VARIABLE_PATTERN = /\{\{([a-z][a-z0-9_]*)\}\}/g;

const VARIABLE_EXAMPLES: Record<string, string> = {
  greeting: "Buena tarde",
  customer_name: "Carlos Ramirez",
  customer_phone: "5212215682994",
  order_id: "1284",
  item_list: "1x Producto de ejemplo\n2x Segundo producto",
  amount: "1,250.00",
  refund_amount: "1,250.00",
  refund_id: "1234567890",
  refunded_at: "27 de julio de 2026, 2:30 p. m.",
  bank_info:
    "Banco: BBVA\nBeneficiario: Rancho Demo\nNo. Cuenta: 1234567890\nCLABE: 012345678901234567",
  time_store: "24 horas",
  time_raffle: "2 horas",
  time_remaining: "4 horas",
  expires_at: "24 de julio de 2026, 2:00 p. m.",
  recovery_url: "https://example.com/checkout#recovery=example",
  raffle_name: "Rifa Especial de Junio",
  raffle_url: "https://example.com/raffles/1",
  opening_date: "Lunes, 20 de julio de 2026, 8:00 a. m.",
  raffle_date: "Hoy, 31 de julio de 2026 a las 8:00 p. m.",
  participation_rule:
    "Tu boleto participa con 8 números: el número que eliges y 7 oportunidades adicionales.",
  winning_rule:
    "El número ganador se determina con los últimos 3 dígitos del Premio Mayor de la Lotería Nacional.",
  ticket_price: "320.00",
  ticket_list:
    "002, 005 y 009\n\n✨ Oportunidades adicionales:\n\n002: 164, 246, 271",
  prize_list: "Primer lugar: Premio principal\nSegundo lugar: Premio secundario",
  winning_number_list:
    "Primer lugar: 922 (boleto 001)\nSegundo lugar: 577 (boleto 014)",
  result_list:
    "Primer lugar: número 922, boleto 001\nSegundo lugar: número 577, boleto 014",
};

export function getCloudTemplateOwnerKey(owner: CloudTemplateOwner) {
  return owner.kind === "principal"
    ? "principal"
    : `channel:${owner.channelId}`;
}

export function resolveCloudTemplateOwner(params: {
  channelOwner: Extract<CloudTemplateOwner, { kind: "channel" }>;
  channelBusinessAccountId?: string | null;
  principalBusinessAccountId?: string | null;
}): CloudTemplateOwner {
  const channelBusinessAccountId =
    params.channelBusinessAccountId?.trim() || "";
  const principalBusinessAccountId =
    params.principalBusinessAccountId?.trim() || "";

  return channelBusinessAccountId &&
    channelBusinessAccountId === principalBusinessAccountId
    ? { kind: "principal" }
    : params.channelOwner;
}

export function getCloudTemplateScopesForPurpose(
  purpose: string,
): CloudTemplateScope[] {
  const normalized = purpose.trim().toUpperCase();
  if (normalized === "RAFFLES") return ["RAFFLES"];
  if (normalized === "COMBAT" || normalized === "BREEDING") return ["STORE"];
  return ["STORE", "RAFFLES"];
}

export function extractCloudTemplateVariables(content: string) {
  const variables: string[] = [];
  const pattern = new RegExp(VARIABLE_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (!variables.includes(match[1])) variables.push(match[1]);
  }
  return variables;
}

export function normalizeCloudTemplateParameterValue(value: unknown) {
  const normalized = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t+/g, " ").replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || "No disponible";
}

export function getCloudTemplateContentHash(content: string) {
  return createHash("sha256").update(content.trim(), "utf8").digest("hex");
}

function isRichInvitation(type: CloudTemplateType) {
  return type === "RAFFLE_INVITATION";
}

export function getCloudTemplateBodyContent(source: CloudTemplateSource) {
  if (!isRichInvitation(source.type)) return source.content.trim();

  return source.content
    .trim()
    .replace(
      /\n*\s*Si prefieres no recibir pr[oó]ximas invitaciones,\s*responde BAJA\.?\s*$/i,
      "",
    )
    .trim();
}

export function getCloudTemplateDefinitionHash(source: CloudTemplateSource) {
  if (!isRichInvitation(source.type)) {
    return getCloudTemplateContentHash(source.content);
  }
  return getCloudTemplateContentHash(
    `${getCloudTemplateBodyContent(source)}\n[nexus-layout:image-header-footer-v2]`,
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function buildTemplateName(
  owner: CloudTemplateOwner,
  source: CloudTemplateSource,
  contentHash: string,
) {
  const ownerPart =
    owner.kind === "principal"
      ? "principal"
      : `${slug(owner.purpose)}_${owner.channelId}`;
  return `nexus_${ownerPart}_${source.scope.toLowerCase()}_${source.type.toLowerCase()}_${contentHash.slice(0, 8)}`;
}

function buildTemplateDefinition(
  templateName: string,
  content: string,
  parameterNames: string[],
  languageCode: string,
  category: "UTILITY" | "MARKETING",
  type: CloudTemplateType,
  richInvitationHeaderHandle?: string | null,
): KapsoTemplateDefinition {
  const richInvitation = isRichInvitation(type);

  return {
    name: templateName,
    language: languageCode,
    category,
    parameter_format: "NAMED",
    components: [
      ...(richInvitation
        ? [
            {
              type: "HEADER" as const,
              format: "IMAGE" as const,
              example: { header_handle: [richInvitationHeaderHandle!] },
            },
          ]
        : []),
      {
        type: "BODY",
        text: getCloudTemplateBodyContent({
          scope: "RAFFLES",
          type,
          content,
        }),
        ...(parameterNames.length
          ? {
              example: {
                body_text_named_params: parameterNames.map((paramName) => ({
                  param_name: paramName,
                  example: VARIABLE_EXAMPLES[paramName] || "Ejemplo",
                })),
              },
            }
          : {}),
      },
      ...(richInvitation
        ? [
            {
              type: "FOOTER" as const,
              text: "Responde BAJA para dejar de recibir invitaciones.",
            },
          ]
        : []),
    ],
  };
}

export function getCloudTemplateCategory(
  type: CloudTemplateType,
): "UTILITY" | "MARKETING" {
  return type === "RAFFLE_INVITATION" || type === "OPENING"
    ? "MARKETING"
    : "UTILITY";
}

function normalizeRemoteStatus(value: unknown) {
  const normalized = String(value || "PENDING").toUpperCase();
  return ["APPROVED", "PENDING", "REJECTED"].includes(normalized)
    ? normalized
    : "PENDING";
}

function normalizeRemoteCategory(value: unknown): "UTILITY" | "MARKETING" | null {
  const normalized = String(value || "").toUpperCase();
  return normalized === "UTILITY" || normalized === "MARKETING"
    ? normalized
    : null;
}

export async function syncCloudTemplateCatalog(params: {
  owner: CloudTemplateOwner;
  config: KapsoConfig;
  sources: CloudTemplateSource[];
  languageCode?: string;
  resolveRichInvitationHeaderHandle?: () => Promise<string | null>;
}) {
  const languageCode = params.languageCode || "es_MX";
  const ownerKey = getCloudTemplateOwnerKey(params.owner);
  const results: Array<Record<string, unknown>> = [];

  for (const source of params.sources) {
    if (!source.content.trim()) {
      results.push({
        scope: source.scope,
        type: source.type,
        status: "MISSING_SOURCE",
      });
      continue;
    }

    const contentHash = getCloudTemplateDefinitionHash(source);
    const bodyContent = getCloudTemplateBodyContent(source);
    const parameterNames = extractCloudTemplateVariables(bodyContent);
    const templateName = buildTemplateName(params.owner, source, contentHash);

    if (
      isRichInvitation(source.type) &&
      false
    ) {
      const lastError =
        "Configura KAPSO_RAFFLE_INVITATION_HEADER_HANDLE para sincronizar la invitación con portada.";
      await storePrisma.whatsappCloudTemplate.upsert({
        where: {
          ownerKey_scope_type: {
            ownerKey,
            scope: source.scope,
            type: source.type,
          },
        },
        create: {
          channelId:
            params.owner.kind === "channel"
              ? (params.owner as Extract<CloudTemplateOwner, { kind: "channel" }>).channelId
              : null,
          ownerKey,
          scope: source.scope,
          type: source.type,
          templateName,
          languageCode,
          status: "ERROR",
          parameterNames,
          contentHash,
          lastError,
          lastSyncedAt: new Date(),
        },
        update: {
          templateName,
          languageCode,
          status: "ERROR",
          parameterNames,
          contentHash,
          lastError,
          lastSyncedAt: new Date(),
        },
      });
      results.push({
        scope: source.scope,
        type: source.type,
        templateName,
        status: "ERROR",
        lastError,
      });
      continue;
    }

    try {
      const remote = await kapsoClient.listTemplates(params.config, {
        name: templateName,
        language: languageCode,
      });
      const existing = remote.data.find(
        (item) =>
          String(item.name) === templateName &&
          String(item.language) === languageCode,
      );
      const richInvitationHeaderHandle =
        existing || !isRichInvitation(source.type)
          ? null
          : await params.resolveRichInvitationHeaderHandle?.();
      if (isRichInvitation(source.type) && !existing && !richInvitationHeaderHandle) {
        throw new Error(
          "No se pudo preparar una imagen de ejemplo para la invitación con portada.",
        );
      }
      const created = existing
        ? null
        : await kapsoClient.createTemplate(
            params.config,
            buildTemplateDefinition(
              templateName,
              source.content,
              parameterNames,
              languageCode,
              getCloudTemplateCategory(source.type),
              source.type,
              richInvitationHeaderHandle,
            ),
          );
      const templateId = String(existing?.id || created?.id || "") || null;
      const status = normalizeRemoteStatus(existing?.status || created?.status);
      const category =
        normalizeRemoteCategory(existing?.category || created?.category) ||
        getCloudTemplateCategory(source.type);

      await storePrisma.whatsappCloudTemplate.upsert({
        where: {
          ownerKey_scope_type: {
            ownerKey,
            scope: source.scope,
            type: source.type,
          },
        },
        create: {
          channelId:
            params.owner.kind === "channel" ? params.owner.channelId : null,
          ownerKey,
          scope: source.scope,
          type: source.type,
          templateName,
          templateId,
          category,
          languageCode,
          status,
          parameterNames,
          contentHash,
          lastSyncedAt: new Date(),
        },
        update: {
          channelId:
            params.owner.kind === "channel" ? params.owner.channelId : null,
          templateName,
          templateId,
          category,
          languageCode,
          status,
          parameterNames,
          contentHash,
          lastError: null,
          lastSyncedAt: new Date(),
        },
      });

      results.push({
        scope: source.scope,
        type: source.type,
        templateName,
        templateId,
        status,
      });
    } catch (error: any) {
      await storePrisma.whatsappCloudTemplate.upsert({
        where: {
          ownerKey_scope_type: {
            ownerKey,
            scope: source.scope,
            type: source.type,
          },
        },
        create: {
          channelId:
            params.owner.kind === "channel" ? params.owner.channelId : null,
          ownerKey,
          scope: source.scope,
          type: source.type,
          templateName,
          languageCode,
          status: "ERROR",
          parameterNames,
          contentHash,
          lastError: error?.message || "No se pudo sincronizar la plantilla.",
          lastSyncedAt: new Date(),
        },
        update: {
          templateName,
          languageCode,
          status: "ERROR",
          parameterNames,
          contentHash,
          lastError: error?.message || "No se pudo sincronizar la plantilla.",
          lastSyncedAt: new Date(),
        },
      });
      results.push({
        scope: source.scope,
        type: source.type,
        templateName,
        status: "ERROR",
        error: error?.message || "No se pudo sincronizar la plantilla.",
      });
    }
  }

  return results;
}

export async function getApprovedCloudTemplate(params: {
  owner: CloudTemplateOwner;
  config?: KapsoConfig;
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  sourceContent: string;
  values: Record<string, string>;
  mediaHeaderUrl?: string;
}): Promise<{ message: KapsoTemplateMessage; category: "UTILITY" | "MARKETING" } | null> {
  let mapping = await storePrisma.whatsappCloudTemplate.findUnique({
    where: {
      ownerKey_scope_type: {
        ownerKey: getCloudTemplateOwnerKey(params.owner),
        scope: params.scope,
        type: params.type,
      },
    },
  });
  const shouldRefresh =
    mapping &&
    (mapping.status !== "APPROVED" || !normalizeRemoteCategory(mapping.category)) &&
    params.config &&
    (!mapping.lastSyncedAt ||
      Date.now() - mapping.lastSyncedAt.getTime() >= 5 * 60_000);
  if (shouldRefresh && mapping) {
    try {
      const remote = await kapsoClient.listTemplates(params.config!, {
        name: mapping.templateName,
        language: mapping.languageCode,
      });
      const template = remote.data.find(
        (item) =>
          String(item.name) === mapping!.templateName &&
          String(item.language) === mapping!.languageCode,
      );
      if (template) {
        mapping = await storePrisma.whatsappCloudTemplate.update({
          where: { id: mapping.id },
          data: {
            templateId: String(template.id || "") || mapping.templateId,
            category:
              normalizeRemoteCategory(template.category) || mapping.category,
            status: normalizeRemoteStatus(template.status),
            lastError: null,
            lastSyncedAt: new Date(),
          },
        });
      }
    } catch {
      if (mapping.status !== "APPROVED") {
        throw Object.assign(
          new Error("Kapso no está disponible para validar la plantilla Cloud."),
          {
            statusCode: 424,
            code: "KAPSO_TEMPLATE_STATUS_UNAVAILABLE",
          },
        );
      }
      // An already approved local mapping remains usable during a transient lookup failure.
    }
  }
  if (
    !mapping ||
    mapping.status !== "APPROVED" ||
    mapping.contentHash !==
      getCloudTemplateDefinitionHash({
        scope: params.scope,
        type: params.type,
        content: params.sourceContent,
      })
  ) {
    return null;
  }

  const parameterNames = Array.isArray(mapping.parameterNames)
    ? mapping.parameterNames.map(String)
    : [];
  const components: KapsoTemplateMessage["components"] = [];
  if (
    isRichInvitation(params.type) &&
    params.mediaHeaderUrl?.trim()
  ) {
    components.push({
      type: "header",
      parameters: [
        {
          type: "image",
          image: { link: params.mediaHeaderUrl.trim() },
        },
      ],
    });
  }
  if (parameterNames.length) {
    components.push({
      type: "body",
      parameters: parameterNames.map((parameterName) => ({
        type: "text" as const,
        text: normalizeCloudTemplateParameterValue(
          params.values[parameterName],
        ),
        parameter_name: parameterName,
      })),
    });
  }

  return {
    category:
      normalizeRemoteCategory(mapping.category) ||
      getCloudTemplateCategory(params.type),
    message: {
      name: mapping.templateName,
      language: { code: mapping.languageCode },
      ...(components.length ? { components } : {}),
    },
  };
}
