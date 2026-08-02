import React from 'react';
import { Banknote, CheckCircle2, Clock3, ListChecks, XCircle } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousIcon } from '../ui/NexusIcon';

interface CommercialPulseMetric {
  count: number;
  amount: number;
}

interface CommercialPulse {
  confirmed: CommercialPulseMetric;
  pending: CommercialPulseMetric;
  cancelled: CommercialPulseMetric;
  conversionRate: number;
}

interface FinancialWeightWidgetProps {
  pulse?: CommercialPulse;
  description?: string;
  isLoading?: boolean;
}

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);

const FinancialWeightSkeleton = () => (
  <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
    <NexusAutonomousCard className="animate-pulse">
      <div
        className="flex items-center"
        style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
      >
        <div
          className="shrink-0 bg-bg-muted"
          style={{
            width: 'var(--size-button-autonomous)',
            height: 'var(--size-button-autonomous)',
            borderRadius: 'var(--radius-card-inner)',
          }}
        />
        <div className="flex flex-1 flex-col" style={{ gap: 'var(--space-xs)' }}>
          <div className="h-5 w-36 rounded-full bg-bg-muted" />
          <div className="h-3 w-52 rounded-full bg-bg-muted" />
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
        <div className="h-10 w-32 rounded-full bg-bg-muted" />
        <div className="h-2 w-full rounded-full bg-bg-muted" />
      </div>
    </NexusAutonomousCard>

    <NexusAutonomousCard className="animate-pulse">
      <div
        className="flex items-center"
        style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
      >
        <div
          className="shrink-0 bg-bg-muted"
          style={{
            width: 'var(--size-button-autonomous)',
            height: 'var(--size-button-autonomous)',
            borderRadius: 'var(--radius-card-inner)',
          }}
        />
        <div className="flex flex-1 flex-col" style={{ gap: 'var(--space-xs)' }}>
          <div className="h-5 w-40 rounded-full bg-bg-muted" />
          <div className="h-3 w-60 rounded-full bg-bg-muted" />
        </div>
      </div>
      <div
        className="grid grid-cols-1 border border-border-main bg-bg-muted sm:grid-cols-3"
        style={{
          borderRadius: 'var(--radius-card-inner)',
          padding: 'var(--padding-card-inner)',
          gap: 'var(--space-sm)',
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="min-h-20 border border-border-main bg-bg-card"
            style={{
              borderRadius: 'var(--radius-card-nested-compact)',
            }}
          />
        ))}
      </div>
    </NexusAutonomousCard>
  </div>
);

export const FinancialWeightWidget = ({
  pulse,
  description = 'Conversión de tienda y rifas en los últimos 7 días.',
  isLoading = false,
}: FinancialWeightWidgetProps) => {
  if (isLoading) return <FinancialWeightSkeleton />;

  const confirmed = pulse?.confirmed ?? { count: 0, amount: 0 };
  const pending = pulse?.pending ?? { count: 0, amount: 0 };
  const cancelled = pulse?.cancelled ?? { count: 0, amount: 0 };
  const conversionRate = Math.max(
    0,
    Math.min(100, pulse?.conversionRate || 0),
  );
  const metrics = [
    {
      label: 'Confirmadas',
      value: confirmed,
      icon: CheckCircle2,
      valueClassName: 'text-emerald-600',
      iconContainerClassName:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Por Cobrar',
      value: pending,
      icon: Clock3,
      valueClassName: 'text-amber-600',
      iconContainerClassName:
        'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      label: 'No Concretadas',
      value: cancelled,
      icon: XCircle,
      valueClassName: 'text-rose-600',
      iconContainerClassName: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
      <NexusAutonomousCard>
        <div className="flex flex-col">
          <div
            className="group/commercial flex min-w-0 items-center"
            style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
          >
            <NexusAutonomousIcon
              icon={Banknote}
              variant="emerald"
              hoverGroup="group/commercial"
            />
            <div
              className="flex min-w-0 flex-1 flex-col"
              style={{ gap: 'var(--space-xs)' }}
            >
              <h3 className="text-h1 text-text-main">Pulso Comercial</h3>
              <p className="text-secondary text-text-muted">{description}</p>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
            <div
              className="flex items-end justify-between"
              style={{ gap: 'var(--space-md)' }}
            >
              <div
                className="flex min-w-0 flex-col"
                style={{ gap: 'var(--space-xs)' }}
              >
                <span className="text-label uppercase text-text-muted">
                  Tasa de concreción
                </span>
                <strong className="text-display tabular-nums text-text-main">
                  {conversionRate.toLocaleString('es-MX', {
                    maximumFractionDigits: 1,
                  })}
                  %
                </strong>
              </div>
              <span className="text-right text-caption text-text-muted">
                {confirmed.count} de {confirmed.count + cancelled.count} resueltas
              </span>
            </div>

            <div
              className="h-2 overflow-hidden border border-border-main bg-bg-muted"
              style={{ borderRadius: 'var(--radius-card-nested-compact)' }}
              role="progressbar"
              aria-label="Tasa de concreción comercial"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(conversionRate)}
            >
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${conversionRate}%`,
                  transitionTimingFunction: 'var(--ease-emil)',
                }}
              />
            </div>
          </div>
        </div>
      </NexusAutonomousCard>

      <NexusAutonomousCard>
        <div
          className="group/operations flex min-w-0 items-center"
          style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
        >
          <NexusAutonomousIcon
            icon={ListChecks}
            variant="brand"
            hoverGroup="group/operations"
          />
          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--space-xs)' }}>
            <h3 className="text-h1 text-text-main">Estado de Operaciones</h3>
            <p className="text-secondary text-text-muted">
              Resumen de operaciones según su estado comercial.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 border border-border-main bg-bg-muted sm:grid-cols-3"
          style={{
            borderRadius: 'var(--radius-card-inner)',
            padding: 'var(--padding-card-inner)',
            gap: 'var(--space-sm)',
          }}
        >
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="flex min-w-0 flex-col border border-border-main bg-bg-card"
                style={{
                  gap: 'var(--space-sm)',
                  padding: 'var(--padding-card-nested)',
                  borderRadius: 'var(--radius-card-nested-compact)',
                }}
              >
                <div
                  className="flex min-w-0 items-center justify-between"
                  style={{ gap: 'var(--space-sm)' }}
                >
                  <span className="text-secondary font-semibold text-text-main">
                    {metric.label}
                  </span>
                  <div
                    className={`grid shrink-0 place-items-center border ${metric.iconContainerClassName}`}
                    style={{
                      width: 'var(--size-icon-container-card-nested)',
                      height: 'var(--size-icon-container-card-nested)',
                      borderRadius: 'var(--radius-card-nested-control)',
                    }}
                  >
                    <Icon
                      style={{
                        width: 'var(--size-inner-icon-card)',
                        height: 'var(--size-inner-icon-card)',
                      }}
                      strokeWidth={2}
                    />
                  </div>
                </div>
                <div
                  className="flex min-w-0 flex-col"
                  style={{ gap: 'var(--space-xs)' }}
                >
                  <strong
                    className={`text-h1 tabular-nums ${metric.valueClassName}`}
                  >
                    {money(metric.value.amount)}
                  </strong>
                  <span className="text-label text-text-muted">
                    {metric.value.count.toLocaleString('es-MX')}{' '}
                    {metric.value.count === 1 ? 'operación' : 'operaciones'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </NexusAutonomousCard>
    </div>
  );
};
