import { storePrisma } from "@nexus/db/store";
import { rafflePrisma } from "@nexus/db/raffle";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

const SETTLED_ORDER_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;

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
  }
};
