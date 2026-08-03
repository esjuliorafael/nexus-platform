import type { PrismaClient as RafflePrismaClient } from "@prisma/client-raffle";
import type { PrismaClient as StorePrismaClient } from "@prisma/client-store";
import {
  getMetaRateMxn,
  getMetaRecipientMarket,
  META_RATE_CARD_VERSION,
  type MetaMessageCategory,
  type MetaRecipientMarket,
} from "./whatsapp-meta-pricing.service";

type Source = "ALL" | "STORE" | "RAFFLES";
type PaymentMethod = "ALL" | "TRANSFER" | "MERCADOPAGO";

const deliveredByCloud = (status: unknown) =>
  ["delivered", "read"].includes(String(status || "").toLowerCase());
const sentByEvolution = (status: unknown) =>
  ["sent", "delivered", "read"].includes(String(status || "").toLowerCase());

const raffleCampaignTemplates = new Set([
  "raffle_opening",
  "raffle_draw_reminder",
  "raffle_result_winner",
  "raffle_result_participants",
  "raffle_invitation",
  "raffle_payment_recovery",
]);

function getLegacyCategory(templateName: string): MetaMessageCategory {
  const name = templateName.toLowerCase();
  return name.includes("invitation") || name.includes("opening")
    ? "MARKETING"
    : "UTILITY";
}

function getSource(log: { orderId: string | null; ticketSaleId: number | null; templateUsed: string }) {
  if (log.orderId || log.templateUsed.startsWith("order_") || log.templateUsed.startsWith("store_")) {
    return "STORE" as const;
  }
  if (log.ticketSaleId || raffleCampaignTemplates.has(log.templateUsed)) {
    return "RAFFLES" as const;
  }
  return null;
}

export async function getMetaMessagingCostOverview(params: {
  storePrisma: StorePrismaClient;
  rafflePrisma: RafflePrismaClient;
  from: Date | null;
  to: Date;
  source: Source;
  paymentMethod: PaymentMethod;
}) {
  const sentAt = params.from ? { gte: params.from, lte: params.to } : { lte: params.to };
  const paymentWhere = params.paymentMethod === "ALL" ? {} : { paymentMethod: params.paymentMethod };
  const logs = await params.storePrisma.whatsappMessageLog.findMany({
    where: { sentAt },
    select: { orderId: true, ticketSaleId: true, templateUsed: true, status: true, provider: true, recipientPhone: true, responsePayload: true },
  });
  const orderIds = logs
    .map((log) => Number(log.orderId))
    .filter((id) => Number.isInteger(id) && id > 0);
  const ticketSaleIds = logs
    .map((log) => log.ticketSaleId)
    .filter((id): id is number => typeof id === "number");
  const [orders, ticketSales] = params.paymentMethod === "ALL"
    ? [[], []]
    : await Promise.all([
        params.storePrisma.order.findMany({ where: { id: { in: orderIds }, ...paymentWhere }, select: { id: true } }),
        params.rafflePrisma.ticketSale.findMany({ where: { id: { in: ticketSaleIds }, ...paymentWhere }, select: { id: true } }),
      ]);
  const allowedOrderIds = new Set(orders.map((item) => String(item.id)));
  const allowedTicketSaleIds = new Set(ticketSales.map((item) => item.id));

  let cloudDelivered = 0;
  let billable = 0;
  let exempt = 0;
  let evolution = 0;
  let unpriced = 0;
  let estimatedMxn = 0;
  const breakdown = new Map<string, { market: MetaRecipientMarket; category: MetaMessageCategory; delivered: number; estimatedMxn: number }>();

  for (const log of logs) {
    const logSource = getSource(log);
    if (!logSource || (params.source !== "ALL" && params.source !== logSource)) continue;
    const isLinkedToFilteredPayment =
      params.paymentMethod === "ALL" ||
      (log.orderId ? allowedOrderIds.has(log.orderId) :
        log.ticketSaleId != null ? allowedTicketSaleIds.has(log.ticketSaleId) : false);
    if (!isLinkedToFilteredPayment) continue;

    if (log.provider === "EVOLUTION") {
      if (sentByEvolution(log.status)) evolution += 1;
      continue;
    }
    if (log.provider !== "KAPSO" || !deliveredByCloud(log.status)) continue;
    cloudDelivered += 1;
    const billing = log.responsePayload && typeof log.responsePayload === "object"
      ? (log.responsePayload as Record<string, any>)?.nexusRouting?.metaBilling
      : null;
    if (billing?.status === "EXEMPT_CUSTOMER_SERVICE_WINDOW") {
      exempt += 1;
      continue;
    }
    const category: MetaMessageCategory = billing?.category === "MARKETING" ? "MARKETING" : billing?.category === "UTILITY" ? "UTILITY" : getLegacyCategory(log.templateUsed);
    const market: MetaRecipientMarket = ["MX", "US", "GT"].includes(billing?.market) ? billing.market : getMetaRecipientMarket(log.recipientPhone);
    const charge = typeof billing?.estimatedChargeMxn === "number" ? billing.estimatedChargeMxn : getMetaRateMxn(market, category);
    const key = `${market}:${category}`;
    const bucket = breakdown.get(key) || { market, category, delivered: 0, estimatedMxn: 0 };
    bucket.delivered += 1;
    if (typeof charge === "number") {
      billable += 1;
      estimatedMxn += charge;
      bucket.estimatedMxn += charge;
    } else {
      unpriced += 1;
    }
    breakdown.set(key, bucket);
  }

  return {
    rateCardVersion: META_RATE_CARD_VERSION,
    estimatedMxn: Number(estimatedMxn.toFixed(4)),
    cloudDelivered,
    billable,
    exempt,
    evolution,
    unpriced,
    breakdown: Array.from(breakdown.values()).map((item) => ({ ...item, estimatedMxn: Number(item.estimatedMxn.toFixed(4)) })),
  };
}
