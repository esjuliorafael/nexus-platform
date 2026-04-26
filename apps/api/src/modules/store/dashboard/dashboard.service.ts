import { storePrisma } from "@nexus/db/store";

export const dashboardService = {
  async getStats() {
    const [
      products,
      orders,
      paidOrders
    ] = await Promise.all([
      storePrisma.product.groupBy({
        by: ['saleStatus'],
        _count: { _all: true }
      }),
      storePrisma.order.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      storePrisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true }
      })
    ]);

    const productStats = {
      total: products.reduce((acc, curr) => acc + curr._count._all, 0),
      available: products.find(p => p.saleStatus === 'AVAILABLE')?._count._all || 0,
      reserved: products.find(p => p.saleStatus === 'RESERVED')?._count._all || 0,
      sold: products.find(p => p.saleStatus === 'SOLD')?._count._all || 0,
    };

    const orderStats = {
      total: orders.reduce((acc, curr) => acc + curr._count._all, 0),
      pending: orders.find(o => o.status === 'PENDING')?._count._all || 0,
      paid: orders.find(o => o.status === 'PAID')?._count._all || 0,
      cancelled: orders.find(o => o.status === 'CANCELLED')?._count._all || 0,
    };

    return {
      products: productStats,
      orders: orderStats,
      revenue: {
        total: paidOrders._sum.total || 0
      }
    };
  }
};
