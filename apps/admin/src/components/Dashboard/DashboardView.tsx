import React, { useMemo } from 'react';
import { 
  ArrowRight, 
  Package, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Check, 
  Lock
} from 'lucide-react';
import {
  DashboardStats, Order, AnnualService, ExtraCharge, BillingPayment
} from '../../types';
import { SalesChart } from '../Widgets/SalesChart';
import { OrderWidgetCard, OrderWidgetCardSkeleton } from '../Widgets/OrderWidgetCard';
import { LatestProducts } from '../Widgets/LatestProducts';
import { LatestMedia } from '../Widgets/LatestMedia';
import { BillingAlertWidget } from '../Widgets/BillingAlertWidget';
import { OrderDistributionWidget } from '../Widgets/OrderDistributionWidget';
import { FinancialWeightWidget } from '../Widgets/FinancialWeightWidget';
import { StatusMetricWidget } from '../Widgets/StatusMetricWidget';
import { ProductMetricWidget } from '../Widgets/ProductMetricWidget';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface DashboardViewProps {
  isLoading: boolean;
  stats: DashboardStats | null;
  orders: Order[];
  billingServices: AnnualService[];
  billingCharges: ExtraCharge[];
  billingPayments: BillingPayment[];
  onNavigateToSystem: (mode: any) => void;
  onNavigateToGallery: (mode: any) => void;
  onTabChange: (tab: any) => void;
}

const EmptyOrdersState: React.FC = () => (
  <NexusAutonomousCard className="py-16 text-center border-dashed border-2">
    <Package size={40} className="mx-auto text-stone-300 mb-4 opacity-60" />
    <p className="text-secondary font-medium text-text-muted">Sin actividad reciente</p>
  </NexusAutonomousCard>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  isLoading,
  stats,
  orders,
  billingServices,
  billingCharges,
  billingPayments,
  onNavigateToSystem,
  onNavigateToGallery,
  onTabChange
}) => {
  const products = stats?.products;
  const activeProducts = stats?.activeProducts || 0;
  const availableProducts = products?.available ?? activeProducts;
  const reservedProducts = products?.reserved || 0;
  const inventoryBase = activeProducts || 1;

  const totalOrders = useMemo(() => {
    if (!stats?.orders) return 0;
    return (stats.orders.paid.count || 0) + 
           (stats.orders.pending.count || 0) + 
           (stats.orders.cancelled.count || 0);
  }, [stats?.orders]);

  const orderStats = stats?.orders;

  return (
    <div className="flex flex-col pb-24 animate-in fade-in duration-300" style={{ gap: 'var(--space-lg)' }}>
      {/* NIVEL A: ALERTAS CRÍTICAS */}
      <BillingAlertWidget
        services={billingServices}
        charges={billingCharges}
        payments={billingPayments}
        isLoading={isLoading}
        onNavigate={() => onNavigateToSystem('billing')}
      />

      {/* NIVEL B: ESTRATÉGICO (TENDENCIAS) */}
      <section className="min-w-0">
        <SalesChart data={stats?.sales7Days} isLoading={isLoading} />
      </section>

      {/* NIVEL C: TÁCTICO (PULSO DE ESTADO) */}
      <section className="grid grid-cols-1 md:grid-cols-3 items-stretch" style={{ gap: 'var(--space-md)' }}>
        <StatusMetricWidget
          label="Órdenes Pagadas"
          count={orderStats?.paid.count || 0}
          amount={orderStats?.paid.amount || 0}
          percentage={((orderStats?.paid.count || 0) / (totalOrders || 1)) * 100}
          icon={CheckCircle2}
          variant="emerald"
          isLoading={isLoading}
        />
        <StatusMetricWidget
          label="Órdenes Pendientes"
          count={orderStats?.pending.count || 0}
          amount={orderStats?.pending.amount || 0}
          percentage={((orderStats?.pending.count || 0) / (totalOrders || 1)) * 100}
          icon={Clock}
          variant="brand"
          isLoading={isLoading}
        />
        <StatusMetricWidget
          label="Órdenes Canceladas"
          count={orderStats?.cancelled.count || 0}
          amount={orderStats?.cancelled.amount || 0}
          percentage={((orderStats?.cancelled.count || 0) / (totalOrders || 1)) * 100}
          icon={XCircle}
          variant="muted"
          isLoading={isLoading}
        />
      </section>

      {/* NIVEL D: CONTEXTO FINANCIERO (DISTRIBUCIÓN) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 items-stretch" style={{ gap: 'var(--space-md)' }}>
        <div className="lg:col-span-4 flex flex-col">
          <OrderDistributionWidget stats={orderStats} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-8 flex flex-col">
          <FinancialWeightWidget stats={orderStats} isLoading={isLoading} />
        </div>
      </section>

      {/* NIVEL E: NÚCLEO OPERATIVO (ACCIÓN) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 items-stretch" style={{ gap: 'var(--space-md)' }}>
        {/* Feed de Órdenes */}
        <div className="xl:col-span-8 flex flex-col">
          <NexusAutonomousCard className="h-full flex flex-col">
            <NexusHeader
              title="Ordenes recientes"
              subtitle="Flujo real de compra y cobro"
              icon={ShoppingBag}
              iconVariant="brand"
            />

            <div className="flex flex-col gap-2 flex-grow">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <OrderWidgetCardSkeleton key={i} />)
              ) : orders.length > 0 ? (
                orders.slice(0, 3).map(order => (
                  <OrderWidgetCard
                    key={order.id}
                    order={order}
                    onViewDetail={() => onTabChange('Órdenes')}
                  />
                ))
              ) : (
                <EmptyOrdersState />
              )}
            </div>

            <NexusAutonomousButton
              onClick={() => onTabChange('Órdenes')}
              variant="secondary"
              className="w-full mt-6"
              icon={ArrowRight}
            >
              Ver todas las órdenes
            </NexusAutonomousButton>
          </NexusAutonomousCard>
        </div>

        {/* KPIs de Inventario */}
        <aside className="xl:col-span-4 flex flex-col" style={{ gap: 'var(--space-md)' }}>
          <ProductMetricWidget
            label="Productos activos"
            value={activeProducts}
            icon={Package}
            variant="brand"
            signal="Activo"
            percentage={activeProducts > 0 ? 100 : 0}
            isLoading={isLoading}
          />
          <ProductMetricWidget
            label="En inventario"
            value={availableProducts}
            icon={Check}
            variant="emerald"
            signal="Disponible"
            percentage={(availableProducts / inventoryBase) * 100}
            isLoading={isLoading}
          />
          <ProductMetricWidget
            label="Reservados"
            value={reservedProducts}
            icon={Lock}
            variant="orange"
            signal="Reservado"
            percentage={(reservedProducts / inventoryBase) * 100}
            isLoading={isLoading}
          />
        </aside>
      </section>

      {/* NIVEL F: CONTEXTO VISUAL (CATÁLOGO) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 items-stretch" style={{ gap: 'var(--space-md)' }}>
        <div className="flex flex-col">
          <LatestProducts
            items={stats?.latestProducts || []}
            isLoading={isLoading}
            onViewGallery={() => onTabChange('Productos')}
          />
        </div>
        <div className="flex flex-col">
          <LatestMedia
            items={stats?.latestMedia || []}
            isLoading={isLoading}
            onViewGallery={() => onNavigateToGallery('list')}
          />
        </div>
      </section>
    </div>
  );
};
