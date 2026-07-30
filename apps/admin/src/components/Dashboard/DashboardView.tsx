import React from 'react';
import { 
  CheckCircle2,
  CircleX,
  Clock,
  CreditCard,
  History,
  ReceiptText,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import {
  DashboardCommercialOverview,
  DashboardStats,
  AnnualService,
  ExtraCharge,
  BillingPayment,
} from '../../types';
import { SalesChart } from '../Widgets/SalesChart';
import { LatestProducts } from '../Widgets/LatestProducts';
import { LatestMedia } from '../Widgets/LatestMedia';
import { BillingAlertWidget } from '../Widgets/BillingAlertWidget';
import { FinancialWeightWidget } from '../Widgets/FinancialWeightWidget';
import {
  OperationalAttentionWidget,
} from '../Widgets/OperationalAttentionWidget';
import { NexusSectionButton } from '../ui/NexusButton';
import { NexusSectionBadge } from '../ui/NexusBadge';
import { NexusSection } from '../ui/NexusSection';

interface DashboardViewProps {
  isLoading: boolean;
  stats: DashboardStats | null;
  commercialOverview: DashboardCommercialOverview | null;
  billingServices: AnnualService[];
  billingCharges: ExtraCharge[];
  billingPayments: BillingPayment[];
  onNavigateToSystem: (mode: any) => void;
  onNavigateToMedia: (mode: any) => void;
  onTabChange: (tab: any) => void;
  onOpenRaffleParticipations: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenParticipation: (participationId: string) => void;
  isLoadingCommercial: boolean;
}

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);

const compactDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const compactTime = (value: string) =>
  new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const DashboardView: React.FC<DashboardViewProps> = ({
  isLoading,
  stats,
  commercialOverview,
  billingServices,
  billingCharges,
  billingPayments,
  onNavigateToSystem,
  onNavigateToMedia,
  onTabChange,
  onOpenRaffleParticipations,
  onOpenOrder,
  onOpenParticipation,
  isLoadingCommercial,
}) => {
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
  const commercialHistory = commercialOverview?.history ?? [];
  const historyTitle =
    commercialSource === 'STORE'
      ? 'Historial de Órdenes'
      : commercialSource === 'RAFFLES'
        ? 'Historial de Participaciones'
        : 'Historial Comercial';
  const historySubtitle =
    commercialSource === 'STORE'
      ? `Últimas órdenes de ${commercialPeriodLabel}.`
      : commercialSource === 'RAFFLES'
        ? `Últimas participaciones de ${commercialPeriodLabel}.`
        : `Últimos movimientos de tienda y rifas durante ${commercialPeriodLabel}.`;

  return (
    <div className="flex flex-col animate-in fade-in duration-300" style={{ gap: 'var(--space-lg)' }}>
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
          onOpenOrders={() => onTabChange('Operaciones')}
          onOpenParticipations={onOpenRaffleParticipations}
        />
      </section>

      {/* NIVEL E: HISTORIAL COMERCIAL */}
      <NexusSection
        title={historyTitle}
        subtitle={historySubtitle}
        icon={History}
        iconVariant="brand"
      >
        <div className="divide-y divide-border-main">
          {isLoadingCommercial ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse bg-bg-muted first:rounded-t-[var(--radius-inner)] last:rounded-b-[var(--radius-inner)]"
              />
            ))
          ) : commercialHistory.length > 0 ? (
            commercialHistory.map((item) => {
              const isOrder = item.kind === 'ORDER';
              const statusLabel =
                item.status === 'CONFIRMED'
                  ? 'Pagada'
                  : item.status === 'PENDING'
                    ? 'Apartada'
                    : 'Cancelada';
              const statusIcon =
                item.status === 'CONFIRMED'
                  ? CheckCircle2
                  : item.status === 'PENDING'
                    ? Clock
                    : CircleX;
              const statusVariant =
                item.status === 'CONFIRMED'
                  ? 'success'
                  : item.status === 'PENDING'
                    ? 'warning'
                    : 'danger';

              return (
                <article
                  key={`${item.kind}-${item.id}`}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center py-[var(--space-md)] first:pt-0 last:pb-0 lg:grid-cols-[var(--size-button-card)_minmax(0,1.1fr)_minmax(0,1fr)_7.5rem_8rem_9rem]"
                  style={{ gap: 'var(--space-md)' }}
                >
                  <div
                    className="grid shrink-0 place-items-center border border-border-main bg-bg-muted text-brand-600"
                    style={{
                      width: 'var(--size-icon-section-compact)',
                      height: 'var(--size-icon-section-compact)',
                      borderRadius: 'var(--radius-inner-visual)',
                    }}
                  >
                    {isOrder ? (
                      <ShoppingBag
                        style={{
                          width: 'var(--size-inner-icon-section-compact)',
                          height: 'var(--size-inner-icon-section-compact)',
                        }}
                      />
                    ) : (
                      <Ticket
                        style={{
                          width: 'var(--size-inner-icon-section-compact)',
                          height: 'var(--size-inner-icon-section-compact)',
                        }}
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-sm)' }}>
                    <div className="flex min-w-0 flex-wrap items-center" style={{ gap: 'var(--space-xs)' }}>
                      <NexusSectionBadge icon={statusIcon} variant={statusVariant}>
                        {statusLabel}
                      </NexusSectionBadge>
                      <NexusSectionBadge icon={CreditCard} variant="muted">
                        {item.paymentMethod === 'MERCADOPAGO'
                          ? 'Tarjeta'
                          : 'Dep. / Trans.'}
                      </NexusSectionBadge>
                    </div>
                    <strong className="truncate text-body font-bold text-text-main" title={item.customerName}>
                      {item.customerName}
                    </strong>
                  </div>

                  <div
                    className="col-span-2 flex min-w-0 items-center lg:col-span-1"
                    style={{ gap: 'var(--space-xs)' }}
                    title={item.summaryItems.join(', ')}
                  >
                    <p className="min-w-0 flex-1 truncate text-secondary text-text-muted">
                      {item.summaryItems[0]}
                    </p>
                    {item.summaryItems.length > 1 && (
                      <NexusSectionBadge variant="muted">
                        +{item.summaryItems.length - 1}
                      </NexusSectionBadge>
                    )}
                  </div>

                  <div className="hidden min-w-0 flex-col lg:flex" style={{ gap: 'var(--space-xs)' }}>
                    <strong className="whitespace-nowrap text-body font-bold tabular-nums text-text-main">
                      {compactDate(item.createdAt)}
                    </strong>
                    <span className="text-secondary tabular-nums text-text-muted">
                      {compactTime(item.createdAt)}
                    </span>
                  </div>

                  <div
                    className="col-span-2 flex min-w-0 items-center justify-between lg:col-span-1 lg:flex-col lg:items-end"
                    style={{ gap: 'var(--space-sm)' }}
                  >
                    <div className="flex min-w-0 flex-col lg:hidden" style={{ gap: 'var(--space-xs)' }}>
                      <strong className="text-body font-bold tabular-nums text-text-main">
                        {compactDate(item.createdAt)}
                      </strong>
                      <span className="text-secondary tabular-nums text-text-muted">
                        {compactTime(item.createdAt)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col items-end" style={{ gap: 'var(--space-xs)' }}>
                      <strong className="text-body font-bold tabular-nums text-text-main">
                        {money(item.amount)}
                      </strong>
                      <span className="text-secondary text-text-muted">
                        {item.unitCount}{' '}
                        {isOrder
                          ? item.unitCount === 1
                            ? 'unidad'
                            : 'unidades'
                          : item.unitCount === 1
                            ? 'boleto'
                            : 'boletos'}
                      </span>
                    </div>
                  </div>

                  <NexusSectionButton
                    type="button"
                    variant="secondary"
                    icon={ReceiptText}
                    onClick={() =>
                      isOrder
                        ? onOpenOrder(item.id)
                        : onOpenParticipation(item.id)
                    }
                    className="col-span-2 w-full lg:col-span-1"
                  >
                    Ver
                  </NexusSectionButton>
                </article>
              );
            })
          ) : (
            <p
              className="text-center text-secondary text-text-muted"
              style={{ paddingBlock: 'var(--space-lg)' }}
            >
              No hay movimientos para los filtros seleccionados.
            </p>
          )}
        </div>
      </NexusSection>

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
