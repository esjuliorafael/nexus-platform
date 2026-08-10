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
  | "RESULT_PARTICIPANTS"
  | "PARTICIPATION_LOOKUP_CODE";

export type CloudTemplateSource = {
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  content: string;
  variant?: "LEGACY" | "SIMPLIFIED";
};

export type CloudTemplateVariant = "LEGACY" | "SIMPLIFIED";

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
  {
    scope: "RAFFLES",
    type: "RESTORED",
    key: "whatsapp_global_raffle_restored",
  },
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
  {
    scope: "RAFFLES",
    type: "PARTICIPATION_LOOKUP_CODE",
    key: "whatsapp_global_raffle_participation_lookup",
  },
];

const CLOUD_TEMPLATE_DEFAULT_CONTENTS: Partial<Record<CloudTemplateType, string>> = {
  PARTICIPATION_LOOKUP_CODE:
    "\u{1F50E} Recibimos tu solicitud para consultar tus participaciones.\n\nConsulta tus boletos y su estado desde el bot\u00f3n Ver participaci\u00f3n:\n\n{{participation_url}}",
};

export function getCanonicalCloudTemplateSettingKey(
  scope: CloudTemplateScope,
  type: CloudTemplateType,
) {
  return CLOUD_TEMPLATE_SETTING_KEYS.find(
    (item) => item.scope === scope && item.type === type,
  )?.key;
}

export function getTemplateActiveVersionSettingKey(
  scope: CloudTemplateScope,
  type: CloudTemplateType,
  provider: "EVOLUTION" | "CLOUD",
  owner?: CloudTemplateOwner,
) {
  const baseKey = getCanonicalCloudTemplateSettingKey(scope, type);
  if (!baseKey) return null;
  const ownerSuffix = owner
    ? owner.kind === "principal"
      ? "_principal"
      : `_channel_${owner.channelId}`
    : "";
  return `${baseKey}_active_version_${provider.toLowerCase()}${ownerSuffix}`;
}

export async function getActiveCloudTemplateVariant(params: {
  scope: CloudTemplateScope;
  type: CloudTemplateType;
  provider: "EVOLUTION" | "CLOUD";
  owner?: CloudTemplateOwner;
}): Promise<CloudTemplateVariant> {
  const settingKey = getTemplateActiveVersionSettingKey(
    params.scope,
    params.type,
    params.provider,
    params.owner,
  );
  if (!settingKey) return "LEGACY";
  let setting = await storePrisma.setting.findUnique({
    where: { key: settingKey },
    select: { value: true },
  });
  // A specialized channel inherits the Principal activation until it gets an
  // explicit channel override. Keep the old global key as a final fallback so
  // existing installations remain compatible after this migration.
  if (!setting && params.owner?.kind === "channel") {
    const principalKey = getTemplateActiveVersionSettingKey(
      params.scope,
      params.type,
      params.provider,
      { kind: "principal" },
    );
    if (principalKey) {
      setting = await storePrisma.setting.findUnique({
        where: { key: principalKey },
        select: { value: true },
      });
    }
  }
  if (!setting) {
    const legacyKey = getTemplateActiveVersionSettingKey(
      params.scope,
      params.type,
      params.provider,
    );
    if (legacyKey) {
      setting = await storePrisma.setting.findUnique({
        where: { key: legacyKey },
        select: { value: true },
      });
    }
  }
  return setting?.value === "SIMPLIFIED" ? "SIMPLIFIED" : "LEGACY";
}

