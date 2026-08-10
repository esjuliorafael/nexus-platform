export type ChannelTemplateScope = "STORE" | "RAFFLES";

export type ChannelTemplateType =
  | "RESERVATION"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_RECOVERY"
  | "RESTORED"
  | "REMINDER"
  | "RELEASE"
  | "OPENING"
  | "DRAW_REMINDER"
  | "RAFFLE_INVITATION"
  | "RESULT_WINNER"
  | "RESULT_PARTICIPANTS"
  | "PARTICIPATION_LOOKUP_CODE"
  | "MARKETING_SUBSCRIBED"
  | "MARKETING_UNSUBSCRIBED";

export type ChannelTemplateVersion = "LEGACY" | "SIMPLIFIED";

export type ChannelTemplateDefinition = {
  type: ChannelTemplateType;
  key: string;
  label: string;
  variables: string[];
  defaultContent?: string;
  baseKey?: string;
  isTemporaryFallback?: boolean;
  simplifiedOnly?: boolean;
};

export type ChannelTemplateGroup = {
  key: string;
  scope: ChannelTemplateScope;
  label: string;
  description: string;
  templates: ChannelTemplateDefinition[];
};

export type ChannelTemplateSection = {
  scope: ChannelTemplateScope;
  label: string;
  description: string;
  groups: ChannelTemplateGroup[];
};

const BANK_TEMPLATE_VARIABLES = [
  "{{bank_name}}",
  "{{bank_beneficiary}}",
  "{{bank_account}}",
  "{{bank_clabe}}",
  "{{bank_card}}",
];

