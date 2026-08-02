import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import {
  addDays,
  differenceInCalendarDays,
  subDays,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  endOfWeek,
  format,
} from "date-fns";

const SETTLED_ORDER_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;
export type SalesOverviewPeriod = "TODAY" | "7D" | "15D" | "MONTH" | "ALL";
export type CommercialOverviewSource = "ALL" | "STORE" | "RAFFLES";

const getSalesPeriodStart = (period: SalesOverviewPeriod, today: Date) => {
  if (period === "TODAY") return startOfDay(today);
  if (period === "7D") return startOfDay(subDays(today, 6));
  if (period === "15D") return startOfDay(subDays(today, 14));
  if (period === "MONTH") return startOfMonth(today);
  return null;
};

const getPreviousSalesRange = (periodStart: Date | null, periodEnd: Date) => {
  if (!periodStart) return null;

  const durationInDays =
    differenceInCalendarDays(periodEnd, periodStart) + 1;
  const previousEnd = endOfDay(subDays(periodStart, 1));
  const previousStart = startOfDay(subDays(periodStart, durationInDays));

  return { start: previousStart, end: previousEnd };
};

type PaidRaffleSale = {
  id: number;
  reservationId: string | null;
  raffleId?: number;
  ticketNumber?: string;
  customerName?: string;
  paymentStatus: string;
  paymentMethod: string | null;
  mpPaidAmount: unknown;
  mpRefundedAmount: unknown;
  discountTotal: unknown;
  createdAt: Date;
  raffle: { title?: string; ticketPrice: unknown };
};

type SalesMetricOrder = {
  total: unknown;
  mpRefundedAmount: unknown;
  items: Array<{
    productType: string;
    quantity: number;
    unitPrice: unknown;
  }>;
};

type ProductTypeMetricKey = "ALL" | "BIRD" | "ITEM";
type SalesPaymentMethod = "ALL" | "TRANSFER" | "MERCADOPAGO";

type CommercialOrder = {
  id?: number;
  customerName?: string;
  status: string;
  paymentMethod?: string | null;
  total: unknown;
  mpRefundedAmount: unknown;
  createdAt: Date;
  items?: Array<{
    productName: string | null;
    quantity: number;
  }>;
};

const getProductTypeMetrics = (orders: SalesMetricOrder[]) => {
  const metrics: Record<
    ProductTypeMetricKey,
    {
      netRevenue: number;
      refundedAmount: number;
      orders: number;
      units: number;
    }
  > = {
    ALL: { netRevenue: 0, refundedAmount: 0, orders: 0, units: 0 },
    BIRD: { netRevenue: 0, refundedAmount: 0, orders: 0, units: 0 },
    ITEM: { netRevenue: 0, refundedAmount: 0, orders: 0, units: 0 },
  };

  for (const order of orders) {
    const total = Number(order.total);
    const refunded = Math.min(
      total,
      Math.max(0, Number(order.mpRefundedAmount || 0)),
    );
    const netRevenue = Math.max(0, total - refunded);
    const grossByType = { BIRD: 0, ITEM: 0 };
    const unitsByType = { BIRD: 0, ITEM: 0 };

    for (const item of order.items) {
      const type = item.productType === "BIRD" ? "BIRD" : "ITEM";
      grossByType[type] += Number(item.unitPrice) * item.quantity;
      unitsByType[type] += item.quantity;
    }

    const merchandiseGross = grossByType.BIRD + grossByType.ITEM;
    metrics.ALL.netRevenue += netRevenue;
    metrics.ALL.refundedAmount += refunded;
    metrics.ALL.orders += 1;
    metrics.ALL.units += unitsByType.BIRD + unitsByType.ITEM;

    for (const type of ["BIRD", "ITEM"] as const) {
      if (unitsByType[type] === 0) continue;
      metrics[type].orders += 1;
      metrics[type].units += unitsByType[type];
      metrics[type].netRevenue +=
        merchandiseGross > 0
          ? netRevenue * (grossByType[type] / merchandiseGross)
          : 0;
      metrics[type].refundedAmount +=
        merchandiseGross > 0
          ? refunded * (grossByType[type] / merchandiseGross)
          : 0;
    }
  }

  return metrics;
};

