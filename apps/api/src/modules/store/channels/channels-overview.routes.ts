import { FastifyInstance } from "fastify";
import { z } from "zod";
import { isKapsoTenantDeliveryEnabled } from "../../../services/whatsapp/whatsapp-delivery-policy";
import {
  CLOUD_TEMPLATE_SETTING_KEYS,
  getCloudTemplateContentHash,
} from "../../../services/whatsapp/whatsapp-cloud-template.service";

const specializedChannelSchema = z
  .object({
    name: z.string().trim().min(1),
    purpose: z.enum(["COMBAT", "BREEDING", "RAFFLES"]),
    bank: z.string().trim().optional().default(""),
    beneficiary: z.string().trim().optional().default(""),
    accountNumber: z.string().trim().optional(),
    clabe: z.string().trim().optional(),
    card: z.string().trim().optional(),
    phone: z.string().trim().optional().default(""),
    active: z.boolean().optional().default(true),
    provider: z.enum(["EVOLUTION", "KAPSO"]).optional().default("EVOLUTION"),
    deliveryStrategy: z
      .enum(["STANDARD", "KAPSO_PREFERRED", "EVOLUTION_ONLY"])
      .optional()
      .default("STANDARD"),
    instanceName: z.string().trim().optional().default(""),
    kapsoPhoneNumberId: z.string().trim().optional().default(""),
    kapsoBusinessAccountId: z.string().trim().optional().default(""),
  })
  .superRefine((data, context) => {
    if (data.provider === "EVOLUTION" && !data.phone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "El número de WhatsApp es obligatorio para Evolution API.",
      });
    }
    if (data.provider === "EVOLUTION" && !data.instanceName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["instanceName"],
        message: "La instancia de Evolution API es obligatoria.",
      });
    }
    if (data.provider === "KAPSO" && !data.kapsoPhoneNumberId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kapsoPhoneNumberId"],
        message: "El Phone Number ID de Kapso es obligatorio.",
      });
    }
    if (data.provider === "KAPSO" && !data.kapsoBusinessAccountId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kapsoBusinessAccountId"],
        message: "El Business Account ID de Kapso es obligatorio.",
      });
    }
    if (
      data.deliveryStrategy === "KAPSO_PREFERRED" &&
      (!data.kapsoPhoneNumberId || !data.kapsoBusinessAccountId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryStrategy"],
        message:
          "Kapso preferente requiere Phone Number ID y Business Account ID.",
      });
    }
  });

const PURPOSE_LABELS: Record<string, string> = {
  COMBAT: "Canal de Combate",
  BREEDING: "Canal de Cria",
  RAFFLES: "Canal de Rifas",
};

const PURPOSE_DESCRIPTIONS: Record<string, string> = {
  COMBAT: "Ventas de aves de combate y flujos relacionados.",
  BREEDING: "Ventas de cria y operaciones de granja.",
  RAFFLES: "Apartados, pagos y liberaciones de boletos.",
};

const getSetting = (
  settings: Array<{ key: string; value: string | null }>,
  key: string,
) => settings.find((setting) => setting.key === key)?.value || "";

const requiredTemplatesForPurpose = (purpose: string) =>
  purpose === "RAFFLES"
    ? [
        "OPENING",
        "DRAW_REMINDER",
        "RESERVATION",
        "RESTORED",
        "PAYMENT_CONFIRMED",
        "PAYMENT_REFUNDED",
        "PAYMENT_RECOVERY",
        "REMINDER",
        "RELEASE",
        "RAFFLE_INVITATION",
        "RESULT_WINNER",
        "RESULT_PARTICIPANTS",
      ]
    : [
        "RESERVATION",
        "PAYMENT_CONFIRMED",
        "PAYMENT_REFUNDED",
        "PAYMENT_RECOVERY",
        "RESTORED",
        "REMINDER",
        "RELEASE",
      ];

