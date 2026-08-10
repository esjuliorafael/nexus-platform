import { createHash, randomInt } from "node:crypto";
import type { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import { storePrisma as defaultStorePrisma } from "@nexus/db/store";
type StorePrismaClient = typeof defaultStorePrisma;
import { normalizeCustomerPhone, customerPhoneCandidates } from "../../../utils/customer-phone";
import { getEvolutionConfigFromSettings } from "../../../services/evolution/evolution.config";
import { sendWhatsappAndLog } from "../../../services/whatsapp/whatsapp-send.service";
import { getApprovedCloudTemplate } from "../../../services/whatsapp/whatsapp-cloud-template.service";
import { getKapsoConfigForChannel, isKapsoDeliveryEnabled } from "../../../services/kapso/kapso.config";
import { createRaffleParticipationAccess } from "./raffle-participation-access.service";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

function createCode() {
  return String(randomInt(100000, 1000000));
}

async function sendLookupCode(params: {
  storePrisma: StorePrismaClient;
  recipientPhone: string;
  code: string;
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
      where: { key: "whatsapp_global_raffle_participation_lookup_code_simplified" },
      select: { value: true },
    }))?.value?.trim() ||
    "Tu c\u00f3digo de consulta es {{verification_code}}.\n\nEste c\u00f3digo vence en 10 minutos. Si no solicitaste esta consulta, puedes ignorar este mensaje.";

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
      values: { verification_code: params.code },
      variant: "SIMPLIFIED",
    });
    if (!approved) return false;
    await sendWhatsappAndLog({
      transport: { provider: "KAPSO", config },
      recipientPhone: params.recipientPhone,
      message: {
        text: `C\u00f3digo de consulta de tu participaci\u00f3n: ${params.code}`,
        cloudTemplate: approved.message,
      },
      templateName: "participation_lookup_code",
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
      text: `Código de consulta de tu participación: ${params.code}\n\nEste código vence en 10 minutos. Si no solicitaste esta consulta, puedes ignorar este mensaje.`,
    },
    templateName: "participation_lookup_code",
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
  if (!hasParticipation) return { accepted: true };

  const code = createCode();
  await params.rafflePrisma.raffleParticipationLookupChallenge.create({
    data: {
      raffleId: params.raffleId,
      phoneHash: hash(normalizedPhone),
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  try {
    await sendLookupCode({ storePrisma: params.storePrisma, recipientPhone: normalizedPhone, code });
  } catch (error) {
    console.error("[Raffle participation lookup] Could not deliver verification code:", error);
  }
  return { accepted: true };
}

export async function verifyParticipationLookup(params: {
  rafflePrisma: RafflePrismaClient;
  raffleId: number;
  phone: string;
  code: string;
}) {
  const normalizedPhone = normalizeCustomerPhone(params.phone);
  if (!normalizedPhone || !/^\d{6}$/.test(params.code)) return null;
  const challenge = await params.rafflePrisma.raffleParticipationLookupChallenge.findFirst({
    where: {
      raffleId: params.raffleId,
      phoneHash: hash(normalizedPhone),
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return null;

  if (challenge.codeHash !== hash(params.code)) {
    await params.rafflePrisma.raffleParticipationLookupChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  await params.rafflePrisma.raffleParticipationLookupChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  return { phone: normalizedPhone };
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