export function buildCanonicalCloudTemplateSources(
  settings: Record<string, string | null | undefined>,
  scopes: CloudTemplateScope[] = ["STORE", "RAFFLES"],
  variant: CloudTemplateVariant = "LEGACY",
): CloudTemplateSource[] {
  const sources = CLOUD_TEMPLATE_SETTING_KEYS.filter((item) =>
    scopes.includes(item.scope),
  )
    .map((item) => ({
      scope: item.scope,
      type: item.type,
      content:
        variant === "SIMPLIFIED"
          ? settings[`${item.key}_simplified`] ||
            CLOUD_TEMPLATE_DEFAULT_CONTENTS[item.type] ||
            ""
          : settings[item.key] || "",
      variant,
    }))
    .filter(
      (item) =>
        item.content.trim() ||
        (variant === "LEGACY" && item.type !== "PARTICIPATION_LOOKUP_CODE"),
    );

  return sources;
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
  bank_name: "BBVA",
  bank_beneficiary: "Rancho Demo",
  bank_account: "1234567890",
  bank_clabe: "012345678901234567",
  bank_card: "1234 5678 9012 3456",
  time_store: "24 horas",
  time_raffle: "2 horas",
  time_remaining: "4 horas",
  expires_at: "24 de julio de 2026, 2:00 p. m.",
  recovery_url: "https://example.com/checkout#recovery=example",
  participation_url: "https://example.com/participations/demo-access-token",
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
  prize_list:
    "Primer lugar: Premio principal\nSegundo lugar: Premio secundario",
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
    // Meta rejects line breaks and tabs within a template parameter. Keep the
    // information readable without changing the original Evolution message.
    .filter(Boolean)
    .join(" · ")
    .trim();

  return normalized || "No disponible";
}

export function getCloudTemplateContentHash(content: string) {
  return createHash("sha256").update(content.trim(), "utf8").digest("hex");
}

function isRichInvitation(type: CloudTemplateType) {
  return type === "RAFFLE_INVITATION";
}

function hasParticipationButton(source: CloudTemplateSource) {
  return (
    source.variant === "SIMPLIFIED" &&
    source.type !== "PAYMENT_RECOVERY" &&
    /\{\{participation_url\}\}/.test(source.content)
  );
}

function hasRecoveryButton(source: CloudTemplateSource) {
  return (
    source.variant === "SIMPLIFIED" &&
    source.type === "PAYMENT_RECOVERY" &&
    /\{\{recovery_url\}\}/.test(source.content)
  );
}

function getParticipationButtonBaseUrl() {
  const baseUrl = (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "https://rancholastrojes.com.mx"
  ).replace(/\/+$/, "");

  return `${baseUrl}/participations`;
}

function getRecoveryButtonBaseUrl() {
  const baseUrl = (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "https://rancholastrojes.com.mx"
  ).replace(/\/+$/, "");

  return baseUrl;
}

function getParticipationButtonSuffix(value: unknown) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return rawValue;

  try {
    const parsed = new URL(rawValue);
    const marker = "/participations/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return parsed.pathname
        .slice(markerIndex + marker.length)
        .replace(/^\/+|\/+$/g, "");
    }
  } catch {
    // Legacy callers may already provide only the token suffix.
  }

  return rawValue.replace(/^\/+/, "").replace(/^participations\//i, "");
}

function getRecoveryButtonSuffix(value: unknown) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return rawValue;

  try {
    const parsed = new URL(rawValue);
    return `${parsed.pathname.replace(/^\/+/, "")}${parsed.search}${parsed.hash}`;
  } catch {
    return rawValue.replace(/^\/+/, "");
  }
}

export function getCloudTemplateBodyContent(source: CloudTemplateSource) {
  const content = source.content
    .trim()
    .replace(
      /\n*Consulta el detalle de tu participaci[\s\S]*?\{\{participation_url\}\}\s*/i,
      "",
    )
    // The URL is represented by the Cloud API button. Remove any remaining
    // token-bearing line so custom wording cannot submit it twice to Meta.
    .replace(
      /(?:^|\n)[^\n]*\{\{participation_url\}\}[^\n]*(?=\n|$)/gi,
      "",
    )
    .replace(/\{\{participation_url\}\}/gi, "")
    .replace(
      source.variant === "SIMPLIFIED" && source.type === "PAYMENT_RECOVERY"
        ? /(?:^|\n)[^\n]*\{\{recovery_url\}\}[^\n]*(?=\n|$)/gi
        : /$^/,
      "",
    )
    .replace(/\{\{recovery_url\}\}/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!isRichInvitation(source.type)) return content;

  return content
    .replace(
      /\n*\s*Si prefieres no recibir pr[oó]ximas invitaciones,\s*responde BAJA\.?\s*$/i,
      "",
    )
    .trim();
}

