import {
  Prisma,
  PrismaClient as RafflePrismaClient,
  RaffleParticipantCouponPurpose,
  RaffleResultCampaignStatus,
  RaffleResultRecipientStatus,
} from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import { whatsappQueue } from "../../../queues/whatsapp.queue";
import type { AuditActor } from "../../../utils/admin-authorization";
import { raffleAudienceService } from "../intelligence/raffle-audience.service";
import { deriveRaffleResultCampaignStatus } from "./raffle-result-communication.utils";

const TEMPLATE_KEY = "whatsapp_global_raffle_participant_coupon";
const MAX_MESSAGE_LENGTH = 280;
const MAX_INSTRUCTIONS_LENGTH = 240;

const DEFAULT_INSTRUCTIONS = (coupon: {
  minTickets: number | null;
}) => {
  if (coupon.minTickets && coupon.minTickets > 1) {
    return `Úsalo al finalizar una participación de al menos ${coupon.minTickets} boletos.`;
  }
  return "Úsalo al finalizar tu próxima participación.";
};

const formatDiscount = (coupon: {
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: unknown;
}) => {
  const value = Number(coupon.discountValue || 0);
  if (coupon.discountType === "PERCENTAGE") return `${value}%`;
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatExpiration = (expiresAt: Date | null) =>
  expiresAt
    ? expiresAt.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Mexico_City",
      })
    : "sin fecha de vencimiento";

async function resolveTemplate(storePrisma: StorePrismaClient) {
  const settings = await storePrisma.setting.findMany({
    where: { key: { in: [TEMPLATE_KEY, `${TEMPLATE_KEY}_simplified`] } },
    select: { key: true, value: true },
  });
  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  const content =
    byKey.get(TEMPLATE_KEY)?.trim() ||
    byKey.get(`${TEMPLATE_KEY}_simplified`)?.trim() ||
    "";
  if (!content) throw new Error("RAFFLE_PARTICIPANT_COUPON_TEMPLATE_MISSING");
  return { templateContent: content, principalTemplateContent: content };
}

async function getEligibleCoupons(
  rafflePrisma: RafflePrismaClient,
  raffleId: number,
) {
  const now = new Date();
  const coupons = await rafflePrisma.raffleCoupon.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ raffleId: null }, { raffleId }] },
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
  });
  return coupons.filter(
    (coupon) => coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit,
  );
}

const serializeCoupon = (coupon: any) => ({
  id: String(coupon.id),
  code: coupon.code,
  name: coupon.name,
  discountType: coupon.discountType,
  discountValue: Number(coupon.discountValue || 0),
  minTickets: coupon.minTickets,
  maxDiscount: coupon.maxDiscount === null ? null : Number(coupon.maxDiscount || 0),
  usageLimit: coupon.usageLimit,
  usedCount: coupon.usedCount,
  availableUses:
    coupon.usageLimit === null
      ? null
      : Math.max(0, coupon.usageLimit - coupon.usedCount),
  expiresAt: coupon.expiresAt,
  raffleId: coupon.raffleId,
});

const selectionInput = (raffleId: number) => ({
  rules: { minPaidParticipations: 1, paidInRaffleId: raffleId },
  frequencyWindowDays: 0,
});

const refreshCampaign = async (
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
) => {
  const grouped = await rafflePrisma.raffleParticipantCouponRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { _all: true },
  });
  const count = (status: RaffleResultRecipientStatus) =>
    grouped.find((group) => group.status === status)?._count._all || 0;
  const sentCount = count(RaffleResultRecipientStatus.SENT);
  const failedCount = count(RaffleResultRecipientStatus.FAILED);
  const processingCount =
    count(RaffleResultRecipientStatus.PENDING) +
    count(RaffleResultRecipientStatus.PROCESSING);
  return rafflePrisma.raffleParticipantCouponCampaign.update({
    where: { id: campaignId },
    data: {
      status: deriveRaffleResultCampaignStatus({
        sentCount,
        failedCount,
        processingCount,
      }),
      totalRecipients: sentCount + failedCount + processingCount,
      sentCount,
      failedCount,
      completedAt: processingCount === 0 ? new Date() : null,
    },
  });
};

export async function refreshRaffleParticipantCouponCampaign(
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
) {
  return refreshCampaign(rafflePrisma, campaignId);
}

async function enqueueRecipients(
  rafflePrisma: RafflePrismaClient,
  recipientIds: string[],
) {
  for (const recipientId of recipientIds) {
    const recipient = await rafflePrisma.raffleParticipantCouponRecipient.findUnique({
      where: { id: recipientId },
      select: { id: true, phone: true, attempts: true },
    });
    if (!recipient) continue;
    await whatsappQueue.add(
      "raffle-participant-coupon",
      {
        kind: "raffle-participant-coupon",
        campaignRecipientId: recipient.id,
        recipientPhone: recipient.phone,
      },
      {
        jobId: `raffle-participant-coupon-${recipient.id}-${recipient.attempts + 1}`,
      },
    );
  }
}

const campaignView = async (
  rafflePrisma: RafflePrismaClient,
  campaignId: string,
) =>
  rafflePrisma.raffleParticipantCouponCampaign.findUnique({
    where: { id: campaignId },
    include: {
      coupon: true,
      recipients: { orderBy: { customerName: "asc" } },
    },
  });