export const CHANNEL_TEMPLATE_GROUPS: ChannelTemplateGroup[] = [
  {
    key: "store-reservations",
    scope: "STORE",
    label: "Apartado y seguimiento",
    description:
      "Creación, seguimiento, liberación y restauración de apartados.",
    templates: [
      {
        type: "RESERVATION",
        key: "whatsapp_global_store_res",
        label: "Apartado de orden",
        variables: [
          "{{greeting}}",
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
          ...BANK_TEMPLATE_VARIABLES,
          "{{time_store}}",
        ],
      },
      {
        type: "REMINDER",
        key: "whatsapp_global_store_reminder",
        label: "Recordatorio de pago",
        variables: [
          "{{greeting}}",
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
          ...BANK_TEMPLATE_VARIABLES,
          "{{time_remaining}}",
        ],
      },
      {
        type: "RELEASE",
        key: "whatsapp_global_store_rel",
        label: "Liberación de orden",
        variables: ["{{customer_name}}", "{{order_id}}", "{{item_list}}"],
      },
      {
        type: "RESTORED",
        key: "whatsapp_global_store_restored",
        label: "Apartado restaurado",
        variables: [
          "{{greeting}}",
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
          ...BANK_TEMPLATE_VARIABLES,
          "{{time_store}}",
        ],
      },
    ],
  },
  {
    key: "store-payments",
    scope: "STORE",
    label: "Pagos",
    description:
      "Desenlaces confirmados y recuperación de cobros no concretados.",
    templates: [
      {
        type: "PAYMENT_CONFIRMED",
        key: "whatsapp_global_store_pay",
        label: "Pago confirmado",
        variables: [
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{amount}}",
        ],
      },
      {
        type: "PAYMENT_REFUNDED",
        key: "whatsapp_global_store_refunded",
        label: "Devolución de pago",
        variables: [
          "{{customer_name}}",
          "{{order_id}}",
          "{{item_list}}",
          "{{refund_amount}}",
          "{{refund_id}}",
          "{{refunded_at}}",
        ],
      },
      {
        type: "PAYMENT_RECOVERY",
        key: "whatsapp_global_store_payment_recovery",
        label: "Pago no concretado",
        variables: [
          "{{customer_name}}",
          "{{item_list}}",
          "{{amount}}",
          "{{expires_at}}",
          "{{recovery_url}}",
        ],
      },
    ],
  },
  {
    key: "raffle-opening",
    scope: "RAFFLES",
    label: "Apertura solicitada",
    description:
      "Aviso para personas que pidieron conocer el inicio de la participación.",
    templates: [
      {
        type: "OPENING",
        key: "whatsapp_global_raffle_opening",
        label: "Aviso de apertura",
        variables: ["{{raffle_name}}", "{{opening_date}}", "{{raffle_url}}"],
      },
    ],
  },
  {
    key: "raffle-participations",
    scope: "RAFFLES",
    label: "Participaciones",
    description: "Apartado, seguimiento y liberación de boletos.",
    templates: [
      {
        type: "RESERVATION",
        key: "whatsapp_global_raffle_res",
        label: "Apartado de boletos",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
          ...BANK_TEMPLATE_VARIABLES,
          "{{time_raffle}}",
        ],
      },
      {
        type: "RESTORED",
        key: "whatsapp_global_raffle_restored",
        label: "Apartado de boletos restaurado",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
          ...BANK_TEMPLATE_VARIABLES,
          "{{time_raffle}}",
        ],
      },
      {
        type: "REMINDER",
        key: "whatsapp_global_raffle_reminder",
        label: "Recordatorio de pago",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
          ...BANK_TEMPLATE_VARIABLES,
          "{{time_remaining}}",
        ],
      },
      {
        type: "RELEASE",
        key: "whatsapp_global_raffle_rel",
        label: "Liberación de boletos",
        variables: ["{{customer_name}}", "{{ticket_list}}", "{{raffle_name}}"],
      },
    ],
  },
  {
    key: "raffle-payments",
    scope: "RAFFLES",
    label: "Pagos",
    description:
      "Desenlaces confirmados y recuperación de cobros no concretados.",
    templates: [
      {
        type: "PAYMENT_CONFIRMED",
        key: "whatsapp_global_raffle_pay",
        label: "Pago confirmado",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{amount}}",
        ],
      },
      {
        type: "PAYMENT_RECOVERY",
        key: "whatsapp_global_raffle_payment_recovery",
        label: "Pago no concretado",
        variables: [
          "{{customer_name}}",
          "{{raffle_name}}",
          "{{ticket_list}}",
          "{{amount}}",
          "{{expires_at}}",
          "{{recovery_url}}",
        ],
      },
      {
        type: "PAYMENT_REFUNDED",
        key: "whatsapp_global_raffle_refunded",
        label: "Devolución de participación",
        variables: [
          "{{customer_name}}",
          "{{ticket_list}}",
          "{{raffle_name}}",
          "{{refund_amount}}",
          "{{refund_id}}",
          "{{refunded_at}}",
        ],
      },
    ],
  },
  {
    key: "raffle-results",
    scope: "RAFFLES",
    label: "Resultados",
    description:
      "Comunicación a ganadores y participantes después de la resolución.",
    templates: [
      {
        type: "DRAW_REMINDER",
        key: "whatsapp_global_raffle_draw_reminder",
        label: "Recordatorio de la rifa",
        variables: [
          "{{customer_name}}",
          "{{raffle_name}}",
          "{{raffle_date}}",
          "{{ticket_list}}",
          "{{participation_rule}}",
          "{{prize_list}}",
          "{{winning_rule}}",
        ],
      },
      {
        type: "RESULT_WINNER",
        key: "whatsapp_global_raffle_winner",
        label: "Ganador de la rifa",
        variables: [
          "{{customer_name}}",
          "{{raffle_name}}",
          "{{prize_list}}",
          "{{winning_number_list}}",
          "{{ticket_list}}",
          "{{raffle_url}}",
        ],
      },
      {
        type: "RESULT_PARTICIPANTS",
        key: "whatsapp_global_raffle_results",
        label: "Resultados de la rifa",
        variables: [
          "{{customer_name}}",
          "{{raffle_name}}",
          "{{result_list}}",
          "{{raffle_url}}",
        ],
      },
    ],
  },
  {
    key: "raffle-verification",
    scope: "RAFFLES",
    label: "Consulta",
    description: "Enlace privado para consultar tus participaciones.",
    templates: [
      {
        type: "PARTICIPATION_LOOKUP_CODE",
        key: "whatsapp_global_raffle_participation_lookup",
        label: "Consulta de participación",
        variables: ["{{participation_url}}"],
        simplifiedOnly: true,
        defaultContent: `\u{1F50E} Recibimos tu solicitud para consultar tus participaciones.\n\nConsulta tus boletos y su estado desde el botón Ver participación:\n\n{{participation_url}}`,
      },
    ],
  },
  {
    key: "raffle-preferences",
    scope: "RAFFLES",
    label: "Preferencias de WhatsApp",
    description: "Confirmaciones automáticas al activar o detener novedades.",
    templates: [
      {
        type: "MARKETING_SUBSCRIBED",
        key: "whatsapp_global_marketing_subscribed",
        label: "Confirmación de alta",
        variables: ["{{customer_name}}"],
      },
      {
        type: "MARKETING_UNSUBSCRIBED",
        key: "whatsapp_global_marketing_unsubscribed",
        label: "Confirmación de baja",
        variables: ["{{customer_name}}"],
      },
    ],
  },
  {
    key: "raffle-promotion",
    scope: "RAFFLES",
    label: "Promoción",
    description: "Invitación comercial para audiencias autorizadas.",
    templates: [
      {
        type: "RAFFLE_INVITATION",
        key: "whatsapp_global_raffle_invitation",
        label: "Invitación a una nueva rifa",
        variables: [
          "{{customer_name}}",
          "{{raffle_name}}",
          "{{opening_date}}",
          "{{ticket_price}}",
          "{{raffle_url}}",
        ],
      },
    ],
  },
];

