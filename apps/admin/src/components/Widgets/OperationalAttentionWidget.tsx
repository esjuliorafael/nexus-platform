import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousIcon, NexusCardIcon } from '../ui/NexusIcon';

interface AttentionStatus {
  count: number;
  amount: number;
}

interface OperationalAttentionWidgetProps {
  orders?: AttentionStatus;
  participations?: AttentionStatus;
  isLoading?: boolean;
  onOpenOrders: () => void;
  onOpenParticipations: () => void;
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
  isLoading = false,
  onOpenOrders,
  onOpenParticipations,
}: OperationalAttentionWidgetProps) => {
  const contexts = [
    {
      label: 'Órdenes apartadas',
      description: 'Pedidos pendientes de confirmación.',
      status: orders ?? { count: 0, amount: 0 },
      icon: ShoppingBag,
      onClick: onOpenOrders,
    },
    {
      label: 'Participaciones apartadas',
      description: 'Boletos pendientes de confirmación.',
      status: participations ?? { count: 0, amount: 0 },
      icon: Ticket,
      onClick: onOpenParticipations,
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
          icon={AlertCircle}
          variant="orange"
          hoverGroup="group/attention"
        />
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: 'var(--space-xs)' }}
        >
          <h3 className="text-h1 text-text-main">Atención Pendiente</h3>
          <p className="text-secondary text-text-muted">
            Operaciones que todavía requieren seguimiento.
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        {contexts.map((context, index) => {
          const ContextIcon = context.icon;

          return (
            <button
              key={context.label}
              type="button"
              onClick={context.onClick}
              disabled={isLoading}
              className="group/attention-row flex min-w-0 items-center text-left outline-none transition-colors duration-200 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none"
              style={{
                gap: 'var(--space-md)',
                paddingBlock: 'var(--space-md)',
                borderTop:
                  index > 0 ? '1px solid var(--border-main)' : undefined,
                borderRadius: 'var(--radius-card-inner)',
              }}
            >
              <NexusCardIcon
                icon={ContextIcon}
                variant="orange"
                hoverGroup="group/attention-row"
                isMuted={isLoading}
              />
              <div
                className="flex min-w-0 flex-1 flex-col"
                style={{ gap: 'var(--space-xs)' }}
              >
                <span className="text-button-card font-bold text-text-main">
                  {context.label}
                </span>
                <span className="text-caption text-text-muted">
                  {context.description}
                </span>
              </div>
              <div
                className="flex shrink-0 flex-col items-end"
                style={{ gap: 'var(--space-xs)' }}
              >
                <strong className="text-h2 tabular-nums text-text-main">
                  {context.status.count.toLocaleString('es-MX')}
                </strong>
                <span className="text-caption tabular-nums text-amber-600">
                  {money(context.status.amount)}
                </span>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="shrink-0 text-text-muted transition-transform duration-200 group-hover/attention-row:translate-x-1 group-hover/attention-row:text-brand-600"
                size={18}
                strokeWidth={2.4}
              />
            </button>
          );
        })}
      </div>
    </NexusAutonomousCard>
  );
};