export const raffleParticipantCouponService = {
  async getOverview(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
  ) {
    const raffle = await rafflePrisma.raffle.findUnique({
      where: { id: raffleId },
      select: { id: true, title: true },
    });
    if (!raffle) return null;
    const [selection, coupons, templateConfigured, campaigns] = await Promise.all([
      raffleAudienceService.selectEligible(
        rafflePrisma,
        storePrisma,
        selectionInput(raffleId),
      ),
      getEligibleCoupons(rafflePrisma, raffleId),
      resolveTemplate(storePrisma)
        .then(() => true)
        .catch((error) =>
          error?.message === "RAFFLE_PARTICIPANT_COUPON_TEMPLATE_MISSING"
            ? false
            : Promise.reject(error),
        ),
      rafflePrisma.raffleParticipantCouponCampaign.findMany({
        where: { raffleId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true },
      }),
    ]);
    return {
      raffleId,
      templateConfigured,
      preview: { summary: selection.summary, sample: selection.sample },
      coupons: coupons.map(serializeCoupon),
      campaigns: (
        await Promise.all(campaigns.map((campaign) => campaignView(rafflePrisma, campaign.id)))
      ).filter(Boolean),
    };
  },

  async createCampaign(
    rafflePrisma: RafflePrismaClient,
    storePrisma: StorePrismaClient,
    raffleId: number,
    input: {
      couponId: number;
      purpose: RaffleParticipantCouponPurpose;
      message: string;
      instructions?: string;
    },
    actor: AuditActor,
  ) {
    const [raffle, coupon, templates] = await Promise.all([
      rafflePrisma.raffle.findUnique({
        where: { id: raffleId },
        select: { id: true, title: true },
      }),
      rafflePrisma.raffleCoupon.findUnique({ where: { id: input.couponId } }),
      resolveTemplate(storePrisma),
    ]);
    if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
    if (!coupon || (coupon.raffleId !== null && coupon.raffleId !== raffleId)) {
      throw new Error("RAFFLE_PARTICIPANT_COUPON_NOT_AVAILABLE");
    }
    const now = new Date();
    if (!coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt <= now)) {
      throw new Error("RAFFLE_PARTICIPANT_COUPON_NOT_AVAILABLE");
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new Error("RAFFLE_PARTICIPANT_COUPON_EXHAUSTED");
    }
    const message = input.message.trim();
    const instructions = input.instructions?.trim() || DEFAULT_INSTRUCTIONS(coupon);
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      throw new Error("RAFFLE_PARTICIPANT_COUPON_MESSAGE_INVALID");
    }
    if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      throw new Error("RAFFLE_PARTICIPANT_COUPON_INSTRUCTIONS_INVALID");
    }
    const selection = await raffleAudienceService.selectEligible(
      rafflePrisma,
      storePrisma,
      selectionInput(raffleId),
    );
    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit - coupon.usedCount < selection.eligible.length
    ) {
      throw new Error("RAFFLE_PARTICIPANT_COUPON_USAGE_LIMIT_LOW");
    }
    const recipients = selection.eligible.map((profile) => ({
      phone: profile.phone,
      customerName: profile.displayName,
      participationIds: [],
      payload: {
        customer_name: profile.displayName,
        raffle_name: raffle.title,
        message,
        coupon_amount: formatDiscount(coupon),
        coupon_code: coupon.code,
        instructions,
        coupon_expires_at: formatExpiration(coupon.expiresAt),
      },
      status: RaffleResultRecipientStatus.PENDING,
      lastError: null,
    }));
    const campaign = await rafflePrisma.$transaction(async (tx) => {
      const created = await tx.raffleParticipantCouponCampaign.create({
        data: {
          raffleId,
          couponId: coupon.id,
          purpose: input.purpose,
          campaignMessage: message,
          couponInstructions: instructions,
          ...templates,
          status: recipients.length
            ? RaffleResultCampaignStatus.QUEUED
            : RaffleResultCampaignStatus.EMPTY,
          totalRecipients: recipients.length,
          completedAt: recipients.length ? null : new Date(),
          initiatedByUserId: actor.userId ?? null,
          initiatedByName: actor.name,
          initiatedByRole: actor.role ?? null,
          recipients: {
            create: recipients.map((recipient) => ({
              ...recipient,
              payload: recipient.payload as Prisma.InputJsonValue,
            })),
          },
        },
        include: { recipients: true },
      });
      await tx.raffleResultEvent.create({
        data: {
          raffleId,
          eventType: "PARTICIPANT_COUPON_QUEUED",
          message: `Se preparó una campaña de cupón para ${recipients.length} participante(s).`,
          metadata: {
            campaignId: created.id,
            couponId: coupon.id,
            purpose: input.purpose,
            totalRecipients: recipients.length,
          },
        },
      });
      return created;
    });
    await enqueueRecipients(rafflePrisma, campaign.recipients.map((item) => item.id));
    return refreshCampaign(rafflePrisma, campaign.id);
  },

  async retryFailed(
    rafflePrisma: RafflePrismaClient,
    raffleId: number,
    campaignId: string,
  ) {
    const campaign = await rafflePrisma.raffleParticipantCouponCampaign.findFirst({
      where: { id: campaignId, raffleId },
      include: { recipients: true },
    });
    if (!campaign) throw new Error("RAFFLE_PARTICIPANT_COUPON_CAMPAIGN_NOT_FOUND");
    const failed = campaign.recipients.filter(
      (recipient) => recipient.status === RaffleResultRecipientStatus.FAILED,
    );
    if (!failed.length) throw new Error("NO_RETRYABLE_RECIPIENTS");
    await enqueueRecipients(rafflePrisma, failed.map((recipient) => recipient.id));
    await rafflePrisma.raffleParticipantCouponRecipient.updateMany({
      where: { id: { in: failed.map((recipient) => recipient.id) } },
      data: { status: RaffleResultRecipientStatus.PENDING, lastError: null },
    });
    return refreshCampaign(rafflePrisma, campaign.id);
  },
};

export const raffleParticipantCouponLimits = {
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxInstructionsLength: MAX_INSTRUCTIONS_LENGTH,
};