const RAFFLE_TICKET_TEMPLATE_TYPES = new Set<ChannelTemplateType>([
  "RESERVATION",
  "RESTORED",
  "REMINDER",
  "RELEASE",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECOVERY",
  "PAYMENT_REFUNDED",
  "DRAW_REMINDER",
  "RESULT_WINNER",
]);

const variantKey = (type: ChannelTemplateType, variant: "simple" | "opportunities") =>
  `whatsapp_global_raffle_${type.toLowerCase()}_${variant}`;

const raffleCloudTemplateDefaults: Partial<Record<ChannelTemplateType, string>> = {
  RESERVATION: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Tu participaci\u00f3n en la \u201c{{raffle_name}}\u201d qued\u00f3 apartada correctamente. \u2705

\u{1F3AB} Boletos seleccionados:

{{ticket_list}}

Total pendiente: \${{amount}} MXN

\u23f3 Tienes {{time_raffle}} para realizar tu dep\u00f3sito o transferencia y enviarnos el comprobante por este medio.

\u{1F3E6} Informaci\u00f3n para tu pago:

Banco: {{bank_name}}
Beneficiario: {{bank_beneficiary}}
No. Cuenta: {{bank_account}}
CLABE: {{bank_clabe}}
Tarjeta: {{bank_card}}

Cuando recibamos tu comprobante, nuestro equipo validar\u00e1 el pago para confirmar tu participaci\u00f3n.

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}

