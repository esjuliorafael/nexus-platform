import type { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import {
  getMetaRateMxn,
  getMetaRecipientMarket,
  META_RATE_CARD_VERSION,
  type MetaMessageCategory,
  type MetaRecipientMarket,
} from "../../../services/whatsapp/whatsapp-meta-pricing.service";

const isDelivered = (status: unknown) =>
  ["delivered", "read"].includes(String(status || "").toLowerCase());

function getLegacyCategory(templateName: string): MetaMessageCategory {
  const name = templateName.toLowerCase();
  return name.includes("invitation") || name.includes("opening")
    ? "MARKETING"
    : "UTILITY";
}

export async function getRaffleMetaMessagingCostOverview(params: {
  rafflePrisma: RafflePrismaClient;
  storePrisma: StorePrismaClient;
  raffleId: number;
}) {
  const [ticketSales, resultRecipients, reminderRecipients, invitationRecipients, openingSubscriptions, paymentHolds] =
    await Promise.all([
      params.rafflePrisma.ticketSale.findMany({
        where: { raffleId: params.raffleId },
        select: { id: true },
      }),
      params.rafflePrisma.raffleResultRecipient.findMany({
        where: { campaign: { raffleId: params.raffleId } },
        select: { messageLogId: true },
      }),
      params.rafflePrisma.raffleDrawReminderRecipient.findMany({
        where: { campaign: { raffleId: params.raffleId } },
        select: { messageLogId: true },
      }),
      params.rafflePrisma.raffleInvitationRecipient.findMany({
        where: { campaign: { raffleId: params.raffleId } },
        select: { messageLogId: true },
      }),
      params.rafflePrisma.raffleOpeningSubscription.findMany({
        where: { raffleId: params.raffleId },
        select: { messageLogId: true },
      }),
      params.rafflePrisma.rafflePaymentHold.findMany({
        where: { raffleId: params.raffleId },
        select: { recoveryMessageLogId: true },
      }),
    ]);

  const ticketSaleIds = ticketSales.map((sale) => sale.id);
  const campaignLogIds = [
    ...resultRecipients,
    ...reminderRecipients,
    ...invitationRecipients,
    ...openingSubscriptions,
    ...paymentHolds.map((hold) => ({ messageLogId: hold.recoveryMessageLogId })),
  ]
    .map((recipient) => recipient.messageLogId)
    .filter((id): id is number => typeof id === "number");

  const logs = await params.storePrisma.whatsappMessageLog.findMany({
    where: {
      OR: [
        { ticketSaleId: { in: ticketSaleIds } },
        { id: { in: campaignLogIds } },
      ],
      provider: "KAPSO",
    },
    select: {
      id: true,
      recipientPhone: true,
      templateUsed: true,
      status: true,
      responsePayload: true,
    },
  });

  const buckets = new Map<
    string,
    {
      country: MetaRecipientMarket;
      category: MetaMessageCategory;
      delivered: number;
      estimatedMxn: number;
      unpriced: number;
    }
  >();
  let totalDelivered = 0;
  let exempt = 0;
  let legacy = 0;

  for (const log of logs) {
    if (!isDelivered(log.status)) continue;
    totalDelivered += 1;
    const billing =
      log.responsePayload && typeof log.responsePayload === "object"
        ? (log.responsePayload as Record<string, any>)?.nexusRouting
            ?.metaBilling
        : null;
    if (billing?.status === "EXEMPT_CUSTOMER_SERVICE_WINDOW") {
      exempt += 1;
      continue;
    }
    const hasSnapshot = Boolean(billing?.rateCardVersion);
    if (!hasSnapshot) legacy += 1;
    const category: MetaMessageCategory =
      billing?.category === "MARKETING" || billing?.category === "UTILITY"
        ? billing.category
        : getLegacyCategory(log.templateUsed);
    const country: MetaRecipientMarket =
      billing?.market === "MX" || billing?.market === "US" || billing?.market === "GT"
        ? billing.market
        : getMetaRecipientMarket(log.recipientPhone);
    const key = `${country}:${category}`;
    const bucket = buckets.get(key) || {
      country,
      category,
      delivered: 0,
      estimatedMxn: 0,
      unpriced: 0,
    };
    bucket.delivered += 1;
    const estimatedCharge = hasSnapshot
      ? billing?.estimatedChargeMxn
      : getMetaRateMxn(country, category);
    if (typeof estimatedCharge === "number") bucket.estimatedMxn += estimatedCharge;
    else bucket.unpriced += 1;
    buckets.set(key, bucket);
  }

  const breakdown = Array.from(buckets.values()).map((bucket) => ({
    ...bucket,
    estimatedMxn: Number(bucket.estimatedMxn.toFixed(4)),
  }));
  const delivered = breakdown.reduce((total, item) => total + item.delivered, 0);
  const unpriced = breakdown.reduce((total, item) => total + item.unpriced, 0);
  const estimatedMxn = breakdown.reduce(
    (total, item) => total + item.estimatedMxn,
    0,
  );

  return {
    rateCardVersion: META_RATE_CARD_VERSION,
    provider: "KAPSO" as const,
    totalDelivered,
    delivered,
    exempt,
    legacy,
    unpriced,
    estimatedMxn: Number(estimatedMxn.toFixed(4)),
    breakdown,
  };
}
