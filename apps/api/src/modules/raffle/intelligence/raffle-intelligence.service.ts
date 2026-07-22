import { customerPhoneIdentity } from "../../../utils/customer-phone";

type RafflePrisma = any;

export type RaffleParticipantSegment =
  | "VIP_PAYERS"
  | "REPEAT_ACTIVE"
  | "HIGH_VOLUME"
  | "PROMISING_NEW"
  | "DORMANT"
  | "NON_PAYER"
  | "LOW_ACTIVITY";

export interface RaffleIntelligenceFilters {
  search?: string;
  state?: string;
  segment?: RaffleParticipantSegment;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

interface ParticipantAccumulator {
  phone: string;
  displayName: string;
  state: string;
  raffleIds: Set<number>;
  ticketsReserved: number;
  ticketsPaid: number;
  ticketsPending: number;
  ticketsCancelled: number;
  estimatedRevenue: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface RaffleParticipantIntelligence {
  phone: string;
  displayName: string;
  state: string;
  rafflesParticipated: number;
  ticketsReserved: number;
  ticketsPaid: number;
  ticketsPending: number;
  ticketsCancelled: number;
  paymentRate: number;
  estimatedRevenue: number;
  firstSeenAt: string;
  lastSeenAt: string;
  averageTicketsPerRaffle: number;
  segment: RaffleParticipantSegment;
  score: number;
}

const normalizePhone = customerPhoneIdentity;

const daysSince = (date: Date) => {
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const toMoney = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  return Number.parseFloat(String(value)) || 0;
};

const classifyParticipant = (data: {
  rafflesParticipated: number;
  ticketsReserved: number;
  ticketsPaid: number;
  ticketsPending: number;
  ticketsCancelled: number;
  paymentRate: number;
  estimatedRevenue: number;
  lastSeenAt: Date;
}): RaffleParticipantSegment => {
  const inactiveDays = daysSince(data.lastSeenAt);
  const unpaidTickets = data.ticketsPending + data.ticketsCancelled;

  if (data.ticketsReserved >= 3 && data.ticketsPaid === 0) return "NON_PAYER";
  if (data.paymentRate < 0.25 && unpaidTickets >= 3) return "NON_PAYER";
  if (inactiveDays >= 90 && data.ticketsPaid >= 2) return "DORMANT";
  if (data.rafflesParticipated >= 3 && data.paymentRate >= 0.75) return "VIP_PAYERS";
  if (data.ticketsPaid >= 8 || data.estimatedRevenue >= 2500) return "HIGH_VOLUME";
  if (data.rafflesParticipated >= 2) return "REPEAT_ACTIVE";
  if (data.ticketsPaid >= 1 && data.ticketsReserved <= 2) return "PROMISING_NEW";
  return "LOW_ACTIVITY";
};

const scoreParticipant = (data: {
  rafflesParticipated: number;
  ticketsPaid: number;
  ticketsPending: number;
  ticketsCancelled: number;
  paymentRate: number;
  estimatedRevenue: number;
  lastSeenAt: Date;
}) => {
  const inactiveDays = daysSince(data.lastSeenAt);
  const revenueBucket = Math.min(10, Math.floor(data.estimatedRevenue / 250));
  const recencyBonus = inactiveDays <= 30 ? 18 : inactiveDays <= 60 ? 10 : inactiveDays <= 90 ? 4 : 0;
  const inactivityPenalty = inactiveDays > 120 ? 18 : inactiveDays > 90 ? 10 : 0;

  const score =
    data.ticketsPaid * 8 +
    data.rafflesParticipated * 12 +
    data.paymentRate * 40 +
    revenueBucket * 8 +
    recencyBonus -
    data.ticketsCancelled * 10 -
    data.ticketsPending * 6 -
    inactivityPenalty;

  return Math.max(0, Math.round(score));
};

const buildParticipants = async (prisma: RafflePrisma, filters: RaffleIntelligenceFilters = {}) => {
  const where: any = {};
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }

  const sales = await prisma.ticketSale.findMany({
    where,
    include: { raffle: true },
    orderBy: { createdAt: "desc" },
  });

  const participants = new Map<string, ParticipantAccumulator>();

