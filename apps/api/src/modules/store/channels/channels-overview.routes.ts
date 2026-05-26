import { FastifyInstance } from "fastify";

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

const getSetting = (settings: Array<{ key: string; value: string | null }>, key: string) =>
  settings.find((setting) => setting.key === key)?.value || "";

const buildSpecializedChannel = (purpose: string, payment: any, whatsapp: any) => {
  const hasBank = Boolean(payment?.bank && payment?.beneficiary);
  const hasMercadoPago = Boolean(payment?.mpAccessToken);
  const hasWhatsApp = Boolean(whatsapp?.active && whatsapp?.phone);
  const hasTemplates = Boolean(whatsapp?.templates?.length);
  const readyCount = [hasBank, hasMercadoPago, hasWhatsApp, hasTemplates].filter(Boolean).length;

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
      clabe: payment?.clabe || "",
      card: payment?.card || "",
    },
    mercadoPago: {
      ready: hasMercadoPago,
      userId: payment?.mpUserId || "",
    },
    whatsapp: {
      ready: hasWhatsApp,
      phone: whatsapp?.phone || "",
      active: Boolean(whatsapp?.active),
      instanceName: whatsapp?.instanceName || "",
    },
    templates: {
      ready: hasTemplates,
      count: whatsapp?.templates?.length || 0,
    },
    readyCount,
    usesPrincipalFallback: readyCount < 4,
  };
};

export async function channelsOverviewRoutes(server: FastifyInstance) {
  server.get("/overview", { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const [settings, paymentChannels, whatsappChannels] = await Promise.all([
        server.storePrisma.setting.findMany({
          where: {
            key: {
              in: [
                "bank_main_name",
                "bank_main_beneficiary",
                "bank_main_clabe",
                "bank_main_card",
                "mp_seller_access_token",
                "mp_seller_user_id",
                "whatsapp_evolution_url",
                "whatsapp_evolution_key",
                "whatsapp_evolution_instance",
                "whatsapp_main_phone",
                "whatsapp_global_store_res",
                "whatsapp_global_store_rel",
                "whatsapp_global_store_pay",
                "whatsapp_global_raffle_res",
                "whatsapp_global_raffle_rel",
                "whatsapp_global_raffle_pay",
              ],
            },
          },
        }),
        server.storePrisma.paymentChannel.findMany(),
        server.storePrisma.whatsappChannel.findMany({ include: { templates: true } }),
      ]);

      const principal = {
        id: "principal",
        name: "Canal Principal",
        purpose: "PRINCIPAL",
        bank: {
          ready: Boolean(getSetting(settings, "bank_main_name") && getSetting(settings, "bank_main_beneficiary")),
          bank: getSetting(settings, "bank_main_name"),
          beneficiary: getSetting(settings, "bank_main_beneficiary"),
          clabe: getSetting(settings, "bank_main_clabe"),
          card: getSetting(settings, "bank_main_card"),
        },
        mercadoPago: {
          ready: Boolean(getSetting(settings, "mp_seller_access_token")),
          userId: getSetting(settings, "mp_seller_user_id"),
        },
        whatsapp: {
          ready: Boolean(
            getSetting(settings, "whatsapp_evolution_instance") &&
            getSetting(settings, "whatsapp_main_phone")
          ),
          phone: getSetting(settings, "whatsapp_main_phone"),
          instanceName: getSetting(settings, "whatsapp_evolution_instance"),
        },
        templates: {
          ready: Boolean(
            getSetting(settings, "whatsapp_global_store_res") ||
            getSetting(settings, "whatsapp_global_store_rel") ||
            getSetting(settings, "whatsapp_global_store_pay") ||
            getSetting(settings, "whatsapp_global_raffle_res") ||
            getSetting(settings, "whatsapp_global_raffle_rel") ||
            getSetting(settings, "whatsapp_global_raffle_pay")
          ),
          storeCount: [
            getSetting(settings, "whatsapp_global_store_res"),
            getSetting(settings, "whatsapp_global_store_rel"),
            getSetting(settings, "whatsapp_global_store_pay"),
          ].filter(Boolean).length,
          raffleCount: [
            getSetting(settings, "whatsapp_global_raffle_res"),
            getSetting(settings, "whatsapp_global_raffle_rel"),
            getSetting(settings, "whatsapp_global_raffle_pay"),
          ].filter(Boolean).length,
        },
      };

      const principalReadyCount = [
        principal.bank.ready,
        principal.mercadoPago.ready,
        principal.whatsapp.ready,
        principal.templates.ready,
      ].filter(Boolean).length;

      const purposes = Array.from(new Set([
        ...paymentChannels.map((channel) => channel.purpose),
        ...whatsappChannels.map((channel) => channel.purpose),
      ])).filter(Boolean);

      const specialized = purposes.map((purpose) => {
        const payment = paymentChannels.find((channel) => channel.purpose === purpose);
        const whatsapp = whatsappChannels.find((channel) => channel.purpose === purpose);
        return buildSpecializedChannel(purpose, payment, whatsapp);
      });

      const hasPurpose = (purpose: string) => specialized.some((channel) => channel.purpose === purpose);

      return {
        principal: {
          ...principal,
          readyCount: principalReadyCount,
        },
        specialized,
        metrics: {
          specializedCount: specialized.length,
          whatsappRoutes: specialized.filter((channel) => channel.whatsapp.ready).length + (principal.whatsapp.ready ? 1 : 0),
          mercadoPagoRoutes: specialized.filter((channel) => channel.mercadoPago.ready).length + (principal.mercadoPago.ready ? 1 : 0),
        },
        deliveryMatrix: [
          {
            flow: "Tienda general",
            route: "Canal Principal",
            detail: "Ordenes mixtas y articulos",
          },
          {
            flow: "Aves de combate",
            route: hasPurpose("COMBAT") ? "Canal de Combate" : "Canal Principal",
            detail: PURPOSE_DESCRIPTIONS.COMBAT,
          },
          {
            flow: "Aves de cria",
            route: hasPurpose("BREEDING") ? "Canal de Cria" : "Canal Principal",
            detail: PURPOSE_DESCRIPTIONS.BREEDING,
          },
          {
            flow: "Rifas",
            route: hasPurpose("RAFFLES") ? "Canal de Rifas" : "Canal Principal",
            detail: PURPOSE_DESCRIPTIONS.RAFFLES,
          },
        ],
      };
    } catch (error: any) {
      if (error?.issues) {
        return reply.status(400).send({ message: "Validation error", errors: error.issues });
      }
      throw error;
    }
  });
}
