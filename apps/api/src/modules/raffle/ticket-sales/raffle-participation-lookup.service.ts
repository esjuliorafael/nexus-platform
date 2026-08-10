import { createHash } from "node:crypto";
import type { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import { storePrisma as defaultStorePrisma } from "@nexus/db/store";
type StorePrismaClient = typeof defaultStorePrisma;
import { normalizeCustomerPhone, customerPhoneCandidates } from "../../../utils/customer-phone";
import { getEvolutionConfigFromSettings } from "../../../services/evolution/evolution.config";
import { sendWhatsappAndLog } from "../../../services/whatsapp/whatsapp-send.service";
import { getApprovedCloudTemplate } from "../../../services/whatsapp/whatsapp-cloud-template.service";
import { getKapsoConfigForChannel, isKapsoDeliveryEnabled } from "../../../services/kapso/kapso.config";
import { createRaffleParticipationAccess } from "./raffle-participation-access.service";

const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

async function sendLookupNotification(params: {
  storePrisma: StorePrismaClient;
  recipientPhone: string;
  participationUrl: string;
}) {
  const evolution = await getEvolutionConfigFromSettings();
  const principalInstance = await params.storePrisma.setting.findUnique({
    where: { key: "whatsapp_evolution_instance" },
    select: { value: true },
  });
  const channels = await params.storePrisma.whatsappChannel.findMany({
    where: {
      active: true,
      purpose: { in: ["RAFFLES", "PRINCIPAL", "MAIN"] },
      OR: [
        { evolutionUrl: { not: null }, evolutionKey: { not: null } },
        { kapsoPhoneNumberId: { not: null }, kapsoBusinessAccountId: { not: null } },
      ],
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      purpose: true,
      instanceName: true,
      evolutionUrl: true,
      evolutionKey: true,
      kapsoPhoneNumberId: true,
      kapsoBusinessAccountId: true,
    },
  });
  const channel = channels.find((item) => item.instanceName?.toLowerCase().includes("raffle")) || channels[0];

  const lookupContent =
    (await params.storePrisma.setting.findUnique({
      where: { key: "whatsapp_global_raffle_participation_lookup_simplified" },
      select: { value: true },
    }))?.value?.trim() ||
    "🔎 Recibimos tu solicitud para consultar tus participaciones.\n\nConsulta tus boletos y su estado desde el botón Ver participación:\n\n{{participation_url}}";

  const sendWithKapso = async (
    owner: { kind: "principal" } | { kind: "channel"; channelId: number; purpose: string },
    phoneNumberId: string,
    businessAccountId: string,
  ) => {
    if (!isKapsoDeliveryEnabled()) return false;
    const config = getKapsoConfigForChannel({ phoneNumberId, businessAccountId });
    if (!config) return false;
    const approved = await getApprovedCloudTemplate({
      owner,
      config,
      scope: "RAFFLES",
      type: "PARTICIPATION_LOOKUP_CODE",
      sourceContent: lookupContent,
      values: { participation_url: params.participationUrl },
      variant: "SIMPLIFIED",
    });
    if (!approved) return false;
    await sendWhatsappAndLog({
      transport: { provider: "KAPSO", config },
      recipientPhone: params.recipientPhone,
      message: {
        text: `Consulta tus participaciones aquí: ${params.participationUrl}`,
        cloudTemplate: approved.message,
      },
      templateName: "participation_lookup",
      routing: {
        route: owner.kind === "channel" ? "DIRECT" : "PRINCIPAL_FALLBACK",
        preferredInstanceName:
          owner.kind === "channel" ? channel?.instanceName || undefined : "principal",
        policyClass: "OPERATIONAL",
        providerPriority: ["KAPSO", "EVOLUTION"],
        metaBilling: {
          category: "UTILITY",
          market: "UNKNOWN",
          rateMxn: null,
          estimatedChargeMxn: null,
          rateCardVersion: "2026-08-08",
          status: "REFERENCE_RATE_UNAVAILABLE",
        },
      },
    });
    return true;
  };

  if (channel?.kapsoPhoneNumberId && channel.kapsoBusinessAccountId) {
    try {
      if (
        await sendWithKapso(
          { kind: "channel", channelId: channel.id, purpose: channel.purpose },
          channel.kapsoPhoneNumberId,
          channel.kapsoBusinessAccountId,
        )
      ) return;
    } catch (error) {
      console.error("[Raffle participation lookup] Kapso channel delivery failed:", error);
    }
  }

  const principalPhoneNumberId = (
    await params.storePrisma.setting.findUnique({
      where: { key: "whatsapp_main_kapso_phone_number_id" },
      select: { value: true },
    })
  )?.value?.trim();
  const principalBusinessAccountId = (
    await params.storePrisma.setting.findUnique({
      where: { key: "whatsapp_main_kapso_business_account_id" },
      select: { value: true },
    })
  )?.value?.trim();
  if (principalPhoneNumberId && principalBusinessAccountId) {
    try {
      if (
        await sendWithKapso(
          { kind: "principal" },
          principalPhoneNumberId,
          principalBusinessAccountId,
        )
      ) return;
    } catch (error) {
      console.error("[Raffle participation lookup] Kapso principal delivery failed:", error);
    }
  }

  const instance = channel?.instanceName && channel.evolutionUrl && channel.evolutionKey
    ? {
        instanceName: channel.instanceName,
        baseUrl: channel.evolutionUrl,
        apiKey: channel.evolutionKey,
      }
    : evolution.baseUrl && evolution.apiKey
      ? { ...evolution, instanceName: principalInstance?.value || "principal" }
      : null;

  if (!instance) {
    throw Object.assign(new Error("No hay un canal de WhatsApp disponible para enviar el código."), {
      statusCode: 503,
      code: "LOOKUP_DELIVERY_UNAVAILABLE",
    });
  }

  await sendWhatsappAndLog({
    transport: { provider: "EVOLUTION", instance },
    recipientPhone: params.recipientPhone,
    message: {
      text: `Consulta tus participaciones aquí: ${params.participationUrl}`,
    },
    templateName: "participation_lookup",
    routing: {
      route: "DIRECT",
      preferredInstanceName: instance.instanceName,
      policyClass: "OPERATIONAL",
      providerPriority: ["EVOLUTION"],
    },
  });
}

export async function requestParticipationLookup(params: {
  rafflePrisma: RafflePrismaClient;
  storePrisma: StorePrismaClient;
  raffleId: number;
  phone: string;
}) {
  const normalizedPhone = normalizeCustomerPhone(params.phone);
  if (!normalizedPhone) throw Object.assign(new Error("El número de WhatsApp no es válido."), { statusCode: 400 });

  const hasParticipation = Boolean(await params.rafflePrisma.ticketSale.findFirst({
    where: { raffleId: params.raffleId, customerPhone: { in: customerPhoneCandidates(normalizedPhone) } },
    select: { id: true },
  }));

  // Do not disclose whether the phone exists. The delivery side is only attempted
  // for known participants, while the API keeps the same public response shape.
  const genericResponse = {
    accepted: true,
    message: "Si encontramos una participación, recibirás un enlace por WhatsApp.",
  };
  if (!hasParticipation) return genericResponse;

  const access = await createParticipationLookupAccess({
    rafflePrisma: params.rafflePrisma,
    raffleId: params.raffleId,
    phone: normalizedPhone,
  });
  if (!access) return genericResponse;

  try {
    await sendLookupNotification({
      storePrisma: params.storePrisma,
      recipientPhone: normalizedPhone,
      participationUrl: access.url,
    });
  } catch (error) {
    console.error("[Raffle participation lookup] Could not deliver participation link:", error);
  }
  return genericResponse;
}

// Kept temporarily for clients that may still have the previous two-step UI.
// The storefront no longer calls this endpoint; new lookups use the direct
// WhatsApp-link flow above.
export async function verifyParticipationLookup(params: {
  rafflePrisma: RafflePrismaClient;
  raffleId: number;
  phone: string;
  code: string;
}): Promise<{ phone: string } | null> {
  return null;
}

export async function createParticipationLookupAccess(params: {
  rafflePrisma: RafflePrismaClient;
  raffleId: number;
  phone: string;
}) {
  const normalizedPhone = normalizeCustomerPhone(params.phone);
  if (!normalizedPhone) return null;
  return createRaffleParticipationAccess({
    rafflePrisma: params.rafflePrisma,
    raffleId: params.raffleId,
    participationId: `lookup-${hash(normalizedPhone)}`,
    phone: normalizedPhone,
  });
}
