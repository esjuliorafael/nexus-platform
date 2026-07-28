import { normalizeCustomerPhone } from "../../../utils/customer-phone";
import { RaffleAudienceRules } from "./raffle-audience.schema";

type RafflePrisma = any;
type StorePrisma = any;

type PaymentMethod = "TRANSFER" | "MERCADOPAGO";
type SupportedCountry = "MX" | "US" | "GT";

interface ParticipationSnapshot {
  id: string;
  raffleId: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod: PaymentMethod | null;
  ticketCount: number;
  netRevenue: number;
  createdAt: Date;
  paidAt: Date | null;
}

interface ProfileAccumulator {
  phone: string;
  displayName: string;
  state: string;
  validPhone: boolean;
  sourceRecords: number;
  sourceParticipations: number;
  participations: ParticipationSnapshot[];
  winner: boolean;
  openingSubscriber: boolean;
}

interface MarketingPreferenceSnapshot {
  phone: string;
  status: "UNKNOWN" | "GRANTED" | "OPTED_OUT";
  lastMarketingAt: Date | null;
}

export interface RaffleAudienceProfile {
  phone: string;
  displayName: string;
  state: string;
  country: SupportedCountry | null;
  validPhone: boolean;
  sourceRecords: number;
  sourceParticipations: number;
  paidParticipations: number;
  paidRaffleIds: number[];
  paidTickets: number;
  netRevenue: number;
  paymentMethods: PaymentMethod[];
  averagePaymentHours: number | null;
  paymentSpeedPercentile: number | null;
  lastPaidAt: string | null;
  lastActivityAt: string;
  winner: boolean;
  openingSubscriber: boolean;
  targetRaffleParticipant: boolean;
  consentStatus: "UNKNOWN" | "GRANTED" | "OPTED_OUT";
  lastMarketingAt: string | null;
}

const toMoney = (value: unknown) => Number.parseFloat(String(value ?? 0)) || 0;

const getCountry = (phone: string): SupportedCountry | null => {
  if (phone.startsWith("+502")) return "GT";
  if (phone.startsWith("+52")) return "MX";
  if (phone.startsWith("+1")) return "US";
  return null;
};

const participationIdFor = (sale: any) => sale.reservationId || `sale-${sale.id}`;

const normalizePaymentMethod = (value: unknown): PaymentMethod | null => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "MERCADOPAGO") return "MERCADOPAGO";
  if (normalized === "TRANSFER" || normalized === "BANK_TRANSFER") return "TRANSFER";
  return null;
};

const buildParticipation = (
  sales: any[],
  paidAt: Date | null,
): ParticipationSnapshot => {
  const first = sales[0];
  const paid = sales.every((sale) => sale.paymentStatus === "PAID");
  const pending = sales.some((sale) => sale.paymentStatus === "PENDING");
  const status = paid ? "PAID" : pending ? "PENDING" : "CANCELLED";
  const gross = sales.length * toMoney(first.raffle?.ticketPrice);
  const discount = Math.max(...sales.map((sale) => toMoney(sale.discountTotal)), 0);
  const paidAmount = Math.max(...sales.map((sale) => toMoney(sale.mpPaidAmount)), 0);
  const refunded = Math.max(...sales.map((sale) => toMoney(sale.mpRefundedAmount)), 0);
  const netRevenue = status === "PAID"
    ? Math.max(0, (paidAmount || Math.max(0, gross - discount)) - refunded)
    : 0;

  return {
    id: participationIdFor(first),
    raffleId: first.raffleId,
    status,
    paymentMethod: normalizePaymentMethod(first.paymentMethod),
    ticketCount: sales.length,
    netRevenue,
    createdAt: new Date(first.createdAt),
    paidAt,
  };
};

