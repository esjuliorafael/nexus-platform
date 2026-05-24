import React from 'react';
import { LucideIcon } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousIcon } from '../ui/NexusIcon';

interface StatusMetricWidgetProps {
  label: string;
  count: number;
  amount: number;
  percentage: number;
  icon: LucideIcon;
  variant: 'emerald' | 'brand' | 'muted';
  isLoading?: boolean;
}

const formatMoney = (value: number) =>
  value.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });

const getVariantStyles = (variant: StatusMetricWidgetProps['variant']) => {
  if (variant === 'emerald') {
    return {
      accent: 'bg-emerald-500',
      text: 'text-emerald-600',
      surface: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      signal: 'Pagado'
    };
  }

  if (variant === 'brand') {
    return {
      accent: 'bg-amber-500',
      text: 'text-amber-600',
      surface: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-100 dark:border-amber-900/30',
      signal: 'Pendiente'
    };
  }

  return {
    accent: 'bg-rose-500',
    text: 'text-rose-600',
    surface: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-100 dark:border-rose-900/30',
    signal: 'Cancelado'
  };
};

export const StatusMetricWidget: React.FC<StatusMetricWidgetProps> = ({
  label,
  count,
  amount,
  percentage,
  icon,
  variant,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <NexusAutonomousCard className="h-full animate-pulse">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="w-[var(--size-icon-autonomous)] h-[var(--size-icon-autonomous)] rounded-2xl bg-stone-100 dark:bg-stone-800" />
            <div className="h-6 w-14 bg-stone-100 dark:bg-stone-800 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-stone-100 dark:bg-stone-800 rounded-full" />
            <div className="h-8 w-24 bg-stone-100 dark:bg-stone-800 rounded-full" />
          </div>
          <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full" />
        </div>
      </NexusAutonomousCard>
    );
  }

  const styles = getVariantStyles(variant);
  const safePercentage = Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0;

  return (
    <NexusAutonomousCard className="h-full flex flex-col group/metric overflow-hidden relative">
      <div className="flex items-center justify-between relative z-10" style={{ gap: 'var(--space-md)' }}>
        <NexusAutonomousIcon icon={icon} variant={variant} hoverGroup="group/metric" />
        <div
          className={`shrink-0 border ${styles.surface} ${styles.border} ${styles.text}`}
          style={{ borderRadius: 'var(--radius-card-nested)', padding: '0.25rem 0.5rem' }}
        >
          <span className="text-label uppercase tabular-nums">{safePercentage.toFixed(1)}%</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-between mt-4">
        <div>
          <p className="text-label uppercase text-text-muted truncate">{label}</p>
          <div className="flex items-end justify-between mt-2" style={{ gap: 'var(--space-md)' }}>
            <div className="flex items-baseline" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-h1 text-text-main tabular-nums">{count.toLocaleString('es-MX')}</span>
              <span className="text-label uppercase text-text-muted">ord.</span>
            </div>
            <span className={`text-label uppercase ${styles.text}`}>{styles.signal}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between border-t border-border-main/60 pt-3" style={{ gap: 'var(--space-md)' }}>
            <span className="text-label uppercase text-text-muted">Impacto</span>
            <span className="text-secondary font-bold text-text-main tabular-nums text-right">{formatMoney(amount)}</span>
          </div>

          <div
            className="h-1.5 bg-bg-muted border border-border-main overflow-hidden mt-3"
            style={{ borderRadius: 'var(--radius-card-nested)' }}
            aria-label={`${label}: ${safePercentage.toFixed(1)}%`}
          >
            <div
              className={`h-full ${styles.accent} transition-all duration-700`}
              style={{ width: `${safePercentage}%`, transitionTimingFunction: 'var(--ease-emil)' }}
            />
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
