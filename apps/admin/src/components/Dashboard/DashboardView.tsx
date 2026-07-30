import React from 'react';
import { 
  ArrowRight, 
  Package, 
  ShoppingBag, 
  Check, 
  Lock
} from 'lucide-react';
import {
  DashboardCommercialOverview,
  DashboardStats,
  Order,
  AnnualService,
  ExtraCharge,
  BillingPayment,
} from '../../types';
import { SalesChart } from '../Widgets/SalesChart';
import { OrderWidgetCard, OrderWidgetCardSkeleton } from '../Widgets/OrderWidgetCard';
import { LatestProducts } from '../Widgets/LatestProducts';
import { LatestMedia } from '../Widgets/LatestMedia';
import { BillingAlertWidget } from '../Widgets/BillingAlertWidget';
import { FinancialWeightWidget } from '../Widgets/FinancialWeightWidget';
import {
  OperationalAttentionWidget,
} from '../Widgets/OperationalAttentionWidget';
import { ProductMetricWidget } from '../Widgets/ProductMetricWidget';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface DashboardViewProps {
  isLoading: boolean;
  stats: DashboardStats | null;
  commercialOverview: DashboardCommercialOverview | null;
  orders: Order[];
  billingServices: AnnualService[];
  billingCharges: ExtraCharge[];
  billingPayments: BillingPayment[];
  onNavigateToSystem: (mode: any) => void;
  onNavigateToMedia: (mode: any) => void;
  onTabChange: (tab: any) => void;
  onOpenRaffleParticipations: () => void;
  isLoadingCommercial: boolean;
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
  commercialOverview,
  orders,
  billingServices,
  billingCharges,
  billingPayments,
  onNavigateToSystem,
  onNavigateToMedia,
  onTabChange,
  onOpenRaffleParticipations,
  isLoadingCommercial,
}) => {
  const products = stats?.products;
  const activeProducts = stats?.activeProducts || 0;
  const availableProducts = products?.available ?? activeProducts;
  const reservedProducts = products?.reserved || 0;
  const inventoryBase = activeProducts || 1;

  const orderStats = stats?.orders;
  const commercialPeriod = commercialOverview?.period ?? '7D';
  const commercialSource = commercialOverview?.source ?? 'ALL';
  const commercialPeriodLabel =
    commercialPeriod === 'TODAY'
      ? 'hoy'
      : commercialPeriod === '7D'
        ? 'los últimos 7 días'
        : commercialPeriod === '15D'
          ? 'los últimos 15 días'
          : commercialPeriod === 'MONTH'
            ? 'este mes'
            : 'el histórico disponible';
  const pulseDescription =
    commercialSource === 'STORE'
      ? `Conversión de la tienda durante ${commercialPeriodLabel}.`
      : commercialSource === 'RAFFLES'
        ? `Conversión de las rifas durante ${commercialPeriodLabel}.`
        : `Conversión de tienda y rifas durante ${commercialPeriodLabel}.`;

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
      <section
        className="grid min-w-0 grid-cols-1 items-stretch xl:grid-cols-2"
        style={{ gap: 'var(--space-lg)' }}
      >
        <div className="min-w-0">
          <SalesChart
            data={commercialOverview?.salesBySource}
            period={commercialPeriod}
            source={commercialSource}
            totalAmount={commercialOverview?.pulse.confirmed.amount}
            isLoading={isLoadingCommercial}
          />
        </div>
        <div className="min-w-0">
          <FinancialWeightWidget
            pulse={commercialOverview?.pulse}
            description={pulseDescription}
            isLoading={isLoadingCommercial}
          />
        </div>
      </section>

      {/* NIVEL C: OPERATIVO (SOLO CUANDO REQUIERE ATENCIÓN) */}
      <section className="min-w-0">
        <OperationalAttentionWidget
          orders={orderStats?.pending}
          participations={stats?.participations?.pending}
          isLoading={isLoading}
          onOpenOrders={() => onTabChange('Órdenes')}
          onOpenParticipations={onOpenRaffleParticipations}
        />
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
            onViewGallery={() => onNavigateToMedia('list')}
          />
        </div>
      </section>
    </div>
  );
};