export function getCloudTemplateDefinitionHash(source: CloudTemplateSource) {
  const dynamicButtonLayout =
    source.variant === "SIMPLIFIED" &&
    (hasParticipationButton(source) || hasRecoveryButton(source))
      ? "\n[nexus-layout:dynamic-url-button-v2]"
      : "";
  if (!isRichInvitation(source.type)) {
    return getCloudTemplateContentHash(
      `${getCloudTemplateBodyContent(source)}${dynamicButtonLayout}`,
    );
  }
  return getCloudTemplateContentHash(
    `${getCloudTemplateBodyContent(source)}\n[nexus-layout:image-header-footer-v2]${dynamicButtonLayout}`,
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
  parameterNames: string[],
  languageCode: string,
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION",
  type: CloudTemplateType,
  source: CloudTemplateSource,
  richInvitationHeaderHandle?: string | null,
): KapsoTemplateDefinition {
  const richInvitation = isRichInvitation(type);
  // The lookup flow is intentionally a regular Utility template. The WABA
  // connected through Kapso does not grant this application permission to
  // create Authentication/OTP templates.
  const authentication = category === "AUTHENTICATION";
  return {
    name: templateName,
    language: languageCode,
    category,
    parameter_format: "NAMED",
    components: [
      ...(authentication
        ? [
            {
              type: "BODY" as const,
              add_security_recommendation: true,
            },
            {
              type: "FOOTER" as const,
              code_expiration_minutes: 10,
            },
            {
              type: "BUTTONS" as const,
              buttons: [
                {
                  type: "OTP" as const,
                  otp_type: "COPY_CODE" as const,
                  text: "Copiar código",
                },
              ],
            },
          ]
        : []),
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
        text: getCloudTemplateBodyContent(source),
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
      ...(hasParticipationButton(source)
        ? [
            {
              type: "BUTTONS" as const,
              buttons: [
                {
                  type: "URL" as const,
                  text: "Ver participación",
                  url: `${getParticipationButtonBaseUrl()}/{{1}}`,
                  example: ["demo-access-token"],
                },
              ],
            },
          ]
        : []),
      ...(hasRecoveryButton(source)
        ? [
            {
              type: "BUTTONS" as const,
              buttons: [
                {
                  type: "URL" as const,
                  text: "Reintentar pago",
                  url: `${getRecoveryButtonBaseUrl()}/{{1}}`,
                  example: ["checkout#recovery=demo-token"],
                },
              ],
            },
          ]
        : []),
    ],
  };
}

export function getCloudTemplateCategory(
  type: CloudTemplateType,
): "UTILITY" | "MARKETING" | "AUTHENTICATION" {
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

function normalizeRemoteCategory(
  value: unknown,
): "UTILITY" | "MARKETING" | "AUTHENTICATION" | null {
  const normalized = String(value || "").toUpperCase();
  return normalized === "UTILITY" ||
    normalized === "MARKETING" ||
    normalized === "AUTHENTICATION"
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

    const variant = source.variant || "LEGACY";
    const contentHash = getCloudTemplateDefinitionHash(source);
    const bodyContent = getCloudTemplateBodyContent(source);
    const parameterNames =
      source.type === "PARTICIPATION_LOOKUP_CODE"
        ? []
        : extractCloudTemplateVariables(bodyContent);
    const templateName = buildTemplateName(params.owner, source, contentHash);

    const activeMapping = await storePrisma.whatsappCloudTemplate.findUnique({
      where: {
        ownerKey_scope_type_variant: {
          ownerKey,
          scope: source.scope,
          type: source.type,
          variant,
        },
      },
    });
    const isReplacement = Boolean(
      activeMapping && activeMapping.contentHash !== contentHash,
    );
    const channelId =
      params.owner.kind === "channel" ? params.owner.channelId : null;
    const persist = async (data: {
      templateId?: string | null;
      category?: string | null;
      status: string;
      lastError?: string | null;
    }) => {
      const values = {
        channelId,
        ownerKey,
        scope: source.scope,
        type: source.type,
        variant,
        templateName,
        templateId: data.templateId ?? null,
        category: data.category ?? null,
        languageCode,
        status: data.status,
        parameterNames,
        contentHash,
        lastError: data.lastError ?? null,
        lastSyncedAt: new Date(),
      };

      if (isReplacement) {
        return storePrisma.whatsappCloudTemplateCandidate.upsert({
          where: {
            ownerKey_scope_type_variant_contentHash: {
              ownerKey,
              scope: source.scope,
              type: source.type,
              variant,
              contentHash,
            },
          },
          create: values,
          update: values,
        });
      }

      return storePrisma.whatsappCloudTemplate.upsert({
        where: {
          ownerKey_scope_type_variant: {
            ownerKey,
            scope: source.scope,
            type: source.type,
            variant,
          },
        },
        create: values,
        update: values,
      });
    };

    if (isRichInvitation(source.type) && false) {
      const lastError =
        "Configura KAPSO_RAFFLE_INVITATION_HEADER_HANDLE para sincronizar la invitación con portada.";
      await storePrisma.whatsappCloudTemplate.upsert({
        where: {
          ownerKey_scope_type_variant: {
            ownerKey,
            scope: source.scope,
            type: source.type,
            variant,
          },
        },
        create: {
          channelId:
            params.owner.kind === "channel"
              ? (
                  params.owner as Extract<
                    CloudTemplateOwner,
                    { kind: "channel" }
                  >
                ).channelId
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
      if (
        isRichInvitation(source.type) &&
        !existing &&
        !richInvitationHeaderHandle
      ) {
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
              parameterNames,
              languageCode,
              getCloudTemplateCategory(source.type),
              source.type,
              source,
              richInvitationHeaderHandle,
            ),
          );
      const templateId = String(existing?.id || created?.id || "") || null;
      const status = normalizeRemoteStatus(existing?.status || created?.status);
      const category =
        normalizeRemoteCategory(existing?.category || created?.category) ||
        getCloudTemplateCategory(source.type);

      await persist({ templateId, category, status });

      results.push({
        scope: source.scope,
        type: source.type,
        templateName,
        templateId,
        status,
        replacement: isReplacement,
      });
    } catch (error: any) {
      await persist({
        status: "ERROR",
        lastError: error?.message || "No se pudo sincronizar la plantilla.",
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
  variant?: CloudTemplateVariant;
}): Promise<{
  message: KapsoTemplateMessage;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
} | null> {
  const variant = params.variant || "LEGACY";
  let mapping = await storePrisma.whatsappCloudTemplate.findUnique({
    where: {
      ownerKey_scope_type_variant: {
        ownerKey: getCloudTemplateOwnerKey(params.owner),
        scope: params.scope,
        type: params.type,
        variant,
      },
    },
  });
  const desiredContentHash = getCloudTemplateDefinitionHash({
    scope: params.scope,
    type: params.type,
    content: params.sourceContent,
    variant,
  });

  // A pending replacement must never interrupt an approved operational
  // template. Promote it only after Meta has approved the exact definition.
  if (mapping && mapping.contentHash !== desiredContentHash) {
    let candidate = await storePrisma.whatsappCloudTemplateCandidate.findUnique(
      {
        where: {
          ownerKey_scope_type_variant_contentHash: {
            ownerKey: getCloudTemplateOwnerKey(params.owner),
            scope: params.scope,
            type: params.type,
            variant,
            contentHash: desiredContentHash,
          },
        },
      },
    );
    const shouldRefreshCandidate =
      candidate &&
      candidate.status !== "APPROVED" &&
      params.config &&
      (!candidate.lastSyncedAt ||
        Date.now() - candidate.lastSyncedAt.getTime() >= 5 * 60_000);

    if (shouldRefreshCandidate && candidate) {
      try {
        const remote = await kapsoClient.listTemplates(params.config!, {
          name: candidate.templateName,
          language: candidate.languageCode,
        });
        const template = remote.data.find(
          (item) =>
            String(item.name) === candidate!.templateName &&
            String(item.language) === candidate!.languageCode,
        );
        if (template) {
          candidate = await storePrisma.whatsappCloudTemplateCandidate.update({
            where: { id: candidate.id },
            data: {
              templateId: String(template.id || "") || candidate.templateId,
              category:
                normalizeRemoteCategory(template.category) ||
                candidate.category,
              status: normalizeRemoteStatus(template.status),
              lastError: null,
              lastSyncedAt: new Date(),
            },
          });
        }
      } catch {
        // Keep the approved active mapping available during a transient lookup failure.
      }
    }

    if (candidate?.status === "APPROVED") {
      mapping = await storePrisma.whatsappCloudTemplate.update({
        where: { id: mapping.id },
        data: {
          channelId: candidate.channelId,
          templateName: candidate.templateName,
          templateId: candidate.templateId,
          category: candidate.category,
          languageCode: candidate.languageCode,
          status: candidate.status,
          parameterNames: Array.isArray(candidate.parameterNames)
            ? candidate.parameterNames.map(String)
            : [],
          contentHash: candidate.contentHash,
          lastError: null,
          lastSyncedAt: candidate.lastSyncedAt || new Date(),
        },
      });
      await storePrisma.whatsappCloudTemplateCandidate.delete({
        where: { id: candidate.id },
      });
    }

    // The lookup template changed from an OTP code to a private-link request.
    // Never send the old code template as an implicit fallback for this type.
    if (params.type === "PARTICIPATION_LOOKUP_CODE" && mapping.contentHash !== desiredContentHash) {
      mapping = null;
    }
  }
  const shouldRefresh =
    mapping &&
    (mapping.status !== "APPROVED" ||
      !normalizeRemoteCategory(mapping.category)) &&
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
          new Error(
            "Kapso no está disponible para validar la plantilla Cloud.",
          ),
          {
            statusCode: 424,
            code: "KAPSO_TEMPLATE_STATUS_UNAVAILABLE",
          },
        );
      }
      // An already approved local mapping remains usable during a transient lookup failure.
    }
  }
  if (!mapping || mapping.status !== "APPROVED") {
    return null;
  }

  const parameterNames = Array.isArray(mapping.parameterNames)
    ? mapping.parameterNames.map(String)
    : [];
  if (
    !parameterNames.every((parameterName) => parameterName in params.values)
  ) {
    return null;
  }
  const components: KapsoTemplateMessage["components"] = [];
  if (isRichInvitation(params.type) && params.mediaHeaderUrl?.trim()) {
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
  if (hasParticipationButton({
    scope: params.scope,
    type: params.type,
    content: params.sourceContent,
    variant,
  })) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text: normalizeCloudTemplateParameterValue(
            getParticipationButtonSuffix(params.values.participation_url),
          ),
        },
      ],
    });
  }
  if (
    hasRecoveryButton({
      scope: params.scope,
      type: params.type,
      content: params.sourceContent,
      variant,
    })
  ) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [
        {
          type: "text",
          text: normalizeCloudTemplateParameterValue(
            getRecoveryButtonSuffix(params.values.recovery_url),
          ),
        },
      ],
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
