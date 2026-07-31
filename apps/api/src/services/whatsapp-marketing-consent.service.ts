import {
  Prisma,
  PrismaClient,
  WhatsappMarketingConsentSource,
  WhatsappMarketingConsentStatus,
} from "@prisma/client-store";
import { normalizeCustomerPhone } from "../utils/customer-phone";

export const WHATSAPP_MARKETING_CONSENT_VERSION = "raffle_marketing_v1";
export const WHATSAPP_MARKETING_OPT_OUT_KEYWORDS = new Set([
  "BAJA",
  "DETENER",
]);
export const WHATSAPP_MARKETING_OPT_IN_KEYWORDS = new Set(["ALTA"]);

type ConsentMetadata = Prisma.InputJsonValue;

const canonicalPhone = (phone: string) => normalizeCustomerPhone(phone);

const normalizeKeyword = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

export const getWhatsappMarketingOptOutKeyword = (text: string) => {
  const keyword = normalizeKeyword(text);
  return WHATSAPP_MARKETING_OPT_OUT_KEYWORDS.has(keyword) ? keyword : null;
};

export const getWhatsappMarketingOptInKeyword = (text: string) => {
  const keyword = normalizeKeyword(text);
  return WHATSAPP_MARKETING_OPT_IN_KEYWORDS.has(keyword) ? keyword : null;
};

const writePreferenceEvent = async (
  prisma: PrismaClient,
  input: {
    phone: string;
    displayName?: string | null;
    nextStatus: WhatsappMarketingConsentStatus;
    source: WhatsappMarketingConsentSource;
    policyVersion?: string | null;
    keyword?: string | null;
    externalEventId?: string | null;
    metadata?: ConsentMetadata;
  },
) => {
  const phone = canonicalPhone(input.phone);
  if (!phone) throw new Error("INVALID_MARKETING_CONSENT_PHONE");

  return prisma.$transaction(async (tx) => {
    if (input.externalEventId) {
      const duplicate = await tx.whatsappMarketingConsentEvent.findUnique({
        where: { externalEventId: input.externalEventId },
        include: { preference: true },
      });
      if (duplicate) return { preference: duplicate.preference, changed: false };
    }

    const existing = await tx.whatsappMarketingPreference.findUnique({
      where: { phone },
    });
    const now = new Date();
    const preference = await tx.whatsappMarketingPreference.upsert({
      where: { phone },
      create: {
        phone,
        displayName: input.displayName?.trim() || null,
        status: input.nextStatus,
        consentAt:
          input.nextStatus === WhatsappMarketingConsentStatus.GRANTED
            ? now
            : null,
        consentSource:
          input.nextStatus === WhatsappMarketingConsentStatus.GRANTED
            ? input.source
            : null,
        consentVersion:
          input.nextStatus === WhatsappMarketingConsentStatus.GRANTED
            ? input.policyVersion || WHATSAPP_MARKETING_CONSENT_VERSION
            : null,
        optedOutAt:
          input.nextStatus === WhatsappMarketingConsentStatus.OPTED_OUT
            ? now
            : null,
      },
      update: {
        displayName:
          input.displayName?.trim() || existing?.displayName || null,
        status: input.nextStatus,
        consentAt:
          input.nextStatus === WhatsappMarketingConsentStatus.GRANTED
            ? now
            : existing?.consentAt,
        consentSource:
          input.nextStatus === WhatsappMarketingConsentStatus.GRANTED
            ? input.source
            : existing?.consentSource,
        consentVersion:
          input.nextStatus === WhatsappMarketingConsentStatus.GRANTED
            ? input.policyVersion || WHATSAPP_MARKETING_CONSENT_VERSION
            : existing?.consentVersion,
        optedOutAt:
          input.nextStatus === WhatsappMarketingConsentStatus.OPTED_OUT
            ? now
            : null,
      },
    });

    await tx.whatsappMarketingConsentEvent.create({
      data: {
        preferenceId: preference.id,
        previousStatus: existing?.status || null,
        nextStatus: input.nextStatus,
        source: input.source,
        policyVersion:
          input.policyVersion || WHATSAPP_MARKETING_CONSENT_VERSION,
        keyword: input.keyword || null,
        externalEventId: input.externalEventId || null,
        metadata: input.metadata,
      },
    });

    return {
      preference,
      changed: existing?.status !== input.nextStatus,
    };
  });
};

export const whatsappMarketingConsentService = {
  grant(
    prisma: PrismaClient,
    input: {
      phone: string;
      displayName?: string | null;
      source: WhatsappMarketingConsentSource;
      externalEventId?: string | null;
      keyword?: string | null;
      metadata?: ConsentMetadata;
    },
  ) {
    return writePreferenceEvent(prisma, {
      ...input,
      nextStatus: WhatsappMarketingConsentStatus.GRANTED,
      policyVersion: WHATSAPP_MARKETING_CONSENT_VERSION,
      externalEventId: input.externalEventId,
      keyword: input.keyword,
    });
  },

  optOut(
    prisma: PrismaClient,
    input: {
      phone: string;
      keyword: string;
      externalEventId?: string | null;
      metadata?: ConsentMetadata;
    },
  ) {
    return writePreferenceEvent(prisma, {
      phone: input.phone,
      nextStatus: WhatsappMarketingConsentStatus.OPTED_OUT,
      source: WhatsappMarketingConsentSource.INBOUND_KEYWORD,
      keyword: normalizeKeyword(input.keyword),
      externalEventId: input.externalEventId,
      metadata: input.metadata,
    });
  },

  async isEligible(prisma: PrismaClient, phone: string) {
    const normalized = canonicalPhone(phone);
    if (!normalized) return false;
    const preference = await prisma.whatsappMarketingPreference.findUnique({
      where: { phone: normalized },
      select: { status: true },
    });
    return preference?.status === WhatsappMarketingConsentStatus.GRANTED;
  },

  async markMarketingSent(prisma: PrismaClient, phone: string) {
    const normalized = canonicalPhone(phone);
    if (!normalized) return;
    await prisma.whatsappMarketingPreference.updateMany({
      where: {
        phone: normalized,
        status: WhatsappMarketingConsentStatus.GRANTED,
      },
      data: { lastMarketingAt: new Date() },
    });
  },
};
