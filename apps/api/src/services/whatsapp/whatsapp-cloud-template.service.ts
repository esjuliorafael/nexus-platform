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
  | "PAYMENT_INSTRUCTIONS"
  | "RESTORED"
  | "REMINDER"
  | "OPENING"
  | "DRAW_REMINDER"
  | "DATE_CHANGE"
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
    type: "PAYMENT_INSTRUCTIONS",
    key: "whatsapp_global_store_payment_instructions",
  },
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
  {
    scope: "RAFFLES",
    type: "DATE_CHANGE",
    key: "whatsapp_global_raffle_date_change",
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

const SIMPLIFIED_DATE_CHANGE_CONTENT =
  "Hola, {{customer_name}}. \u{1F4C5}\n\nLa fecha de la rifa \u{201C}{{raffle_name}}\u{201D} cambi\u{00F3}.\n\nNueva fecha y hora:\n{{raffle_date}}\n\n{{status_note}}\n\nConsulta el detalle completo de tu participaci\u{00F3}n en el bot\u{00F3}n Ver participaci\u{00F3}n.\n\n{{participation_url}}\n\nGracias por participar.";

const SIMPLIFIED_DRAW_REMINDER_CONTENT =
  "\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}\n\nTe recordamos que la rifa \u{201C}{{raffle_name}}\u{201D} se realizar\u{00E1} el:\n\n\u{1F4C5} {{raffle_date}}\n\nTu participaci\u{00F3}n contin\u{00FA}a registrada para este sorteo. \u{1F340}\n\n\u{1F50E} Consulta el detalle de tu participaci\u{00F3}n en Ver participaci\u{00F3}n:\n\n{{participation_url}}\n\n\u00a1Mucha suerte!";

const SIMPLIFIED_STORE_TEMPLATE_DEFAULT_CONTENTS: Partial<
  Record<CloudTemplateType, string>
> = {
  RESERVATION:
    "¡Hola, {{customer_name}}! ✅\n\nRecibimos tu orden #{{order_id}}.\n\n💰 Total: ${{amount}} MXN\n⏳ Plazo de pago: {{time_store}}\n\n🏦 Si pagarás por depósito o transferencia, responde PAGOS para recibir los datos bancarios de esta orden.\n\n🔎 Consulta los productos, el estado de tu orden y las instrucciones de pago en el botón Ver orden.\n\n{{order_url}}",
  PAYMENT_INSTRUCTIONS:
    "Para continuar con el pago de tu orden #{{order_id}}:\n\n🏦 Información para tu pago:\n\nBanco: {{bank_name}}\nBeneficiario: {{bank_beneficiary}}\nNo. cuenta: {{bank_account}}\nCLABE: {{bank_clabe}}\nTarjeta: {{bank_card}}\n\n⏳ Tiempo disponible para pagar: {{time_store}}\n\n📎 Después de realizar el pago, envía tu comprobante por este medio.\n\n🔎 Consulta tu orden en el botón Ver orden.\n\n{{order_url}}",
};

const SIMPLIFIED_STORE_TEMPLATE_ADDITIONAL_CONTENTS: Partial<
  Record<CloudTemplateType, string>
> = {
  RESTORED:
    "¡Hola, {{customer_name}}! 🔄\n\nEl apartado de tu orden #{{order_id}} fue restaurado correctamente. ✅\n\n💰 Total pendiente: ${{amount}} MXN\n🕒 Plazo de pago: {{time_store}}\n\n🔎 Consulta el estado y las instrucciones de pago en el botón Ver orden:\n\n{{order_url}}",
  REMINDER:
    "¡Hola, {{customer_name}}! ⏳\n\nTu orden #{{order_id}} continúa pendiente de pago.\n\n💰 Total pendiente: ${{amount}} MXN\n⏱️ Tiempo restante: {{time_remaining}}\n\n🔎 Consulta el estado y las instrucciones de pago en el botón Ver orden:\n\n{{order_url}}",
  RELEASE:
    "Hola, {{customer_name}}. 🔓\n\nEl apartado de la orden #{{order_id}} fue liberado porque concluyó el plazo de pago.\n\nLa orden ya no está reservada.\n\n🔎 Consulta el estado y los detalles de tu orden en el botón Ver orden:\n\n{{order_url}}",
  PAYMENT_CONFIRMED:
    "¡Hola, {{customer_name}}! ✅\n\nEl pago de tu orden #{{order_id}} fue confirmado correctamente.\n\n💰 Total pagado: ${{amount}} MXN\n\n🔎 Consulta el estado y los detalles de tu orden en el botón Ver orden:\n\n{{order_url}}",
  PAYMENT_REFUNDED:
    "Hola, {{customer_name}}. ↩️\n\nLa devolución de tu orden #{{order_id}} fue procesada correctamente.\n\n💰 Monto devuelto: ${{refund_amount}} MXN\n\n🔎 Consulta los detalles de tu orden en el botón Ver orden:\n\n{{order_url}}",
  PAYMENT_RECOVERY:
    "Hola, {{customer_name}}. ⚠️\n\nNo pudimos confirmar el pago de tu orden.\nNo se realizó ningún cobro.\n\n⏳ Puedes reintentar antes de {{expires_at}} en el botón Reintentar pago:\n\n{{recovery_url}}",
};

const CLOUD_TEMPLATE_DEFAULT_CONTENTS: Partial<
  Record<CloudTemplateType, string>
> = {
  RELEASE:
    "Hola, {{customer_name}}. ⚠️\n\nTu apartado de la orden #{{order_id}} fue liberado porque concluyó el plazo de pago.\n\nLa orden ya no está reservada.\n\nSi realizaste el pago, escríbenos por este medio para revisar tu caso.",
  DATE_CHANGE:
    'Hola, {{customer_name}}. 📅\n\nLa fecha de la rifa "{{raffle_name}}" fue actualizada.\n\nNueva fecha y hora:\n{{raffle_date}}\n\nConsulta el detalle de tu participación desde el botón Ver participación.',
  DRAW_REMINDER: SIMPLIFIED_DRAW_REMINDER_CONTENT,
  RAFFLE_INVITATION: `¡Hola, {{customer_name}}! 🎟️

Te invitamos a participar en la “{{raffle_name}}”.

ℹ️ {{raffle_description}}

{{raffle_extra}}

📅 Apertura: {{opening_date}}
💰 Precio por boleto: \${{ticket_price}} MXN

🔎 Consulta los detalles, conoce los premios y selecciona tus boletos.

{{raffle_url}}`,
  RESULT_WINNER:
    '¡Felicidades, {{customer_name}}! 🏆\n\nEl resultado de tu participación en "{{raffle_name}}" ya está disponible.\n\nTu participación resultó ganadora. ✅\n\n🔎 Consulta el lugar, el premio y el número ganador en el botón Ver participación:\n\n{{participation_url}}',
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

type CloudTemplateMapping = NonNullable<
  Awaited<ReturnType<typeof storePrisma.whatsappCloudTemplate.findUnique>>
>;
type CloudTemplateCandidate = NonNullable<
  Awaited<
    ReturnType<typeof storePrisma.whatsappCloudTemplateCandidate.findUnique>
  >
>;

export async function promoteApprovedCloudTemplateCandidate(
  mapping: CloudTemplateMapping,
  candidate: CloudTemplateCandidate,
) {
  const promoted = await storePrisma.whatsappCloudTemplate.update({
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
  return promoted;
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
            (item.type === "DATE_CHANGE"
              ? SIMPLIFIED_DATE_CHANGE_CONTENT
              : item.scope === "STORE"
              ? SIMPLIFIED_STORE_TEMPLATE_DEFAULT_CONTENTS[item.type] ||
                SIMPLIFIED_STORE_TEMPLATE_ADDITIONAL_CONTENTS[item.type]
              : CLOUD_TEMPLATE_DEFAULT_CONTENTS[item.type]) ||
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
  order_url: "https://example.com/orders/demo-access-token",
  raffle_name: "Rifa Especial de Junio",
  raffle_description: "Tres premios de pollos para show a elegir.",
  raffle_extra: "📌 Cruzas disponibles: Alimonados, Colorados y Giros.",
  raffle_url: "https://example.com/raffles/1",
  opening_date: "Lunes, 20 de julio de 2026, 8:00 a. m.",
  raffle_date: "Hoy, 31 de julio de 2026 a las 8:00 p. m.",
  status_note:
    "Tu participaci\u00f3n sigue registrada. Este cambio no modifica tu plazo de pago.",
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

function hasOrderButton(source: CloudTemplateSource) {
  return (
    source.variant === "SIMPLIFIED" &&
    source.scope === "STORE" &&
    /\{\{order_url\}\}/.test(source.content)
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

function getOrderButtonBaseUrl() {
  const baseUrl = (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "https://rancholastrojes.com.mx"
  ).replace(/\/+$/, "");

  return `${baseUrl}/orders`;
}

function getOrderButtonSuffix(value: unknown) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return rawValue;

  try {
    const parsed = new URL(rawValue);
    const marker = "/orders/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return parsed.pathname
        .slice(markerIndex + marker.length)
        .replace(/^\/+|\/+$/g, "");
    }
  } catch {
    // Legacy callers may already provide only the token suffix.
  }

  return rawValue.replace(/^\/+/, "").replace(/^orders\//i, "");
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
    .replace(/(?:^|\n)[^\n]*\{\{participation_url\}\}[^\n]*(?=\n|$)/gi, "")
    .replace(/\{\{participation_url\}\}/gi, "")
    .replace(
      source.variant === "SIMPLIFIED" && source.scope === "STORE"
        ? /(?:^|\n)[^\n]*\{\{order_url\}\}[^\n]*(?=\n|$)/gi
        : /$^/,
      "",
    )
    .replace(/\{\{order_url\}\}/gi, "")
    .replace(
      source.variant === "SIMPLIFIED" && source.type === "PAYMENT_RECOVERY"
        ? /(?:^|\n)[^\n]*\{\{recovery_url\}\}[^\n]*(?=\n|$)/gi
        : /$^/,
      "",
    )
    .replace(/\{\{recovery_url\}\}/gi, "")
    .replace(
      source.variant === "SIMPLIFIED" &&
      (source.type === "RESULT_PARTICIPANTS" ||
        source.type === "RAFFLE_INVITATION")
        ? /(?:^|\n)[^\n]*\{\{raffle_url\}\}[^\n]*(?=\n|$)/gi
        : /$^/,
      "",
    )
    .replace(/\{\{raffle_url\}\}/gi, "")
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

export function omitOptionalRaffleInvitationAdditionalInfo(content: string) {
  return content
    .replace(
      /(?:^|\n)[^\n]*\{\{raffle_extra\}\}[^\n]*(?:\n|$)/gi,
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getCloudTemplateDefinitionHash(source: CloudTemplateSource) {
  const dynamicButtonLayout =
    source.variant === "SIMPLIFIED" &&
    (hasParticipationButton(source) ||
      hasOrderButton(source) ||
      hasRecoveryButton(source) ||
      hasResultsButton(source) ||
      hasRaffleButton(source))
      ? "\n[nexus-layout:dynamic-url-button-v3]"
      : "";
  // The lookup template used to be named with the obsolete `_code` purpose.
  // Include a naming revision in its definition hash so the corrected Meta
  // template is tracked as a replacement and the old approved one remains a
  // fallback until the new one is approved and activated per channel.
  const namingRevision =
    source.type === "PARTICIPATION_LOOKUP_CODE"
      ? "\n[nexus-template-name:participation-lookup-v2]"
      : "";
  // Meta has classified winner notifications as Marketing. Include the
  // category revision in the definition so resubmitting creates a new Meta
  // template instead of reusing the previously submitted Utility template.
  const categoryRevision =
    source.type === "RESULT_WINNER"
      ? "\n[nexus-template-category:marketing-v2]"
      : "";
  if (!isRichInvitation(source.type)) {
    return getCloudTemplateContentHash(
      `${getCloudTemplateBodyContent(source)}${dynamicButtonLayout}${namingRevision}${categoryRevision}`,
    );
  }
  return getCloudTemplateContentHash(
    `${getCloudTemplateBodyContent(source)}\n[nexus-layout:image-header-footer-v2]${dynamicButtonLayout}${namingRevision}`,
  );
}

function getResultsButtonBaseUrl() {
  const baseUrl = (
    process.env.STOREFRONT_HTTPS_URL ||
    process.env.STOREFRONT_URL ||
    "https://rancholastrojes.com.mx"
  ).replace(/\/+$/, "");

  return `${baseUrl}/raffles`;
}

function getResultsButtonSuffix(value: unknown) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return rawValue;

  try {
    const parsed = new URL(rawValue);
    const marker = "/raffles/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return parsed.pathname
        .slice(markerIndex + marker.length)
        .replace(/^\/+|\/+$/g, "");
    }
  } catch {
    // Legacy callers may already provide only the raffle id.
  }

  return rawValue.replace(/^\/+/, "").replace(/^raffles\//i, "");
}

function hasResultsButton(source: CloudTemplateSource) {
  return (
    source.variant === "SIMPLIFIED" &&
    source.type === "RESULT_PARTICIPANTS" &&
    /\{\{raffle_url\}\}/.test(source.content)
  );
}

function hasRaffleButton(source: CloudTemplateSource) {
  return (
    source.variant === "SIMPLIFIED" &&
    source.type === "RAFFLE_INVITATION" &&
    /\{\{raffle_url\}\}/.test(source.content)
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function buildTemplateName(
  owner: CloudTemplateOwner,
  source: CloudTemplateSource,
  contentHash: string,
) {
  const ownerPart =
    owner.kind === "principal"
      ? "principal"
      : `${slug(owner.purpose)}_${owner.channelId}`;
  // Keep the persisted type stable, but expose the current user-facing
  // purpose in Meta's template name. This template no longer sends a code.
  const typePart =
    source.type === "PARTICIPATION_LOOKUP_CODE"
      ? "participation_lookup"
      : source.type.toLowerCase();
  return `nexus_${ownerPart}_${source.scope.toLowerCase()}_${typePart}_${contentHash.slice(0, 8)}`;
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
      ...(hasOrderButton(source)
        ? [
            {
              type: "BUTTONS" as const,
              buttons: [
                {
                  type: "URL" as const,
                  text: "Ver orden",
                  url: `${getOrderButtonBaseUrl()}/{{1}}`,
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
      ...(hasResultsButton(source)
        ? [
            {
              type: "BUTTONS" as const,
              buttons: [
                {
                  type: "URL" as const,
                  text: "Ver resultados",
                  url: `${getResultsButtonBaseUrl()}/{{1}}`,
                  example: ["1"],
                },
              ],
            },
          ]
        : []),
      ...(hasRaffleButton(source)
        ? [
            {
              type: "BUTTONS" as const,
              buttons: [
                {
                  type: "URL" as const,
                  text: "Ver detalles",
                  url: `${getResultsButtonBaseUrl()}/{{1}}`,
                  example: ["1"],
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
  return type === "RAFFLE_INVITATION" ||
    type === "OPENING" ||
    type === "RESULT_WINNER"
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

      // If this variant is already selected for the owner, an approved
      // replacement is safe to promote immediately. Without this, the old
      // mapping remains stale until the next real message is sent.
      if (
        isReplacement &&
        status === "APPROVED" &&
        activeMapping &&
        source.type !== "RAFFLE_INVITATION"
      ) {
        const activeVersionKey = getTemplateActiveVersionSettingKey(
          source.scope,
          source.type,
          "CLOUD",
          params.owner,
        );
        const activeVersionSetting = activeVersionKey
          ? await storePrisma.setting.findUnique({
              where: { key: activeVersionKey },
              select: { value: true },
            })
          : null;
        if ((activeVersionSetting?.value || "LEGACY") === variant) {
          const approvedCandidate =
            await storePrisma.whatsappCloudTemplateCandidate.findUnique({
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
          if (approvedCandidate?.status === "APPROVED") {
            await promoteApprovedCloudTemplateCandidate(
              activeMapping,
              approvedCandidate,
            );
          }
        }
      }

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
  let usesApprovedInvitationCandidate = false;

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
      if (
        params.type === "RAFFLE_INVITATION" &&
        /\{\{raffle_extra\}\}/i.test(params.sourceContent)
      ) {
        // Invitations support an optional information line. Keep the approved
        // base mapping available for invitations without additional info and
        // use the approved replacement only when that line is present.
        mapping = { ...mapping, ...candidate };
        usesApprovedInvitationCandidate = true;
      } else {
        mapping = await promoteApprovedCloudTemplateCandidate(mapping, candidate);
      }
    }

    // The lookup template changed from an OTP code to a private-link request.
    // Never send the old code template as an implicit fallback for this type.
    if (
      params.type === "PARTICIPATION_LOOKUP_CODE" &&
      mapping.contentHash !== desiredContentHash
    ) {
      mapping = null;
    }
  }
  const shouldRefresh =
    mapping &&
    !usesApprovedInvitationCandidate &&
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
  const fallbackValues =
    params.type === "RAFFLE_INVITATION" &&
    variant === "SIMPLIFIED" &&
    !usesApprovedInvitationCandidate &&
    /\{\{raffle_extra\}\}/i.test(params.sourceContent) &&
    mapping.contentHash !== desiredContentHash &&
    String(params.values.raffle_extra || "").trim()
      ? {
          ...params.values,
          raffle_description: [
            params.values.raffle_description,
            params.values.raffle_extra,
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : params.values;
  if (
    !parameterNames.every((parameterName) => parameterName in fallbackValues)
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
          fallbackValues[parameterName],
        ),
        parameter_name: parameterName,
      })),
    });
  }
  if (
    hasParticipationButton({
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
            getParticipationButtonSuffix(params.values.participation_url),
          ),
        },
      ],
    });
  }
  if (
    hasOrderButton({
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
            getOrderButtonSuffix(params.values.order_url),
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
  if (
    hasResultsButton({
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
            getResultsButtonSuffix(params.values.raffle_url),
          ),
        },
      ],
    });
  }
  if (
    hasRaffleButton({
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
            getResultsButtonSuffix(params.values.raffle_url),
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