const getComparisonDirection = (
  current: number,
  previous: number,
  hasPreviousRange: boolean,
) => {
  if (!hasPreviousRange) return null;
  if (previous === 0 && current > 0) return "NEW" as const;
  if (current > previous) return "UP" as const;
  if (current < previous) return "DOWN" as const;
  return "FLAT" as const;
};

const getPaidRaffleRevenueByDay = (sales: PaidRaffleSale[]) => {
  const participations = new Map<string, PaidRaffleSale[]>();

  for (const sale of sales) {
    const participationId = sale.reservationId || `sale-${sale.id}`;
    const participation = participations.get(participationId) || [];
    participation.push(sale);
    participations.set(participationId, participation);
  }

  const revenueByDay: Record<string, number> = {};

  for (const participation of Array.from(participations.values())) {
    if (!participation.every((sale) => sale.paymentStatus === "PAID")) continue;

    const first = participation[0];
    const subtotal = Number(first.raffle.ticketPrice) * participation.length;
    const calculatedTotal = Math.max(0, subtotal - Number(first.discountTotal || 0));
    const paidAmount =
      first.paymentMethod === "MERCADOPAGO" && first.mpPaidAmount != null
        ? Number(first.mpPaidAmount)
        : calculatedTotal;
    const refundedAmount = Math.min(
      paidAmount,
      Math.max(
        0,
        ...participation.map((sale) => Number(sale.mpRefundedAmount || 0)),
      ),
    );
    const dateKey = format(first.createdAt, "yyyy-MM-dd");

    revenueByDay[dateKey] =
      (revenueByDay[dateKey] || 0) + Math.max(0, paidAmount - refundedAmount);
  }

  return revenueByDay;
};

const getRaffleCommercialPulse = (sales: PaidRaffleSale[]) => {
  const participations = new Map<string, PaidRaffleSale[]>();

  for (const sale of sales) {
    const participationId = sale.reservationId || `sale-${sale.id}`;
    const participation = participations.get(participationId) || [];
    participation.push(sale);
    participations.set(participationId, participation);
  }

  const pulse = {
    confirmed: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  };

  for (const participation of Array.from(participations.values())) {
    const first = participation[0];
    const subtotal = Number(first.raffle.ticketPrice) * participation.length;
    const discount = Math.max(
      0,
      ...participation.map((sale) => Number(sale.discountTotal || 0)),
    );
    const calculatedTotal = Math.max(0, subtotal - discount);
    const isPaid = participation.every((sale) => sale.paymentStatus === "PAID");
    const isPending = participation.some(
      (sale) => sale.paymentStatus === "PENDING",
    );

    if (isPaid) {
      const paidAmount =
        first.paymentMethod === "MERCADOPAGO" && first.mpPaidAmount != null
          ? Number(first.mpPaidAmount)
          : calculatedTotal;
      const refundedAmount = Math.min(
        paidAmount,
        Math.max(
          0,
          ...participation.map((sale) => Number(sale.mpRefundedAmount || 0)),
        ),
      );
      pulse.confirmed.count += 1;
      pulse.confirmed.amount += Math.max(0, paidAmount - refundedAmount);
      continue;
    }

    if (isPending) {
      pulse.pending.count += 1;
      pulse.pending.amount += calculatedTotal;
      continue;
    }

    pulse.cancelled.count += 1;
    pulse.cancelled.amount += calculatedTotal;
  }

  return pulse;
};

const getPulseWithConversionRate = (pulse: {
  confirmed: { count: number; amount: number };
  pending: { count: number; amount: number };
  cancelled: { count: number; amount: number };
}) => {
  const resolvedOperations = pulse.confirmed.count + pulse.cancelled.count;

  return {
    ...pulse,
    conversionRate:
      resolvedOperations > 0
        ? (pulse.confirmed.count / resolvedOperations) * 100
        : 0,
  };
};

const getStoreCommercialPulse = (orders: CommercialOrder[]) =>
  getPulseWithConversionRate(
    orders.reduce(
      (pulse, order) => {
        const total = Number(order.total);
        if (
          SETTLED_ORDER_STATUSES.includes(
            order.status as (typeof SETTLED_ORDER_STATUSES)[number],
          )
        ) {
          const refunded = Math.min(
            total,
            Math.max(0, Number(order.mpRefundedAmount || 0)),
          );
          pulse.confirmed.count += 1;
          pulse.confirmed.amount += Math.max(0, total - refunded);
        } else if (order.status === "PENDING") {
          pulse.pending.count += 1;
          pulse.pending.amount += total;
        } else if (order.status === "CANCELLED") {
          pulse.cancelled.count += 1;
          pulse.cancelled.amount += total;
        }
        return pulse;
      },
      {
        confirmed: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
      },
    ),
  );