  for (const sale of sales) {
    const normalizedPhone = normalizePhone(sale.customerPhone);
    const key = normalizedPhone || `${sale.customerName}-${sale.customerPhone}`;
    const ticketPrice = toMoney(sale.raffle?.ticketPrice);
    const createdAt = new Date(sale.createdAt);

    const current = participants.get(key) || {
      phone: normalizedPhone || sale.customerPhone || "",
      displayName: sale.customerName || "Sin nombre",
      state: sale.customerState || "Sin estado",
      raffleIds: new Set<number>(),
      ticketsReserved: 0,
      ticketsPaid: 0,
      ticketsPending: 0,
      ticketsCancelled: 0,
      estimatedRevenue: 0,
      firstSeenAt: createdAt,
      lastSeenAt: createdAt,
    };

    current.displayName = sale.customerName || current.displayName;
    current.state = sale.customerState || current.state;
    current.raffleIds.add(sale.raffleId);
    current.ticketsReserved += 1;
    if (sale.paymentStatus === "PAID") {
      current.ticketsPaid += 1;
      current.estimatedRevenue += ticketPrice;
    } else if (sale.paymentStatus === "PENDING") {
      current.ticketsPending += 1;
    } else if (sale.paymentStatus === "CANCELLED") {
      current.ticketsCancelled += 1;
    }
    if (createdAt < current.firstSeenAt) current.firstSeenAt = createdAt;
    if (createdAt > current.lastSeenAt) current.lastSeenAt = createdAt;

    participants.set(key, current);
  }

