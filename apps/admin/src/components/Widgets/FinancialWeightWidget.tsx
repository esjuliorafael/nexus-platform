import React from 'react';
import { Banknote, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousIcon, NexusCardIcon } from '../ui/NexusIcon';

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
  <NexusAutonomousCard className="h-full min-h-[320px] animate-pulse">
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
      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ gap: 'var(--space-md)' }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 border border-border-main bg-bg-muted"
            style={{ borderRadius: 'var(--radius-card-nested)' }}
          />
        ))}
      </div>
    </div>
  </NexusAutonomousCard>
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
      label: 'Confirmado',
      value: confirmed,
      icon: CheckCircle2,
      iconVariant: 'emerald' as const,
      valueClassName: 'text-emerald-600',
    },
    {
      label: 'Por cobrar',
      value: pending,
      icon: Clock3,
      iconVariant: 'orange' as const,
      valueClassName: 'text-amber-600',
    },
    {
      label: 'No concretado',
      value: cancelled,
      icon: XCircle,
      iconVariant: 'rose' as const,
      valueClassName: 'text-rose-600',
    },
  ];

  return (
    <NexusAutonomousCard className="h-full min-h-[320px]">
      <div className="flex h-full flex-col">
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
            <p className="text-secondary text-text-muted">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
          <div className="flex items-end justify-between" style={{ gap: 'var(--space-md)' }}>
            <div className="flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)' }}>
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

        <div
          className="mt-auto grid grid-cols-1 sm:grid-cols-3"
          style={{ gap: 'var(--space-md)', paddingTop: 'var(--space-lg)' }}
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex min-w-0 flex-col border border-border-main bg-bg-muted"
              style={{
                gap: 'var(--space-sm)',
                padding: 'var(--padding-card-inner)',
                borderRadius: 'var(--radius-card-nested)',
              }}
            >
              <div
                className="flex min-w-0 items-center justify-between"
                style={{ gap: 'var(--space-sm)' }}
              >
                <span className="truncate text-label uppercase text-text-muted">
                  {metric.label}
                </span>
                <NexusCardIcon
                  icon={metric.icon}
                  variant={metric.iconVariant}
                  isMuted={metric.value.count === 0}
                />
              </div>
              <strong
                className={`truncate text-secondary tabular-nums ${metric.valueClassName}`}
              >
                {money(metric.value.amount)}
              </strong>
              <span className="text-caption text-text-muted">
                {metric.value.count.toLocaleString('es-MX')}{' '}
                {metric.value.count === 1 ? 'operación' : 'operaciones'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