const combineCommercialPulses = (
  storePulse: ReturnType<typeof getStoreCommercialPulse>,
  rafflePulse: ReturnType<typeof getPulseWithConversionRate>,
) =>
  getPulseWithConversionRate({
    confirmed: {
      count: storePulse.confirmed.count + rafflePulse.confirmed.count,
      amount: storePulse.confirmed.amount + rafflePulse.confirmed.amount,
    },
    pending: {
      count: storePulse.pending.count + rafflePulse.pending.count,
      amount: storePulse.pending.amount + rafflePulse.pending.amount,
    },
    cancelled: {
      count: storePulse.cancelled.count + rafflePulse.cancelled.count,
      amount: storePulse.cancelled.amount + rafflePulse.cancelled.amount,
    },
  });

export const dashboardService = {
  async getStats() {
    const [
      products,
      orderGroups,
      activeCategories,
      totalMedia,
      allRaffleSales,
      storePaymentReviews,
      rafflePaymentReviews,
      inventoryIncidents,
      rafflesAwaitingResolution,
      prizesAwaitingFulfillment,
    ] = await Promise.all([
      storePrisma.product.groupBy({
        by: ['saleStatus'],
        _count: { _all: true }
      }),
      storePrisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { total: true }
      }),
      storePrisma.category.count({ where: { active: true } }),
      storePrisma.media.count({ where: { active: true } }),
      rafflePrisma.ticketSale.findMany({
        select: {
          id: true,
          reservationId: true,
          paymentStatus: true,
          paymentMethod: true,
          mpPaidAmount: true,
          mpRefundedAmount: true,
          discountTotal: true,
          createdAt: true,
          raffle: { select: { ticketPrice: true } },
        },
      }),
      storePrisma.storePaymentHold.findMany({
        where: { status: "PROCESSING" },
        select: { total: true },
      }),
      rafflePrisma.rafflePaymentHold.findMany({
        where: { status: "PROCESSING" },
        select: {
          ticketNumbers: true,
          discountTotal: true,
          raffle: { select: { ticketPrice: true } },
        },
      }),
      storePrisma.inventoryIntegrityIncident.count({
        where: { status: "OPEN" },
      }),
      rafflePrisma.raffle.count({
        where: {
          status: "ACTIVE",
          drawDate: { lt: new Date() },
          resultPublishedAt: null,
        },
      }),
      rafflePrisma.rafflePrize.count({
        where: {
          resultPublishedAt: { not: null },
          OR: [
            { fulfillmentStatus: null },
            {
              fulfillmentStatus: {
                notIn: ["DELIVERED", "NOT_APPLICABLE"],
              },
            },
          ],
        },
      }),
    ]);

    const productStats = {
      total: products.reduce((acc, curr) => acc + curr._count._all, 0),
      available: products.find(p => p.saleStatus === 'AVAILABLE')?._count._all || 0,
      reserved: products.find(p => p.saleStatus === 'RESERVED')?._count._all || 0,
      sold: products.find(p => p.saleStatus === 'SOLD')?._count._all || 0,
    };

    const getOrderStats = (statuses: string[]) => {
      const matchingGroups = orderGroups.filter(o => statuses.includes(o.status));
      return {
        count: matchingGroups.reduce((acc, curr) => acc + curr._count._all, 0),
        amount: matchingGroups.reduce((acc, curr) => acc + Number(curr._sum.total || 0), 0)
      };
    };

    const paidStats = getOrderStats(['PAID', 'SHIPPED', 'DELIVERED']);
    const pendingStats = getOrderStats(['PENDING']);
    const cancelledStats = getOrderStats(['CANCELLED']);
    const totalGrossAmount = paidStats.amount + pendingStats.amount + cancelledStats.amount;

    const orderStats = {
      paid: { 
        count: paidStats.count,
        amount: paidStats.amount
      },
      pending: pendingStats,
      cancelled: cancelledStats,
      totalCount: orderGroups.reduce((acc, curr) => acc + curr._count._all, 0),
      totalAmount: paidStats.amount,
      totalGrossAmount,
      collectionRate: totalGrossAmount > 0 ? (paidStats.amount / totalGrossAmount) * 100 : 0
    };
    const raffleParticipationStats = getRaffleCommercialPulse(allRaffleSales);
    const storePaymentReviewAmount = storePaymentReviews.reduce(
      (total, hold) => total + Number(hold.total || 0),
      0,
    );
    const rafflePaymentReviewAmount = rafflePaymentReviews.reduce(
      (total, hold) => {
        const gross = hold.ticketNumbers.length * Number(hold.raffle.ticketPrice || 0);
        return total + Math.max(0, gross - Number(hold.discountTotal || 0));
      },
      0,
    );

    // Combine settled store orders and fully paid raffle participations.
    const today = new Date();
    const periodStart = startOfDay(subDays(today, 6));
    const periodEnd = endOfDay(today);
    const [recentOrders, raffleSales] = await Promise.all([
      storePrisma.order.findMany({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd }
        },
        select: {
          status: true,
          total: true,
          mpRefundedAmount: true,
          createdAt: true,
        }
      }),
      rafflePrisma.ticketSale.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        select: {
          id: true,
          reservationId: true,
          paymentStatus: true,
          paymentMethod: true,
          mpPaidAmount: true,
          mpRefundedAmount: true,
          discountTotal: true,
          createdAt: true,
          raffle: { select: { ticketPrice: true } }
        }
      })
    ]);

    const raffleRevenueByDay = getPaidRaffleRevenueByDay(raffleSales);
    const sales7Days: Record<string, number> = {};
    const sales7DaysBySource: Record<
      string,
      { store: number; raffles: number }
    > = {};

    for (let i = 6; i >= 0; i--) {
      const dateKey = format(subDays(today, i), "yyyy-MM-dd");
      const raffleRevenue = raffleRevenueByDay[dateKey] || 0;
      sales7Days[dateKey] = raffleRevenue;
      sales7DaysBySource[dateKey] = {
        store: 0,
        raffles: raffleRevenue,
      };
    }

    for (const order of recentOrders) {
      if (
        !SETTLED_ORDER_STATUSES.includes(
          order.status as (typeof SETTLED_ORDER_STATUSES)[number],
        )
      ) {
        continue;
      }
      const dateKey = format(order.createdAt, "yyyy-MM-dd");
      const total = Number(order.total);
      const refunded = Math.min(
        total,
        Math.max(0, Number(order.mpRefundedAmount || 0)),
      );
      const storeRevenue = Math.max(0, total - refunded);
      sales7Days[dateKey] = (sales7Days[dateKey] || 0) + storeRevenue;
      sales7DaysBySource[dateKey].store += storeRevenue;
    }

    const rafflePulse = getPulseWithConversionRate(
      getRaffleCommercialPulse(raffleSales),
    );
    const storePulse = getStoreCommercialPulse(recentOrders);
    const commercialPulse7DaysBySource = {
      store: storePulse,
      raffles: rafflePulse,
    };
    const commercialPulse7Days = combineCommercialPulses(
      storePulse,
      rafflePulse,
    );

    return {
      activeProducts: productStats.available + productStats.reserved,
      products: productStats,
      activeCategories,
      totalMedia,
      orders: orderStats,
      participations: {
        paid: raffleParticipationStats.confirmed,
        pending: raffleParticipationStats.pending,
        cancelled: raffleParticipationStats.cancelled,
      },
      attention: {
        paymentReviews: {
          count: storePaymentReviews.length + rafflePaymentReviews.length,
          amount: storePaymentReviewAmount + rafflePaymentReviewAmount,
        },
        inventoryIncidents,
        rafflesAwaitingResolution,
        prizesAwaitingFulfillment,
      },
      sales7Days,
      sales7DaysBySource,
      commercialPulse7Days,
      commercialPulse7DaysBySource,
    };
  },

  async getCommercialOverview(
    period: SalesOverviewPeriod,
    source: CommercialOverviewSource = "ALL",
    paymentMethod: SalesPaymentMethod = "ALL",
  ) {
    const today = new Date();
    const pulseStart = getSalesPeriodStart(period, today);
    const pulseEnd = endOfDay(today);
    const chartStart =
      period === "TODAY"
        ? startOfWeek(today, { weekStartsOn: 1 })
        : pulseStart;
    const chartEnd =
      period === "TODAY"
        ? endOfWeek(today, { weekStartsOn: 1 })
        : pulseEnd;
    const dateFilter = chartStart
      ? { createdAt: { gte: chartStart, lte: chartEnd } }
      : {};
    const paymentFilter =
      paymentMethod === "ALL" ? {} : { paymentMethod };

    const [storeOrders, raffleSales] = await Promise.all([
      source === "RAFFLES"
        ? Promise.resolve([] as CommercialOrder[])
        : storePrisma.order.findMany({
            where: { ...dateFilter, ...paymentFilter },
            select: {
              id: true,
              customerName: true,
              status: true,
              paymentMethod: true,
              total: true,
              mpRefundedAmount: true,
              createdAt: true,
              items: {
                select: {
                  productName: true,
                  quantity: true,
                },
              },
            },
          }),
      source === "STORE"
        ? Promise.resolve([] as PaidRaffleSale[])
        : rafflePrisma.ticketSale.findMany({
            where: { ...dateFilter, ...paymentFilter },
            select: {
              id: true,
              reservationId: true,
              raffleId: true,
              ticketNumber: true,
              customerName: true,
              paymentStatus: true,
              paymentMethod: true,
              mpPaidAmount: true,
              mpRefundedAmount: true,
              discountTotal: true,
              createdAt: true,
              raffle: { select: { title: true, ticketPrice: true } },
            },
          }),
    ]);

    const isInsidePulse = (createdAt: Date) =>
      (!pulseStart || createdAt >= pulseStart) && createdAt <= pulseEnd;
    const pulseOrders = storeOrders.filter((order) =>
      isInsidePulse(order.createdAt),
    );
    const pulseRaffleSales = raffleSales.filter((sale) =>
      isInsidePulse(sale.createdAt),
    );
    const storePulse = getStoreCommercialPulse(pulseOrders);
    const rafflePulse = getPulseWithConversionRate(
      getRaffleCommercialPulse(pulseRaffleSales),
    );
    const pulse =
      source === "STORE"
        ? storePulse
        : source === "RAFFLES"
          ? rafflePulse
          : combineCommercialPulses(storePulse, rafflePulse);

    const salesBySource: Record<
      string,
      { store: number; raffles: number }
    > = {};
    const ensurePoint = (key: string) => {
      salesBySource[key] ||= { store: 0, raffles: 0 };
      return salesBySource[key];
    };
    const getChartKey = (date: Date) =>
      period === "ALL" ? format(date, "yyyy-MM") : format(date, "yyyy-MM-dd");

    if (period !== "ALL" && chartStart) {
      for (
        let cursor = chartStart;
        cursor <= chartEnd;
        cursor = addDays(cursor, 1)
      ) {
        ensurePoint(format(cursor, "yyyy-MM-dd"));
      }
    }

    for (const order of storeOrders) {
      if (
        !SETTLED_ORDER_STATUSES.includes(
          order.status as (typeof SETTLED_ORDER_STATUSES)[number],
        )
      ) {
        continue;
      }
      const total = Number(order.total);
      const refunded = Math.min(
        total,
        Math.max(0, Number(order.mpRefundedAmount || 0)),
      );
      ensurePoint(getChartKey(order.createdAt)).store += Math.max(
        0,
        total - refunded,
      );
    }

    const raffleRevenueByDay = getPaidRaffleRevenueByDay(raffleSales);
    for (const [date, amount] of Object.entries(raffleRevenueByDay)) {
      const key =
        period === "ALL"
          ? date.slice(0, 7)
          : date;
      ensurePoint(key).raffles += amount;
    }

    const history = [
      ...pulseOrders.map((order) => {
        const total = Number(order.total);
        const refundedAmount = Math.min(
          total,
          Math.max(0, Number(order.mpRefundedAmount || 0)),
        );

        return {
          kind: "ORDER" as const,
          id: String(order.id),
          customerName: order.customerName || "Cliente",
          createdAt: order.createdAt.toISOString(),
          status: SETTLED_ORDER_STATUSES.includes(
            order.status as (typeof SETTLED_ORDER_STATUSES)[number],
          )
            ? ("CONFIRMED" as const)
            : order.status === "PENDING"
              ? ("PENDING" as const)
              : ("CANCELLED" as const),
          paymentMethod: order.paymentMethod,
          amount: Math.max(0, total - refundedAmount),
          unitCount: (order.items || []).reduce(
            (sum, item) => sum + item.quantity,
            0,
          ),
          summaryItems: (order.items || []).map(
            (item) => item.productName || "Producto",
          ),
        };
      }),
      ...Array.from(
        pulseRaffleSales.reduce((groups, sale) => {
          const key = sale.reservationId || `sale-${sale.id}`;
          const group = groups.get(key) || [];
          group.push(sale);
          groups.set(key, group);
          return groups;
        }, new Map<string, PaidRaffleSale[]>()),
      ).map(([participationId, sales]) => {
        const first = sales[0];
        const subtotal = Number(first.raffle.ticketPrice) * sales.length;
        const discount = Math.max(
          0,
          ...sales.map((sale) => Number(sale.discountTotal || 0)),
        );
        const calculatedTotal = Math.max(0, subtotal - discount);
        const isPaid = sales.every((sale) => sale.paymentStatus === "PAID");
        const isPending = sales.some(
          (sale) => sale.paymentStatus === "PENDING",
        );
        const paidAmount =
          first.paymentMethod === "MERCADOPAGO" && first.mpPaidAmount != null
            ? Number(first.mpPaidAmount)
            : calculatedTotal;
        const refundedAmount = Math.min(
          paidAmount,
          Math.max(
            0,
            ...sales.map((sale) => Number(sale.mpRefundedAmount || 0)),
          ),
        );

        return {
          kind: "PARTICIPATION" as const,
          id: participationId,
          raffleId: first.raffleId,
          customerName: first.customerName || "Participante",
          createdAt: first.createdAt.toISOString(),
          status: isPaid
            ? ("CONFIRMED" as const)
            : isPending
              ? ("PENDING" as const)
              : ("CANCELLED" as const),
          paymentMethod: first.paymentMethod,
          amount: isPaid
            ? Math.max(0, paidAmount - refundedAmount)
            : calculatedTotal,
          unitCount: sales.length,
          summaryItems: [first.raffle.title || `Rifa #${first.raffleId}`],
          ticketNumbers: sales
            .map((sale) => sale.ticketNumber)
            .filter((ticket): ticket is string => Boolean(ticket)),
        };
      }),
    ]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .slice(0, 5);

    return {
      period,
      source,
      paymentMethod,
      granularity: period === "ALL" ? "MONTH" : "DAY",
      range: {
        from: pulseStart?.toISOString() || null,
        to: pulseEnd.toISOString(),
      },
      salesBySource,
      pulse,
      history,
    };
  },

  async getSalesOverview(
    period: SalesOverviewPeriod,
    productType: ProductTypeMetricKey = "ALL",
    paymentMethod: SalesPaymentMethod = "ALL",
    search = "",
    page = 1,
    pageSize = 8,
  ) {
    const today = new Date();
    const periodStart = getSalesPeriodStart(period, today);
    const periodEnd = endOfDay(today);
    const trendStart =
      period === "TODAY"
        ? startOfWeek(today, { weekStartsOn: 1 })
        : periodStart;
    const trendEnd =
      period === "TODAY"
        ? endOfWeek(today, { weekStartsOn: 1 })
        : periodEnd;
    const previousRange = getPreviousSalesRange(periodStart, periodEnd);
    const orders = await storePrisma.order.findMany({
      where: {
        status: { in: [...SETTLED_ORDER_STATUSES] },
        ...(paymentMethod !== "ALL" ? { paymentMethod } : {}),
        ...(periodStart
          ? { createdAt: { gte: periodStart, lte: periodEnd } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        status: true,
        paymentMethod: true,
        subtotal: true,
        discountTotal: true,
        total: true,
        mpRefundedAmount: true,
        mpRefundedAt: true,
        items: {
          select: {
            productId: true,
            productName: true,
            productType: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });
    const previousOrders = previousRange
      ? await storePrisma.order.findMany({
          where: {
            status: { in: [...SETTLED_ORDER_STATUSES] },
            ...(paymentMethod !== "ALL" ? { paymentMethod } : {}),
            createdAt: {
              gte: previousRange.start,
              lte: previousRange.end,
            },
          },
          select: {
            total: true,
            mpRefundedAmount: true,
            items: {
              select: {
                productType: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        })
      : [];
    const trendOrders =
      period === "TODAY"
        ? await storePrisma.order.findMany({
            where: {
              status: { in: [...SETTLED_ORDER_STATUSES] },
              ...(paymentMethod !== "ALL" ? { paymentMethod } : {}),
              createdAt: { gte: trendStart!, lte: trendEnd },
            },
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              createdAt: true,
              status: true,
              paymentMethod: true,
              subtotal: true,
              discountTotal: true,
              total: true,
              mpRefundedAmount: true,
              mpRefundedAt: true,
              items: {
                select: {
                  productId: true,
                  productName: true,
                  productType: true,
                  quantity: true,
                  unitPrice: true,
                },
              },
            },
          })
        : orders;
    const metricsByProductType = getProductTypeMetrics(orders);
    const previousMetricsByProductType = getProductTypeMetrics(previousOrders);

    const productMap = new Map<
      number,
      {
        productId: number;
        name: string;
        type: "BIRD" | "ITEM";
        units: number;
        revenue: number;
        orderIds: Set<number>;
      }
    >();
    const salesByDay: Record<string, number> = {};
    let grossRevenue = 0;
    let refundedAmount = 0;
    let unitsSold = 0;
    let birdsSold = 0;
    let itemUnitsSold = 0;
    let birdRevenue = 0;
    let itemRevenue = 0;

    for (const order of orders) {
      const orderTotal = Number(order.total);
      const orderRefunded = Math.min(
        orderTotal,
        Math.max(0, Number(order.mpRefundedAmount || 0)),
      );
      const orderNet = Math.max(0, orderTotal - orderRefunded);
      grossRevenue += orderTotal;
      refundedAmount += orderRefunded;
      const dateKey = format(order.createdAt, "yyyy-MM-dd");
      salesByDay[dateKey] = (salesByDay[dateKey] || 0) + orderNet;

      const merchandiseGross = order.items.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0,
      );
      const allocationFactor =
        merchandiseGross > 0 ? orderNet / merchandiseGross : 0;

      for (const item of order.items) {
        const lineRevenue =
          Number(item.unitPrice) * item.quantity * allocationFactor;
        unitsSold += item.quantity;
        if (item.productType === "BIRD") {
          birdsSold += item.quantity;
          birdRevenue += lineRevenue;
        } else {
          itemUnitsSold += item.quantity;
          itemRevenue += lineRevenue;
        }

        const current = productMap.get(item.productId) || {
          productId: item.productId,
          name: item.productName || `Producto #${item.productId}`,
          type: item.productType as "BIRD" | "ITEM",
          units: 0,
          revenue: 0,
          orderIds: new Set<number>(),
        };
        current.units += item.quantity;
        current.revenue += lineRevenue;
        current.orderIds.add(order.id);
        productMap.set(item.productId, current);
      }
    }

    const netRevenue = Math.max(0, grossRevenue - refundedAmount);
    const previousNetRevenue = previousMetricsByProductType.ALL.netRevenue;
    const percentageChange =
      previousRange && previousNetRevenue > 0
        ? ((netRevenue - previousNetRevenue) / previousNetRevenue) * 100
        : null;
    const comparisonDirection = getComparisonDirection(
      netRevenue,
      previousNetRevenue,
      Boolean(previousRange),
    );
    const productTypeMetrics = Object.fromEntries(
      (["ALL", "BIRD", "ITEM"] as const).map((type) => {
        const current = metricsByProductType[type];
        const previous = previousMetricsByProductType[type];
        return [
          type,
          {
            netRevenue: current.netRevenue,
            refundedAmount: current.refundedAmount,
            orders: current.orders,
            units: current.units,
            previousNetRevenue: previous.netRevenue,
            percentageChange:
              previousRange && previous.netRevenue > 0
                ? ((current.netRevenue - previous.netRevenue) /
                    previous.netRevenue) *
                  100
                : null,
            direction: getComparisonDirection(
              current.netRevenue,
              previous.netRevenue,
              Boolean(previousRange),
            ),
          },
        ];
      }),
    );
    const topProducts = Array.from(productMap.values())
      .sort(
        (left, right) =>
          right.units - left.units || right.revenue - left.revenue,
      )
      .slice(0, 8)
      .map(({ orderIds, ...product }) => ({
        ...product,
        orders: orderIds.size,
      }));
    const mapOrderForSelection = (order: (typeof orders)[number]) => {
      const grossByType = { BIRD: 0, ITEM: 0 };
      const unitsByType = { BIRD: 0, ITEM: 0 };

      for (const item of order.items) {
        const type = item.productType === "BIRD" ? "BIRD" : "ITEM";
        grossByType[type] += Number(item.unitPrice) * item.quantity;
        unitsByType[type] += item.quantity;
      }

      if (productType !== "ALL" && unitsByType[productType] === 0) {
        return null;
      }

      const orderTotal = Number(order.total);
      const orderRefunded = Math.min(
        orderTotal,
        Math.max(0, Number(order.mpRefundedAmount || 0)),
      );
      const orderNet = Math.max(0, orderTotal - orderRefunded);
      const merchandiseGross = grossByType.BIRD + grossByType.ITEM;
      const selectedGross =
        productType === "ALL" ? merchandiseGross : grossByType[productType];
      const allocation =
        productType === "ALL"
          ? 1
          : merchandiseGross > 0
            ? selectedGross / merchandiseGross
            : 0;
      const selectedItems = order.items.filter(
        (item) =>
          productType === "ALL" || item.productType === productType,
      );
      const selectedTypes = new Set(
        selectedItems.map((item) =>
          item.productType === "BIRD" ? "BIRD" : "ITEM",
        ),
      );

      return {
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        createdAt: order.createdAt,
        status: order.status,
        paymentMethod: order.paymentMethod,
        total: orderTotal,
        netRevenue: orderNet * allocation,
        refundedAmount: orderRefunded * allocation,
        itemCount: selectedItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        itemNames: Array.from(
          new Set(
            selectedItems.map(
              (item) =>
                item.productName || `Producto #${item.productId}`,
            ),
          ),
        ),
        productType:
          selectedTypes.size > 1
            ? "MIXED"
            : selectedTypes.has("BIRD")
              ? "BIRD"
              : "ITEM",
      };
    };

    const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
    const eligibleOrders = orders
      .map(mapOrderForSelection)
      .filter((order): order is NonNullable<typeof order> => order !== null);
    const filteredOrders = eligibleOrders
      .filter((order) => {
        if (!normalizedSearch) return true;

        return [
          String(order.id),
          order.customerName,
          order.customerPhone,
          ...order.itemNames,
        ].some((value) =>
          value.toLocaleLowerCase("es-MX").includes(normalizedSearch),
        );
      });
    const totalOrders = filteredOrders.length;
    const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
    const currentPage = Math.min(page, totalPages);
    const historyStart = (currentPage - 1) * pageSize;
    const orderHistory = filteredOrders.slice(
      historyStart,
      historyStart + pageSize,
    );
    const filteredSalesByDay = trendOrders
      .map(mapOrderForSelection)
      .filter((order): order is NonNullable<typeof order> => order !== null)
      .reduce<Record<string, number>>(
      (result, order) => {
        const dateKey = format(order.createdAt, "yyyy-MM-dd");
        result[dateKey] = (result[dateKey] || 0) + order.netRevenue;
        return result;
      },
      {},
      );

    return {
      period,
      productType,
      paymentMethod,
      range: {
        from: periodStart?.toISOString() || null,
        to: periodEnd.toISOString(),
      },
      trendRange: {
        from: trendStart?.toISOString() || null,
        to: trendEnd.toISOString(),
      },
      comparison: previousRange
        ? {
            from: previousRange.start.toISOString(),
            to: previousRange.end.toISOString(),
            previousNetRevenue,
            percentageChange,
            direction: comparisonDirection,
          }
        : null,
      metricsByProductType: productTypeMetrics,
      metrics: {
        grossRevenue,
        refundedAmount,
        netRevenue,
        orders: orders.length,
        unitsSold,
        birdsSold,
        itemUnitsSold,
        distinctProducts: productMap.size,
        ticketAverage: orders.length > 0 ? netRevenue / orders.length : 0,
      },
      typeBreakdown: {
        birds: { units: birdsSold, revenue: birdRevenue },
        items: { units: itemUnitsSold, revenue: itemRevenue },
      },
      topProducts,
      salesByDay: filteredSalesByDay,
      orderHistory,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems: totalOrders,
        totalPages,
      },
    };
  },
};