  return Array.from(participants.values()).map((participant) => {
    const rafflesParticipated = participant.raffleIds.size;
    const paymentRate = participant.ticketsReserved > 0
      ? participant.ticketsPaid / participant.ticketsReserved
      : 0;
    const segment = classifyParticipant({
      rafflesParticipated,
      ticketsReserved: participant.ticketsReserved,
      ticketsPaid: participant.ticketsPaid,
      ticketsPending: participant.ticketsPending,
      ticketsCancelled: participant.ticketsCancelled,
      paymentRate,
      estimatedRevenue: participant.estimatedRevenue,
      lastSeenAt: participant.lastSeenAt,
    });
    const score = scoreParticipant({
      rafflesParticipated,
      ticketsPaid: participant.ticketsPaid,
      ticketsPending: participant.ticketsPending,
      ticketsCancelled: participant.ticketsCancelled,
      paymentRate,
      estimatedRevenue: participant.estimatedRevenue,
      lastSeenAt: participant.lastSeenAt,
    });

    return {
      phone: participant.phone,
      displayName: participant.displayName,
      state: participant.state,
      rafflesParticipated,
      ticketsReserved: participant.ticketsReserved,
      ticketsPaid: participant.ticketsPaid,
      ticketsPending: participant.ticketsPending,
      ticketsCancelled: participant.ticketsCancelled,
      paymentRate,
      estimatedRevenue: Number(participant.estimatedRevenue.toFixed(2)),
      firstSeenAt: participant.firstSeenAt.toISOString(),
      lastSeenAt: participant.lastSeenAt.toISOString(),
      averageTicketsPerRaffle: rafflesParticipated > 0
        ? Number((participant.ticketsReserved / rafflesParticipated).toFixed(2))
        : 0,
      segment,
      score,
    };
  });
};

const applyParticipantFilters = (
  participants: RaffleParticipantIntelligence[],
  filters: RaffleIntelligenceFilters = {}
) => {
  const search = filters.search?.trim().toLowerCase();

  return participants.filter((participant) => {
    if (filters.segment && participant.segment !== filters.segment) return false;
    if (filters.state && participant.state !== filters.state) return false;
    if (search) {
      const haystack = [
        participant.displayName,
        participant.phone,
        participant.state,
        participant.segment,
      ].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
};

export const raffleIntelligenceService = {
  async getParticipants(prisma: RafflePrisma, filters: RaffleIntelligenceFilters = {}) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 25;
    const allParticipants = await buildParticipants(prisma, filters);
    const filtered = applyParticipantFilters(allParticipants, filters)
      .sort((a, b) => b.score - a.score || b.ticketsPaid - a.ticketsPaid);

    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      meta: {
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
    };
  },

  async getOverview(prisma: RafflePrisma, filters: RaffleIntelligenceFilters = {}) {
    const participants = await buildParticipants(prisma, filters);
    const raffles = await prisma.raffle.findMany({
      include: { ticketSales: true },
      orderBy: { createdAt: "desc" },
    });

    const totalReservedTickets = participants.reduce((sum, p) => sum + p.ticketsReserved, 0);
    const totalPaidTickets = participants.reduce((sum, p) => sum + p.ticketsPaid, 0);
    const estimatedRevenue = participants.reduce((sum, p) => sum + p.estimatedRevenue, 0);
    const repeatParticipants = participants.filter((p) => p.rafflesParticipated >= 2).length;
    const dormantParticipants = participants.filter((p) => p.segment === "DORMANT").length;
    const nonPayers = participants.filter((p) => p.segment === "NON_PAYER").length;

    const states = new Map<string, { state: string; participants: number; paidTickets: number; revenue: number }>();
    for (const participant of participants) {
      const current = states.get(participant.state) || {
        state: participant.state,
        participants: 0,
        paidTickets: 0,
        revenue: 0,
      };
      current.participants += 1;
      current.paidTickets += participant.ticketsPaid;
      current.revenue += participant.estimatedRevenue;
      states.set(participant.state, current);
    }

    const topStates = Array.from(states.values())
      .sort((a, b) => b.revenue - a.revenue || b.paidTickets - a.paidTickets)
      .slice(0, 5)
      .map((state) => ({ ...state, revenue: Number(state.revenue.toFixed(2)) }));

    const topRaffles = raffles
      .map((raffle: any) => {
        const paidTickets = raffle.ticketSales.filter((sale: any) => sale.paymentStatus === "PAID").length;
        const reservedTickets = raffle.ticketSales.length;
        const revenue = paidTickets * toMoney(raffle.ticketPrice);
        return {
          id: raffle.id.toString(),
          title: raffle.title,
          paidTickets,
          reservedTickets,
          revenue: Number(revenue.toFixed(2)),
        };
      })
      .sort((a: any, b: any) => b.revenue - a.revenue || b.paidTickets - a.paidTickets)
      .slice(0, 5);

    return {
      uniqueParticipants: participants.length,
      totalReservedTickets,
      totalPaidTickets,
      paymentConversionRate: totalReservedTickets > 0 ? totalPaidTickets / totalReservedTickets : 0,
      estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
      averageTicketsPerParticipant: participants.length > 0
        ? Number((totalReservedTickets / participants.length).toFixed(2))
        : 0,
      repeatParticipants,
      dormantParticipants,
      nonPayers,
      topStates,
      topRaffles,
    };
  },

  async getSegments(prisma: RafflePrisma, filters: RaffleIntelligenceFilters = {}) {
    const participants = await buildParticipants(prisma, filters);
    const segments = new Map<RaffleParticipantSegment, {
      segment: RaffleParticipantSegment;
      size: number;
      paidTickets: number;
      reservedTickets: number;
      estimatedRevenue: number;
      latestActivity: string | null;
    }>();

    for (const participant of participants) {
      const current = segments.get(participant.segment) || {
        segment: participant.segment,
        size: 0,
        paidTickets: 0,
        reservedTickets: 0,
        estimatedRevenue: 0,
        latestActivity: null,
      };
      current.size += 1;
      current.paidTickets += participant.ticketsPaid;
      current.reservedTickets += participant.ticketsReserved;
      current.estimatedRevenue += participant.estimatedRevenue;
      if (!current.latestActivity || participant.lastSeenAt > current.latestActivity) {
        current.latestActivity = participant.lastSeenAt;
      }
      segments.set(participant.segment, current);
    }

    return Array.from(segments.values())
      .map((segment) => ({
        ...segment,
        paymentRate: segment.reservedTickets > 0 ? segment.paidTickets / segment.reservedTickets : 0,
        estimatedRevenue: Number(segment.estimatedRevenue.toFixed(2)),
      }))
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue || b.size - a.size);
  },

  async exportParticipantsCsv(prisma: RafflePrisma, filters: RaffleIntelligenceFilters = {}) {
    const participants = await buildParticipants(prisma, filters);
    const filtered = applyParticipantFilters(participants, filters)
      .sort((a, b) => b.score - a.score || b.ticketsPaid - a.ticketsPaid);

    const headers = [
      "name",
      "phone",
      "state",
      "segment",
      "score",
      "paid_tickets",
      "reserved_tickets",
      "payment_rate",
      "estimated_revenue",
      "last_activity",
    ];

    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((participant) => [
      participant.displayName,
      participant.phone,
      participant.state,
      participant.segment,
      participant.score,
      participant.ticketsPaid,
      participant.ticketsReserved,
      `${Math.round(participant.paymentRate * 100)}%`,
      participant.estimatedRevenue,
      participant.lastSeenAt,
    ].map(escapeCell).join(","));

    return [headers.join(","), ...rows].join("\n");
  },
};
