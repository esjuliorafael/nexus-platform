import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import {
  subDays,
  startOfDay,
  startOfMonth,
  endOfDay,
  format,
} from "date-fns";

const SETTLED_ORDER_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;
export type SalesOverviewPeriod = "TODAY" | "7D" | "30D" | "MONTH" | "ALL";

const getSalesPeriodStart = (period: SalesOverviewPeriod, today: Date) => {
  if (period === "TODAY") return startOfDay(today);
  if (period === "7D") return startOfDay(subDays(today, 6));
  if (period === "30D") return startOfDay(subDays(today, 29));
  if (period === "MONTH") return startOfMonth(today);
  return null;
};

type PaidRaffleSale = {
  id: number;
  reservationId: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  mpPaidAmount: unknown;
  discountTotal: unknown;
  createdAt: Date;
  raffle: { ticketPrice: unknown };
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
    const dateKey = format(first.createdAt, "yyyy-MM-dd");

    revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + paidAmount;
  }

  return revenueByDay;
};

export const dashboardService = {
  async getStats() {
    const [
      products,
      orderGroups,
      activeCategories,
      totalMedia,
      latestMedia,
      latestProducts
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
      storePrisma.media.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 4
      }),
      storePrisma.product.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 4
      })
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

    // Combine settled store orders and fully paid raffle participations.
    const today = new Date();
    const periodStart = startOfDay(subDays(today, 6));
    const periodEnd = endOfDay(today);
    const [settledOrders, raffleSales] = await Promise.all([
      storePrisma.order.findMany({
        where: {
          status: { in: [...SETTLED_ORDER_STATUSES] },
          createdAt: { gte: periodStart, lte: periodEnd }
        },
        select: { total: true, createdAt: true }
      }),
      rafflePrisma.ticketSale.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        select: {
          id: true,
          reservationId: true,
          paymentStatus: true,
          paymentMethod: true,
          mpPaidAmount: true,
          discountTotal: true,
          createdAt: true,
          raffle: { select: { ticketPrice: true } }
        }
      })
    ]);

    const raffleRevenueByDay = getPaidRaffleRevenueByDay(raffleSales);
    const sales7Days: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const dateKey = format(subDays(today, i), "yyyy-MM-dd");
      sales7Days[dateKey] = raffleRevenueByDay[dateKey] || 0;
    }

    for (const order of settledOrders) {
      const dateKey = format(order.createdAt, "yyyy-MM-dd");
      sales7Days[dateKey] = (sales7Days[dateKey] || 0) + Number(order.total);
    }

    return {
      activeProducts: productStats.available + productStats.reserved,
      products: productStats,
      activeCategories,
      totalMedia,
      orders: orderStats,
      latestMedia,
      latestProducts,
      sales7Days
    };
  },

  async getSalesOverview(period: SalesOverviewPeriod) {
    const today = new Date();
    const periodStart = getSalesPeriodStart(period, today);
    const periodEnd = endOfDay(today);
    const orders = await storePrisma.order.findMany({
      where: {
        status: { in: [...SETTLED_ORDER_STATUSES] },
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
      const merchandiseNet =
        Math.max(0, Number(order.subtotal) - Number(order.discountTotal || 0)) *
        (orderTotal > 0 ? orderNet / orderTotal : 0);
      const allocationFactor =
        merchandiseGross > 0 ? merchandiseNet / merchandiseGross : 0;

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

    return {
      period,
      range: {
        from: periodStart?.toISOString() || null,
        to: periodEnd.toISOString(),
      },
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
      salesByDay,
      recentOrders: orders.slice(0, 8).map((order) => ({
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        createdAt: order.createdAt,
        status: order.status,
        total: Number(order.total),
        refundedAmount: Number(order.mpRefundedAmount || 0),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        itemNames: order.items.map(
          (item) => item.productName || `Producto #${item.productId}`,
        ),
      })),
    };
  },
};
