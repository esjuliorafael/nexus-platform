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
  | "RAFFLE_INVITATION"
  | "RESULT_WINNER"
  | "RESULT_PARTICIPANTS";

export type ChannelTemplateDefinition = {
  type: ChannelTemplateType;
  key: string;
  label: string;
  variables: string[];
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
          "{{bank_info}}",
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
          "{{bank_info}}",
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
          "{{bank_info}}",
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
    key: "raffle-promotion",
    scope: "RAFFLES",
    label: "Promoción y apertura",
    description: "Invitación comercial y aviso de inicio de participación.",
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
          "{{bank_info}}",
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
          "{{bank_info}}",
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
          "{{bank_info}}",
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
];

export const CHANNEL_TEMPLATE_SECTIONS: ChannelTemplateSection[] = [
  {
    scope: "STORE",
    label: "Tienda",
    description: "Órdenes, apartados y pagos de productos.",
    groups: CHANNEL_TEMPLATE_GROUPS.filter((group) => group.scope === "STORE"),
  },
  {
    scope: "RAFFLES",
    label: "Rifas",
    description: "Promoción, participaciones, pagos y resultados de rifas.",
    groups: CHANNEL_TEMPLATE_GROUPS.filter(
      (group) => group.scope === "RAFFLES",
    ),
  },
];