const matchesRules = (profile: RaffleAudienceProfile, rules: RaffleAudienceRules) => {
  if (
    rules.minPaidParticipations !== undefined
    && profile.paidParticipations < rules.minPaidParticipations
  ) return false;
  if (
    rules.paidInRaffleId !== undefined
    && !profile.paidRaffleIds.includes(rules.paidInRaffleId)
  ) return false;
  if (rules.minPaidTickets !== undefined && profile.paidTickets < rules.minPaidTickets) return false;
  if (rules.minNetRevenue !== undefined && profile.netRevenue < rules.minNetRevenue) return false;
  if (rules.maxDaysSinceLastPaid !== undefined) {
    if (!profile.lastPaidAt) return false;
    const cutoff = Date.now() - rules.maxDaysSinceLastPaid * 86_400_000;
    if (new Date(profile.lastPaidAt).getTime() < cutoff) return false;
  }
  if (rules.maxPaymentSpeedPercentile !== undefined) {
    if (
      profile.paymentSpeedPercentile === null
      || profile.paymentSpeedPercentile > rules.maxPaymentSpeedPercentile
    ) return false;
  }
  if (
    rules.paymentMethods?.length
    && !rules.paymentMethods.some((method) => profile.paymentMethods.includes(method))
  ) return false;
  if (rules.states?.length && !rules.states.includes(profile.state)) return false;
  if (
    rules.countries?.length
    && (!profile.country || !rules.countries.includes(profile.country))
  ) return false;
  if (rules.winnerOnly && !profile.winner) return false;
  if (rules.openingSubscriberOnly && !profile.openingSubscriber) return false;
  return true;
};

const assignPaymentPercentiles = (profiles: RaffleAudienceProfile[]) => {
  const ranked = profiles
    .filter((profile) => profile.averagePaymentHours !== null)
    .sort((a, b) => (a.averagePaymentHours || 0) - (b.averagePaymentHours || 0));
  ranked.forEach((profile, index) => {
    profile.paymentSpeedPercentile = Math.max(1, Math.ceil(((index + 1) / ranked.length) * 100));
  });
};

