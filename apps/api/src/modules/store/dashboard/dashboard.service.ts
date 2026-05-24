import { storePrisma } from "@nexus/db/store";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

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

    // Calculate last 7 days sales
    const sales7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      const daySales = await storePrisma.order.aggregate({
        where: {
          status: 'PAID',
          createdAt: {
            gte: startOfDay(date),
            lte: endOfDay(date)
          }
        },
        _sum: { total: true }
      });
      
      sales7Days[dateKey] = Number(daySales._sum.total || 0);
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