const PRINCIPAL_TEMPLATE_KEYS: Record<string, string> = {
  "STORE:RESERVATION": "whatsapp_global_store_res",
  "STORE:PAYMENT_CONFIRMED": "whatsapp_global_store_pay",
  "STORE:PAYMENT_REFUNDED": "whatsapp_global_store_refunded",
  "STORE:PAYMENT_RECOVERY": "whatsapp_global_store_payment_recovery",
  "STORE:RESTORED": "whatsapp_global_store_restored",
  "STORE:REMINDER": "whatsapp_global_store_reminder",
  "STORE:RELEASE": "whatsapp_global_store_rel",
  "RAFFLES:OPENING": "whatsapp_global_raffle_opening",
  "RAFFLES:DRAW_REMINDER": "whatsapp_global_raffle_draw_reminder",
  "RAFFLES:RESERVATION": "whatsapp_global_raffle_res",
  "RAFFLES:RESTORED": "whatsapp_global_raffle_restored",
  "RAFFLES:PAYMENT_CONFIRMED": "whatsapp_global_raffle_pay",
  "RAFFLES:PAYMENT_REFUNDED": "whatsapp_global_raffle_refunded",
  "RAFFLES:PAYMENT_RECOVERY": "whatsapp_global_raffle_payment_recovery",
  "RAFFLES:REMINDER": "whatsapp_global_raffle_reminder",
  "RAFFLES:RELEASE": "whatsapp_global_raffle_rel",
  "RAFFLES:RAFFLE_INVITATION": "whatsapp_global_raffle_invitation",
  "RAFFLES:RESULT_WINNER": "whatsapp_global_raffle_winner",
  "RAFFLES:RESULT_PARTICIPANTS": "whatsapp_global_raffle_results",
};