\u00a1Gracias por participar y mucha suerte! \u{1F340}`,
  RESTORED: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Tu participaci\u00f3n en la \u201c{{raffle_name}}\u201d fue restaurada correctamente. \u2705

\u{1F3AB} Boletos seleccionados:

{{ticket_list}}

Total pendiente: \${{amount}} MXN

\u23f3 Tienes {{time_raffle}} para realizar tu dep\u00f3sito o transferencia.

\u{1F3E6} Informaci\u00f3n para tu pago:

Banco: {{bank_name}}
Beneficiario: {{bank_beneficiary}}
No. Cuenta: {{bank_account}}
CLABE: {{bank_clabe}}
Tarjeta: {{bank_card}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
  REMINDER: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Te recordamos que tu participaci\u00f3n en la \u201c{{raffle_name}}\u201d sigue pendiente de pago.

\u{1F3AB} Boletos seleccionados:

{{ticket_list}}

Total pendiente: \${{amount}} MXN

\u23f3 Tiempo restante: {{time_remaining}}

\u{1F3E6} Informaci\u00f3n para tu pago:

Banco: {{bank_name}}
Beneficiario: {{bank_beneficiary}}
No. Cuenta: {{bank_account}}
CLABE: {{bank_clabe}}
Tarjeta: {{bank_card}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
  RELEASE: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

El plazo de pago de tu participaci\u00f3n en la \u201c{{raffle_name}}\u201d termin\u00f3 y los boletos fueron liberados.

\u{1F3AB} Boletos liberados:

{{ticket_list}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
  PAYMENT_CONFIRMED: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Tu pago para la \u201c{{raffle_name}}\u201d fue confirmado correctamente. \u2705

\u{1F3AB} Boletos participantes:

{{ticket_list}}

Total pagado: \${{amount}} MXN

Tus n\u00fameros ya est\u00e1n participando en la rifa.

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}

\u00a1Muchas gracias y mucha suerte! \u{1F340}\u2728`,
  PAYMENT_RECOVERY: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

No pudimos confirmar el pago para la \u201c{{raffle_name}}\u201d. No se realiz\u00f3 ning\u00fan cobro.

\u{1F3AB} Boletos seleccionados:

{{ticket_list}}

Total: \${{amount}} MXN

Puedes reintentar el pago antes de {{expires_at}}:

