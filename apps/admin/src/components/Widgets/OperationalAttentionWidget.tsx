import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeAlert,
  ClipboardCheck,
  PackageSearch,
  ShoppingBag,
  Ticket,
  Trophy,
} from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousIcon } from '../ui/NexusIcon';

interface AttentionStatus {
  count: number;
  amount: number;
}

interface OperationalAttentionWidgetProps {
  orders?: AttentionStatus;
  participations?: AttentionStatus;
  attention?: {
    paymentReviews: AttentionStatus;
    inventoryIncidents: number;
    rafflesAwaitingResolution: number;
    prizesAwaitingFulfillment: number;
  };
  isLoading?: boolean;
  onOpenOrders: () => void;
  onOpenParticipations: () => void;
  onOpenStore: () => void;
  onOpenRaffles: () => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);

export const OperationalAttentionWidget = ({
  orders,
  participations,
  attention,
  isLoading = false,
  onOpenOrders,
  onOpenParticipations,
  onOpenStore,
  onOpenRaffles,
}: OperationalAttentionWidgetProps) => {
  const contexts = [
    {
      label: 'Órdenes apartadas',
      description: 'Pedidos pendientes de confirmación.',
      status: orders ?? { count: 0, amount: 0 },
      icon: ShoppingBag,
      tone: 'amber',
      onClick: onOpenOrders,
    },
    {
      label: 'Participaciones apartadas',
      description: 'Boletos pendientes de confirmación.',
      status: participations ?? { count: 0, amount: 0 },
      icon: Ticket,
      tone: 'amber',
      onClick: onOpenParticipations,
    },
    {
      label: 'Pagos en revisión',
      description: 'Mercado Pago aún no entrega una resolución definitiva.',
      status: attention?.paymentReviews ?? { count: 0, amount: 0 },
      icon: BadgeAlert,
      tone: 'orange',
      onClick: onOpenOrders,
    },
    {
      label: 'Inventario por revisar',
      description: 'Hay incidencias de disponibilidad que requieren validación.',
      status: { count: attention?.inventoryIncidents ?? 0, amount: 0 },
      icon: PackageSearch,
      tone: 'rose',
      onClick: onOpenStore,
    },
    {
      label: 'Resultados pendientes',
      description: 'Rifas cuya fecha pasó y todavía requieren publicación.',
      status: { count: attention?.rafflesAwaitingResolution ?? 0, amount: 0 },
      icon: Trophy,
      tone: 'orange',
      onClick: onOpenRaffles,
    },
    {
      label: 'Premios por entregar',
      description: 'Ganadores con seguimiento o entrega todavía pendientes.',
      status: { count: attention?.prizesAwaitingFulfillment ?? 0, amount: 0 },
      icon: ClipboardCheck,
      tone: 'brand',
      onClick: onOpenRaffles,
    },
  ].filter((context) => isLoading || context.status.count > 0);

  if (!isLoading && contexts.length === 0) return null;

  return (
    <NexusAutonomousCard className={isLoading ? 'animate-pulse' : ''}>
      <div
        className="group/attention flex min-w-0 items-center"
        style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
      >
        <NexusAutonomousIcon
          icon={AlertTriangle}
          variant="orange"
          hoverGroup="group/attention"
        />
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: 'var(--space-xs)' }}
        >
          <h3 className="text-h1 text-text-main">Atención Operativa</h3>
          <p className="text-secondary text-text-muted">
            Excepciones que requieren seguimiento.
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 border border-border-main bg-bg-muted sm:grid-cols-2"
        style={{
          gap: 'var(--space-sm)',
          padding: 'var(--padding-card-inner)',
          borderRadius: 'var(--radius-card-inner)',
        }}
      >
        {contexts.map((context) => {
          const ContextIcon = context.icon;
          const hasAmount = context.status.amount > 0;
          const amountTone =
            context.tone === 'amber' || context.tone === 'orange'
              ? 'text-amber-600'
              : context.tone === 'rose'
                ? 'text-rose-600'
                : 'text-brand-600';

          return (
            <button
              key={context.label}
              type="button"
              onClick={context.onClick}
              disabled={isLoading}
              className="group/attention-row flex min-w-0 flex-col border border-border-main bg-bg-card text-left outline-none transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/30 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none"
              style={{
                gap: 'var(--space-md)',
                padding: 'var(--padding-card-nested)',
                borderRadius: 'var(--radius-card-nested-compact)',
              }}
            >
              <div
                className="flex min-w-0 items-start justify-between"
                style={{ gap: 'var(--space-sm)' }}
              >
                <div
                  className="flex min-w-0 items-center"
                  style={{ gap: 'var(--space-sm)' }}
                >
                  <div
                    className="grid shrink-0 place-items-center border border-border-main bg-bg-muted text-text-muted transition-colors duration-200 group-hover/attention-row:border-brand-200 group-hover/attention-row:bg-brand-50 group-hover/attention-row:text-brand-600"
                    style={{
                      width: 'var(--size-icon-container-card-nested)',
                      height: 'var(--size-icon-container-card-nested)',
                      borderRadius: 'var(--radius-card-nested-control)',
                    }}
                  >
                    <ContextIcon
                      style={{
                        width: 'var(--size-inner-icon-card)',
                        height: 'var(--size-inner-icon-card)',
                      }}
                      strokeWidth={2}
                    />
                  </div>
                  <span className="text-secondary font-semibold text-text-main">
                    {context.label}
                  </span>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="shrink-0 text-text-muted transition-transform duration-200 group-hover/attention-row:-translate-y-0.5 group-hover/attention-row:translate-x-0.5 group-hover/attention-row:text-brand-600"
                  size={16}
                  strokeWidth={2.2}
                />
              </div>

              <p className="text-label text-text-muted">{context.description}</p>

              <div
                className="flex items-end justify-between"
                style={{ gap: 'var(--space-sm)' }}
              >
                <strong className="text-h1 tabular-nums text-text-main">
                  {context.status.count.toLocaleString('es-MX')}
                </strong>
                {hasAmount && (
                  <span className={`text-label tabular-nums ${amountTone}`}>
                    {money(context.status.amount)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </NexusAutonomousCard>
  );
};