const buildProfiles = async (
  rafflePrisma: RafflePrisma,
  storePrisma: StorePrisma,
  targetRaffleId?: number,
) => {
  const [sales, paymentEvents, prizes, subscriptions] = await Promise.all([
    rafflePrisma.ticketSale.findMany({
      include: { raffle: { select: { ticketPrice: true } } },
      orderBy: { createdAt: "asc" },
    }),
    rafflePrisma.raffleParticipationEvent.findMany({
      where: { eventType: "PAYMENT_CONFIRMED" },
      select: { participationId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    rafflePrisma.rafflePrize.findMany({
      where: { winningParticipationId: { not: null } },
      select: { winningParticipationId: true },
    }),
    rafflePrisma.raffleOpeningSubscription.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { phone: true },
    }),
  ]);

  const paidAtByParticipation = new Map<string, Date>();
  for (const event of paymentEvents) {
    if (!paidAtByParticipation.has(event.participationId)) {
      paidAtByParticipation.set(event.participationId, new Date(event.createdAt));
    }
  }
  const winnerIds = new Set(prizes.map((prize: any) => prize.winningParticipationId).filter(Boolean));
  const subscriberPhones = new Set(
    subscriptions.map((subscription: any) => normalizeCustomerPhone(subscription.phone)).filter(Boolean),
  );

  const groupedSales = new Map<string, any[]>();
  for (const sale of sales) {
    const key = participationIdFor(sale);
    groupedSales.set(key, [...(groupedSales.get(key) || []), sale]);
  }

  const accumulators = new Map<string, ProfileAccumulator>();

  for (const [participationId, participationSales] of Array.from(groupedSales.entries())) {
    const first = participationSales[0];
    const phone = normalizeCustomerPhone(first.customerPhone);
    const key = phone || `invalid:${String(first.customerPhone || "").replace(/\D/g, "")}:${first.customerName}`;
    const current: ProfileAccumulator = accumulators.get(key) || {
      phone: phone || String(first.customerPhone || ""),
      displayName: first.customerName || "Sin nombre",
      state: first.customerState || "Sin estado",
      validPhone: Boolean(phone),
      sourceRecords: 0,
      sourceParticipations: 0,
      participations: [],
      winner: false,
      openingSubscriber: Boolean(phone && subscriberPhones.has(phone)),
    };
    current.displayName = first.customerName || current.displayName;
    current.state = first.customerState || current.state;
    current.sourceRecords += participationSales.length;
    current.sourceParticipations += 1;
    current.participations.push(
      buildParticipation(participationSales, paidAtByParticipation.get(participationId) || null),
    );
    current.winner ||= winnerIds.has(participationId);
    accumulators.set(key, current);
  }

  const phones = Array.from(accumulators.values())
    .filter((item) => item.validPhone)
    .map((item) => item.phone);
  const preferences = phones.length
    ? await storePrisma.whatsappMarketingPreference.findMany({
      where: { phone: { in: phones } },
      select: { phone: true, status: true, lastMarketingAt: true },
    })
    : [];
  const preferenceByPhone = new Map<string, MarketingPreferenceSnapshot>(
    preferences.map((preference: MarketingPreferenceSnapshot) => [preference.phone, preference]),
  );

  const profiles: RaffleAudienceProfile[] = Array.from(accumulators.values()).map((item) => {
    const paid = item.participations.filter((participation) => participation.status === "PAID");
    const paymentHours = paid
      .filter((participation) => participation.paidAt)
      .map((participation) => (
        (participation.paidAt!.getTime() - participation.createdAt.getTime()) / 3_600_000
      ))
      .filter((hours) => hours >= 0);
    const preference = preferenceByPhone.get(item.phone);
    const lastPaidAt = paid
      .map((participation) => participation.paidAt)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;
    const lastActivity = item.participations
      .map((participation) => participation.paidAt || participation.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      phone: item.phone,
      displayName: item.displayName,
      state: item.state,
      country: item.validPhone ? getCountry(item.phone) : null,
      validPhone: item.validPhone,
      sourceRecords: item.sourceRecords,
      sourceParticipations: item.sourceParticipations,
      paidParticipations: paid.length,
      paidRaffleIds: Array.from(new Set(paid.map((participation) => participation.raffleId))),
      paidTickets: paid.reduce((total, participation) => total + participation.ticketCount, 0),
      netRevenue: Number(paid.reduce((total, participation) => total + participation.netRevenue, 0).toFixed(2)),
      paymentMethods: Array.from(
        new Set(paid.map((participation) => participation.paymentMethod).filter(Boolean)),
      ) as PaymentMethod[],
      averagePaymentHours: paymentHours.length
        ? Number((paymentHours.reduce((total, hours) => total + hours, 0) / paymentHours.length).toFixed(2))
        : null,
      paymentSpeedPercentile: null,
      lastPaidAt: lastPaidAt?.toISOString() || null,
      lastActivityAt: lastActivity.toISOString(),
      winner: item.winner,
      openingSubscriber: item.openingSubscriber,
      targetRaffleParticipant: targetRaffleId
        ? item.participations.some((participation) => (
          participation.raffleId === targetRaffleId
          && participation.status !== "CANCELLED"
        ))
        : false,
      consentStatus: preference?.status || "UNKNOWN",
      lastMarketingAt: preference?.lastMarketingAt?.toISOString() || null,
    };
  });

  assignPaymentPercentiles(profiles);
  return profiles;
};

export const raffleAudienceService = {
  buildProfiles,
  matchesRules,

  async selectEligible(
    rafflePrisma: RafflePrisma,
    storePrisma: StorePrisma,
    input: {
      rules: RaffleAudienceRules;
      targetRaffleId?: number;
      frequencyWindowDays: number;
    },
  ) {
    const profiles = await buildProfiles(rafflePrisma, storePrisma, input.targetRaffleId);
    const matched = profiles.filter((profile) => matchesRules(profile, input.rules));
    const duplicatesRemoved = profiles.reduce(
      (total, profile) => total + Math.max(0, profile.sourceParticipations - 1),
      0,
    );
    const frequencyCutoff = Date.now() - input.frequencyWindowDays * 86_400_000;
    const exclusions = {
      noConsent: 0,
      optedOut: 0,
      invalidPhone: 0,
      alreadyParticipating: 0,
      recentlyContacted: 0,
    };
    const eligible: RaffleAudienceProfile[] = [];

    for (const profile of matched) {
      if (!profile.validPhone) exclusions.invalidPhone += 1;
      else if (profile.consentStatus === "OPTED_OUT") exclusions.optedOut += 1;
      else if (profile.consentStatus !== "GRANTED") exclusions.noConsent += 1;
      else if (profile.targetRaffleParticipant) exclusions.alreadyParticipating += 1;
      else if (
        input.frequencyWindowDays > 0
        && profile.lastMarketingAt
        && new Date(profile.lastMarketingAt).getTime() >= frequencyCutoff
      ) exclusions.recentlyContacted += 1;
      else eligible.push(profile);
    }

    return {
      summary: {
        profilesAnalyzed: profiles.length,
        duplicatesRemoved,
        audienceMatched: matched.length,
        eligible: eligible.length,
        excluded: matched.length - eligible.length,
        exclusions,
      },
      eligible,
      sample: eligible.slice(0, 25),
    };
  },

  async preview(
    rafflePrisma: RafflePrisma,
    storePrisma: StorePrisma,
    input: {
      rules: RaffleAudienceRules;
      targetRaffleId?: number;
      frequencyWindowDays: number;
    },
  ) {
    const result = await this.selectEligible(rafflePrisma, storePrisma, input);
    return {
      summary: result.summary,
      sample: result.sample,
    };
  },
};