{{recovery_url}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
  PAYMENT_REFUNDED: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

La devoluci\u00f3n de tu participaci\u00f3n en la \u201c{{raffle_name}}\u201d fue procesada correctamente.

\u{1F3AB} Boletos involucrados:

{{ticket_list}}

Monto devuelto: \${{refund_amount}} MXN
Referencia: {{refund_id}}
Fecha: {{refunded_at}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
  DRAW_REMINDER: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Hoy se define el resultado de la \u201c{{raffle_name}}\u201d. \u{1F340}

\u{1F3AB} Tus boletos participantes:

{{ticket_list}}

\u{1F3C6} Premios en juego:

{{prize_list}}

\u{1F4C5} Resultado de la rifa:

{{participation_rule}}

{{winning_rule}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}

\u00a1Mucha suerte! \u2728`,
  RESULT_WINNER: `\u00a1Hola, {{customer_name}}! \u{1F3C6}

\u00a1Felicidades! Ganaste en la \u201c{{raffle_name}}\u201d.

Premio(s):

{{prize_list}}

Resultado(s):

{{winning_number_list}}

\u{1F3AB} Boleto(s) ganador(es):

{{ticket_list}}

Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}

Nos comunicaremos contigo para coordinar la entrega.`,
};

const getRaffleCloudTemplateDefault = (
  type: ChannelTemplateType,
  variant: "simple" | "opportunities",
) => {
  const base = raffleCloudTemplateDefaults[type] || "";
  if (variant === "simple") return base;

  const opportunityRule =
    "Cada boleto participa con {{opportunity_count}} n\u00fameros: el n\u00famero que eliges y {{additional_opportunity_count}} oportunidades adicionales.";

  return base.replace("{{ticket_list}}", `{{ticket_list}}\n\n${opportunityRule}`);
};

const SIMPLIFIED_RAFFLE_TEMPLATE_CONTENT: Partial<
  Record<ChannelTemplateType, string>
> = {
  PARTICIPATION_LOOKUP_CODE: `\u{1F50E} Recibimos tu solicitud para consultar tus participaciones.

Consulta tus boletos y su estado desde el bot\u00f3n Ver participaci\u00f3n:

{{participation_url}}`,
  RESERVATION: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Tu participaci\u00f3n qued\u00f3 apartada correctamente. \u2705

\u{1F4B0} Total pendiente: \${{amount}} MXN

\u23f3 Tienes {{time_raffle}} para realizar tu dep\u00f3sito o transferencia y enviarnos el comprobante por este medio.

\u{1F50E} Consulta el detalle completo de tu participaci\u00f3n y las instrucciones en el bot\u00f3n Ver participaci\u00f3n:

{{participation_url}}

\u00a1Gracias por participar!`,
  RESTORED: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Tu participaci\u00f3n fue restaurada correctamente. \u2705

\u{1F4B0} Total pendiente: \${{amount}} MXN

\u23f3 Tienes {{time_raffle}} para realizar tu dep\u00f3sito o transferencia.

\u{1F50E} Consulta el detalle completo de tu participaci\u00f3n en Ver participaci\u00f3n:

{{participation_url}}

\u00a1Gracias por participar!`,
  REMINDER: `\u00a1Hola, {{customer_name}}! \u23f3

Tu participaci\u00f3n contin\u00faa apartada y pendiente de pago.

\u{1F4B0} Total pendiente: \${{amount}} MXN

\u23f0 Tiempo restante: {{time_remaining}}

\u{1F50E} Consulta el detalle completo de tu participaci\u00f3n en Ver participaci\u00f3n:

{{participation_url}}`,
  RELEASE: `Hola, {{customer_name}}. \u{1F513}

Tu participaci\u00f3n fue liberada porque concluy\u00f3 el tiempo disponible para confirmar el pago. \u23f3

\u{1F50E} Si todav\u00eda quieres participar, consulta tu participaci\u00f3n para revisar si puede restaurarse o visita la rifa para elegir nuevos boletos:

{{participation_url}}

Si necesitas ayuda, escr\u00edbenos por este medio.`,
  PAYMENT_CONFIRMED: `\u00a1Hola, {{customer_name}}! \u{1F39F}\u{FE0F}

Tu pago fue confirmado correctamente. \u2705

\u{1F4B3} Total pagado: \${{amount}} MXN

\u{1F50E} Consulta el detalle completo de tu participaci\u00f3n en Ver participaci\u00f3n:

{{participation_url}}

\u00a1Gracias por participar!`,
  PAYMENT_RECOVERY: `Hola, {{customer_name}}. \u26a0\uFE0F

No pudimos confirmar el pago. No se realiz\u00f3 ning\u00fan cobro.

\u{1F504} Puedes reintentar antes de {{expires_at}} usando el bot\u00f3n Reintentar pago:

{{recovery_url}}
`,
  PAYMENT_REFUNDED: `Hola, {{customer_name}}. \u21a9\uFE0F

La devoluci\u00f3n de tu participaci\u00f3n fue procesada correctamente.

\u{1F4B0} Monto devuelto: \${{refund_amount}} MXN
\u{1F4C4} Referencia: {{refund_id}}

\u{1F50E} Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
  RESULT_WINNER: `\u00a1Felicidades, {{customer_name}}! \u{1F3C6}

Tu participaci\u00f3n result\u00f3 ganadora en "{{raffle_name}}". \ud83c\udfc6

\ud83e\udd47 Lugar: {{place}}
\ud83c\udf81 Premio: {{prize}}
\ud83c\udfaf N\u00famero ganador: {{winning_number}}

\u{1F50E} Consulta tu participaci\u00f3n en Ver participaci\u00f3n:

{{participation_url}}`,
  RESULT_PARTICIPANTS: `Hola, {{customer_name}}. \ud83d\udce3

El resultado de la rifa "{{raffle_name}}" ya fue publicado. \u2705

{{result_list}}

\u{1F50E} Consulta el detalle de tu participaci\u00f3n:

{{participation_url}}`,
};

export const getTemplateStorageKey = (
  template: ChannelTemplateDefinition,
  version: ChannelTemplateVersion,
) => version === "SIMPLIFIED" ? `${template.key}_simplified` : template.key;

export const getTemplateActiveVersionKey = (
  template: ChannelTemplateDefinition,
  provider: "EVOLUTION" | "CLOUD",
  ownerKey: string,
) => `${template.key}_active_version_${provider.toLowerCase()}_${ownerKey === "principal" ? "principal" : ownerKey.replace(/^channel:/, "channel_")}`;