const getPrincipalTemplateContents = (
  purpose: string,
  settings: Array<{ key: string; value: string | null }>,
) => {
  const scope = purpose === "RAFFLES" ? "RAFFLES" : "STORE";
  return new Map(
    requiredTemplatesForPurpose(purpose)
      .map((type) => [
        type,
        getSetting(settings, PRINCIPAL_TEMPLATE_KEYS[`${scope}:${type}`]),
      ])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
};

const buildSpecializedChannel = (
  purpose: string,
  payment: any,
  whatsapp: any,
  principalTemplateContents: Map<string, string>,
) => {
  const hasBank = Boolean(payment?.bank && payment?.beneficiary);
  const hasMercadoPago = Boolean(payment?.mpAccessToken);
  const hasWhatsApp = Boolean(whatsapp?.active && whatsapp?.phone);
  const requiredTemplates = requiredTemplatesForPurpose(purpose);
  const hasTemplates = requiredTemplates.every((template) =>
    principalTemplateContents.has(template),
  );
  const approvedCloudTemplates = new Set(
    (whatsapp?.cloudTemplates || [])
      .filter((template: any) => {
        const content = principalTemplateContents.get(
          String(template.type).toUpperCase(),
        );
        return (
          template.status === "APPROVED" &&
          Boolean(content) &&
          template.contentHash === getCloudTemplateContentHash(content || "")
        );
      })
      .map((template: any) => String(template.type).toUpperCase()),
  );
  const hasCloudTemplates = requiredTemplates.every((template) =>
    approvedCloudTemplates.has(template),
  );
  const whatsappReady =
    hasWhatsApp && (whatsapp?.provider === "KAPSO" ? hasCloudTemplates : true);
  const effectiveTemplatesReady =
    whatsapp?.provider === "KAPSO" ? hasCloudTemplates : hasTemplates;
  const readyCount = [
    hasBank,
    hasMercadoPago,
    whatsappReady,
    effectiveTemplatesReady,
  ].filter(Boolean).length;

  return {
    id: payment?.id?.toString() || whatsapp?.id?.toString() || purpose,
    name: payment?.name || whatsapp?.name || PURPOSE_LABELS[purpose] || purpose,
    purpose,
    label: PURPOSE_LABELS[purpose] || purpose,
    description: PURPOSE_DESCRIPTIONS[purpose] || "Canal especializado.",
    paymentChannelId: payment?.id?.toString() || null,
    whatsappChannelId: whatsapp?.id?.toString() || null,
    bank: {
      ready: hasBank,
      bank: payment?.bank || "",
      beneficiary: payment?.beneficiary || "",
      account: payment?.accountNumber || "",
      clabe: payment?.clabe || "",
      card: payment?.card || "",
    },
    mercadoPago: {
      ready: hasMercadoPago,
      userId: payment?.mpUserId || "",
    },
    whatsapp: {
      ready: whatsappReady,
      phone: whatsapp?.phone || "",
      active: Boolean(whatsapp?.active),
      provider: whatsapp?.provider || "EVOLUTION",
      deliveryStrategy: whatsapp?.deliveryStrategy || "STANDARD",
      instanceName: whatsapp?.instanceName || "",
      kapsoPhoneNumberId: whatsapp?.kapsoPhoneNumberId || "",
      kapsoBusinessAccountId: whatsapp?.kapsoBusinessAccountId || "",
    },
    templates: {
      ready: effectiveTemplatesReady,
      count: principalTemplateContents.size,
      required: requiredTemplates.length,
      source: "PRINCIPAL",
    },
    readyCount,
    usesPrincipalFallback: readyCount < 4,
  };
};

export async function channelsOverviewRoutes(server: FastifyInstance) {
  server.post(
    "/",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const data = specializedChannelSchema.parse(request.body);
        const existing = await server.storePrisma.$transaction([
          server.storePrisma.paymentChannel.count({
            where: { purpose: data.purpose },
          }),
          server.storePrisma.whatsappChannel.count({
            where: { purpose: data.purpose },
          }),
        ]);

        if (existing.some((count) => count > 0)) {
          return reply.status(409).send({
            message: "Ya existe un canal especializado para este propósito",
          });
        }

        const hasBankDetails = Boolean(data.bank && data.beneficiary);
        const result = await server.storePrisma.$transaction(async (tx) => {
          const payment = hasBankDetails
            ? await tx.paymentChannel.create({
                data: {
                  name: data.name,
                  purpose: data.purpose,
                  bank: data.bank,
                  beneficiary: data.beneficiary,
                  accountNumber: data.accountNumber || null,
                  clabe: data.clabe || null,
                  card: data.card || null,
                },
              })
            : null;

          const whatsapp = await tx.whatsappChannel.create({
            data: {
              name: data.name,
              purpose: data.purpose,
              phone: data.phone,
              active: data.active,
              provider: data.provider,
              deliveryStrategy: data.deliveryStrategy,
              instanceName: data.instanceName || null,
              kapsoPhoneNumberId: data.kapsoPhoneNumberId || null,
              kapsoBusinessAccountId: data.kapsoBusinessAccountId || null,
              template: "",
              updated_at: new Date(),
            },
            include: { templates: true },
          });

          return { payment, whatsapp };
        });

        return reply.status(201).send(result);
      } catch (error: any) {
        if (error?.issues) {
          return reply.status(400).send({
            message: "Validation error",
            errors: error.issues,
          });
        }
        throw error;
      }
    },
  );

  server.get(
    "/overview",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      try {
        const [
          settings,
          paymentChannels,
          whatsappChannels,
          principalCloudTemplates,
        ] = await Promise.all([
          server.storePrisma.setting.findMany({
            where: {
              key: {
                in: [
                  "bank_main_name",
                  "bank_main_beneficiary",
                  "bank_main_account",
                  "bank_main_clabe",
                  "bank_main_card",
                  "mp_seller_access_token",
                  "mp_seller_user_id",
                  "whatsapp_evolution_url",
                  "whatsapp_evolution_key",
                  "whatsapp_evolution_instance",
                  "whatsapp_main_phone",
                  "whatsapp_main_provider",
                  "whatsapp_kapso_delivery_enabled",
                  "whatsapp_main_kapso_phone_number_id",
                  "whatsapp_main_kapso_business_account_id",
                  "whatsapp_global_store_res",
                  "whatsapp_global_store_rel",
                  "whatsapp_global_store_pay",
                  "whatsapp_global_store_refunded",
                  "whatsapp_global_store_payment_recovery",
                  "whatsapp_global_store_restored",
                  "whatsapp_global_store_reminder",
                  "whatsapp_global_raffle_res",
                  "whatsapp_global_raffle_restored",
                  "whatsapp_global_raffle_rel",
                  "whatsapp_global_raffle_pay",
                  "whatsapp_global_raffle_refunded",
                  "whatsapp_global_raffle_payment_recovery",
                  "whatsapp_global_raffle_reminder",
                  "whatsapp_global_raffle_opening",
                  "whatsapp_global_raffle_draw_reminder",
                  "whatsapp_global_raffle_invitation",
                  "whatsapp_global_raffle_winner",
                  "whatsapp_global_raffle_results",
                  "whatsapp_global_marketing_subscribed",
                  "whatsapp_global_marketing_unsubscribed",
                ],
              },
            },
          }),
          server.storePrisma.paymentChannel.findMany(),
          server.storePrisma.whatsappChannel.findMany({
            include: { cloudTemplates: true },
          }),
          server.storePrisma.whatsappCloudTemplate.findMany({
            where: { ownerKey: "principal" },
          }),
        ]);
        const principalUsesKapso =
          getSetting(settings, "whatsapp_main_provider") === "KAPSO";
        const principalCanonicalSources = CLOUD_TEMPLATE_SETTING_KEYS.map(
          (item) => ({
            ...item,
            content: getSetting(settings, item.key),
          }),
        );
        const principalCloudReady =
          principalCanonicalSources.length ===
            CLOUD_TEMPLATE_SETTING_KEYS.length &&
          principalCanonicalSources.every(
            (source) =>
              Boolean(source.content) &&
              principalCloudTemplates.some(
                (template) =>
                  template.scope === source.scope &&
                  template.type === source.type &&
                  template.status === "APPROVED" &&
                  template.contentHash ===
                    getCloudTemplateContentHash(source.content),
              ),
          );

        const principal = {
          id: "principal",
          name: "Canal Principal",
          purpose: "PRINCIPAL",
          bank: {
            ready: Boolean(
              getSetting(settings, "bank_main_name") &&
              getSetting(settings, "bank_main_beneficiary"),
            ),
            bank: getSetting(settings, "bank_main_name"),
            beneficiary: getSetting(settings, "bank_main_beneficiary"),
            account: getSetting(settings, "bank_main_account"),
            clabe: getSetting(settings, "bank_main_clabe"),
            card: getSetting(settings, "bank_main_card"),
          },
          mercadoPago: {
            ready: Boolean(getSetting(settings, "mp_seller_access_token")),
            userId: getSetting(settings, "mp_seller_user_id"),
          },
          whatsapp: {
            ready: Boolean(
              getSetting(settings, "whatsapp_main_phone") &&
              (getSetting(settings, "whatsapp_main_provider") === "KAPSO"
                ? getSetting(settings, "whatsapp_main_kapso_phone_number_id") &&
                  getSetting(
                    settings,
                    "whatsapp_main_kapso_business_account_id",
                  ) &&
                  principalCloudReady
                : getSetting(settings, "whatsapp_evolution_instance")),
            ),
            phone: getSetting(settings, "whatsapp_main_phone"),
            provider:
              getSetting(settings, "whatsapp_main_provider") || "EVOLUTION",
            instanceName: getSetting(settings, "whatsapp_evolution_instance"),
            kapsoPhoneNumberId: getSetting(
              settings,
              "whatsapp_main_kapso_phone_number_id",
            ),
            kapsoBusinessAccountId: getSetting(
              settings,
              "whatsapp_main_kapso_business_account_id",
            ),
          },
          deliveryPolicy: {
            kapsoEnabled: isKapsoTenantDeliveryEnabled(
              getSetting(settings, "whatsapp_kapso_delivery_enabled"),
            ),
          },
          templates: {
            ready: principalUsesKapso
              ? principalCloudReady
              : Boolean(
                  getSetting(settings, "whatsapp_global_store_res") ||
                  getSetting(settings, "whatsapp_global_store_rel") ||
                  getSetting(settings, "whatsapp_global_store_pay") ||
                  getSetting(settings, "whatsapp_global_store_refunded") ||
                  getSetting(
                    settings,
                    "whatsapp_global_store_payment_recovery",
                  ) ||
                  getSetting(settings, "whatsapp_global_store_restored") ||
                  getSetting(settings, "whatsapp_global_store_reminder") ||
                  getSetting(settings, "whatsapp_global_raffle_res") ||
                  getSetting(settings, "whatsapp_global_raffle_restored") ||
                  getSetting(settings, "whatsapp_global_raffle_rel") ||
                  getSetting(settings, "whatsapp_global_raffle_pay") ||
                  getSetting(settings, "whatsapp_global_raffle_refunded") ||
                  getSetting(
                    settings,
                    "whatsapp_global_raffle_payment_recovery",
                  ) ||
                  getSetting(settings, "whatsapp_global_raffle_reminder") ||
                  getSetting(settings, "whatsapp_global_raffle_opening") ||
                  getSetting(settings, "whatsapp_global_raffle_draw_reminder") ||
                  getSetting(settings, "whatsapp_global_raffle_invitation") ||
                  getSetting(settings, "whatsapp_global_raffle_winner") ||
                  getSetting(settings, "whatsapp_global_raffle_results"),
                ),
            storeCount: [
              getSetting(settings, "whatsapp_global_store_res"),
              getSetting(settings, "whatsapp_global_store_rel"),
              getSetting(settings, "whatsapp_global_store_pay"),
              getSetting(settings, "whatsapp_global_store_refunded"),
              getSetting(settings, "whatsapp_global_store_payment_recovery"),
              getSetting(settings, "whatsapp_global_store_restored"),
              getSetting(settings, "whatsapp_global_store_reminder"),
            ].filter(Boolean).length,
            raffleCount: [
              getSetting(settings, "whatsapp_global_raffle_res"),
              getSetting(settings, "whatsapp_global_raffle_restored"),
              getSetting(settings, "whatsapp_global_raffle_rel"),
              getSetting(settings, "whatsapp_global_raffle_pay"),
              getSetting(settings, "whatsapp_global_raffle_refunded"),
              getSetting(settings, "whatsapp_global_raffle_payment_recovery"),
              getSetting(settings, "whatsapp_global_raffle_reminder"),
              getSetting(settings, "whatsapp_global_raffle_opening"),
              getSetting(settings, "whatsapp_global_raffle_draw_reminder"),
              getSetting(settings, "whatsapp_global_raffle_invitation"),
              getSetting(settings, "whatsapp_global_raffle_winner"),
              getSetting(settings, "whatsapp_global_raffle_results"),
            ].filter(Boolean).length,
          },
        };

        const principalReadyCount = [
          principal.bank.ready,
          principal.mercadoPago.ready,
          principal.whatsapp.ready,
          principal.templates.ready,
        ].filter(Boolean).length;

        const purposes = Array.from(
          new Set([
            ...paymentChannels.map((channel) => channel.purpose),
            ...whatsappChannels.map((channel) => channel.purpose),
          ]),
        ).filter(Boolean);

        const specialized = purposes.map((purpose) => {
          const payment = paymentChannels.find(
            (channel) => channel.purpose === purpose,
          );
          const whatsapp = whatsappChannels.find(
            (channel) => channel.purpose === purpose,
          );
          return buildSpecializedChannel(
            purpose,
            payment,
            whatsapp,
            getPrincipalTemplateContents(purpose, settings),
          );
        });

        const hasPurpose = (purpose: string) =>
          specialized.some((channel) => channel.purpose === purpose);

        return {
          principal: {
            ...principal,
            readyCount: principalReadyCount,
          },
          specialized,
          metrics: {
            specializedCount: specialized.length,
            whatsappRoutes:
              specialized.filter((channel) => channel.whatsapp.ready).length +
              (principal.whatsapp.ready ? 1 : 0),
            mercadoPagoRoutes:
              specialized.filter((channel) => channel.mercadoPago.ready)
                .length + (principal.mercadoPago.ready ? 1 : 0),
          },
          deliveryMatrix: [
            {
              flow: "Tienda general",
              route: "Canal Principal",
              detail: "Ordenes mixtas y articulos",
            },
            {
              flow: "Aves de combate",
              route: hasPurpose("COMBAT")
                ? "Canal de Combate"
                : "Canal Principal",
              detail: PURPOSE_DESCRIPTIONS.COMBAT,
            },
            {
              flow: "Aves de cria",
              route: hasPurpose("BREEDING")
                ? "Canal de Cria"
                : "Canal Principal",
              detail: PURPOSE_DESCRIPTIONS.BREEDING,
            },
            {
              flow: "Rifas",
              route: hasPurpose("RAFFLES")
                ? "Canal de Rifas"
                : "Canal Principal",
              detail: PURPOSE_DESCRIPTIONS.RAFFLES,
            },
          ],
        };
      } catch (error: any) {
        if (error?.issues) {
          return reply
            .status(400)
            .send({ message: "Validation error", errors: error.issues });
        }
        throw error;
      }
    },
  );

  server.delete(
    "/:purpose",
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const purpose = String(
        (request.params as { purpose?: string }).purpose || "",
      ).toUpperCase();

      if (!["COMBAT", "BREEDING", "RAFFLES"].includes(purpose)) {
        return reply
          .status(400)
          .send({ message: "Propósito de canal no válido" });
      }

      const [paymentChannels, whatsappChannels] =
        await server.storePrisma.$transaction([
          server.storePrisma.paymentChannel.deleteMany({ where: { purpose } }),
          server.storePrisma.whatsappChannel.deleteMany({ where: { purpose } }),
        ]);

      return {
        success: true,
        deleted: {
          paymentChannels: paymentChannels.count,
          whatsappChannels: whatsappChannels.count,
        },
      };
    },
  );
}