export const getTemplateVariantContent = (
  template: ChannelTemplateDefinition,
  version: ChannelTemplateVersion,
  scope?: ChannelTemplateScope,
) => version === "SIMPLIFIED"
  ? scope === "RAFFLES"
    ? SIMPLIFIED_RAFFLE_TEMPLATE_CONTENT[template.type] || ""
    : ""
  : template.simplifiedOnly
    ? ""
    : template.defaultContent || "";

export const getTemplateVariantVariables = (
  template: ChannelTemplateDefinition,
  version: ChannelTemplateVersion,
  scope?: ChannelTemplateScope,
) => {
  const content = getTemplateVariantContent(template, version, scope);
  if (!content) return template.variables;
  const variables = Array.from(
    content.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g),
    (match) => `{{${match[1]}}}`,
  );
  return variables.filter((variable, index) => variables.indexOf(variable) === index);
};

export const getChannelTemplateEditorContent = (
  template: ChannelTemplateDefinition,
  config: Record<string, string>,
  version: ChannelTemplateVersion = "LEGACY",
  scope?: ChannelTemplateScope,
) => {
  const saved = config[getTemplateStorageKey(template, version)]?.trim();
  const content = saved || getTemplateVariantContent(template, version, scope);
  if (version === "SIMPLIFIED") return content;
  return content.replace(
    /\n*Consulta el detalle de tu participaci[^\n]*:\s*\n\s*\{\{participation_url\}\}\s*/i,
    "",
  );
};

const TEMPLATE_ORDER_BY_GROUP: Record<string, ChannelTemplateType[]> = {
  "store-reservations": ["RESERVATION", "RESTORED", "REMINDER", "RELEASE"],
  "store-payments": ["PAYMENT_CONFIRMED", "PAYMENT_RECOVERY", "PAYMENT_REFUNDED"],
  "raffle-participations": ["RESERVATION", "RESTORED", "REMINDER", "RELEASE"],
  "raffle-payments": ["PAYMENT_CONFIRMED", "PAYMENT_RECOVERY", "PAYMENT_REFUNDED"],
  "raffle-results": ["DRAW_REMINDER", "RESULT_WINNER", "RESULT_PARTICIPANTS"],
  "raffle-verification": ["PARTICIPATION_LOOKUP_CODE"],
  "raffle-preferences": ["MARKETING_SUBSCRIBED", "MARKETING_UNSUBSCRIBED"],
  "raffle-promotion": ["RAFFLE_INVITATION"],
};

const TEMPLATE_GROUP_ORDER: Record<ChannelTemplateScope, string[]> = {
  STORE: ["store-reservations", "store-payments"],
  RAFFLES: [
    "raffle-opening",
    "raffle-participations",
    "raffle-payments",
    "raffle-results",
    "raffle-verification",
    "raffle-preferences",
    "raffle-promotion",
  ],
};

const orderTemplateGroups = (scope: ChannelTemplateScope) =>
  CHANNEL_TEMPLATE_GROUPS
    .filter((group) => group.scope === scope && group.templates.length > 0)
    .sort(
      (left, right) =>
        TEMPLATE_GROUP_ORDER[scope].indexOf(left.key) -
        TEMPLATE_GROUP_ORDER[scope].indexOf(right.key),
    )
    .map((group) => {
      const order = TEMPLATE_ORDER_BY_GROUP[group.key] || [];
      return {
        ...group,
        templates: [...group.templates].sort(
          (left, right) =>
            order.indexOf(left.type) - order.indexOf(right.type),
        ),
      };
    });

export const CHANNEL_TEMPLATE_SECTIONS: ChannelTemplateSection[] = [
  {
    scope: "STORE",
    label: "Tienda",
    description: "Órdenes, apartados y pagos de productos.",
    groups: orderTemplateGroups("STORE"),
  },
  {
    scope: "RAFFLES",
    label: "Rifas",
    description:
      "Apertura, participaciones, pagos, resultados y preferencias de rifas.",
    groups: orderTemplateGroups("RAFFLES"),
  },
];
