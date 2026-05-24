import React from 'react';
import { LucideIcon } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousIcon } from '../ui/NexusIcon';

type ProductMetricVariant = 'brand' | 'muted' | 'blue' | 'emerald' | 'orange' | 'solid-brand';

interface ProductMetricWidgetProps {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: ProductMetricVariant;
  signal?: string;
  percentage?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

const getVariantStyles = (variant: ProductMetricVariant) => {
  if (variant === 'emerald') {
    return {
      text: 'text-emerald-600',
      surface: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      accent: 'bg-emerald-500'
    };
  }

  if (variant === 'orange') {
    return {
      text: 'text-amber-600',
      surface: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-100 dark:border-amber-900/30',
      accent: 'bg-amber-500'
    };
  }

  if (variant === 'blue') {
    return {
      text: 'text-blue-600',
      surface: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-100 dark:border-blue-900/30',
      accent: 'bg-blue-500'
    };
  }

  return {
    text: 'text-brand-600',
    surface: 'bg-brand-50 dark:bg-brand-950/20',
    border: 'border-brand-100 dark:border-brand-900/30',
    accent: 'bg-brand-500'
  };
};

export const ProductMetricWidget: React.FC<ProductMetricWidgetProps> = ({
  label,
  value,
  icon,
  variant,
  signal,
  percentage,
  isLoading = false,
  onClick
}) => {
  if (isLoading) {
    return (
      <NexusAutonomousCard className="flex-1 h-full animate-pulse">
        <div className="h-full flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between">
            <div className="w-[var(--size-icon-autonomous)] h-[var(--size-icon-autonomous)] rounded-2xl bg-stone-100 dark:bg-stone-800" />
            <div className="h-6 w-20 bg-stone-100 dark:bg-stone-800 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-stone-100 dark:bg-stone-800 rounded-full" />
            <div className="h-8 w-16 bg-stone-100 dark:bg-stone-800 rounded-full" />
          </div>
          <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full" />
        </div>
      </NexusAutonomousCard>
    );
  }

  const resolvedVariant: ProductMetricVariant = variant ?? 'brand';
  const styles = getVariantStyles(resolvedVariant);
  const safePercentage = typeof percentage === 'number' && Number.isFinite(percentage)
    ? Math.max(0, Math.min(100, percentage))
    : null;

  return (
    <NexusAutonomousCard
      className={`flex-1 h-full group/metric overflow-hidden relative ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
      onClick={onClick}
    >
      <div className="relative z-10 h-full flex flex-col justify-between" style={{ gap: 'var(--space-md)' }}>
        <div className="flex items-start justify-between" style={{ gap: 'var(--space-md)' }}>
          <NexusAutonomousIcon icon={icon} variant={resolvedVariant} hoverGroup="group/metric" />

          {signal && (
            <span
              className={`text-label uppercase border shrink-0 ${styles.surface} ${styles.border} ${styles.text}`}
              style={{ borderRadius: 'var(--radius-card-nested)', padding: '0.25rem 0.5rem' }}
            >
              {signal}
            </span>
          )}
        </div>

        <div className="min-w-0 py-1">
          <p className="text-label uppercase text-text-muted truncate">
            {label}
          </p>
          <div className="flex items-baseline mt-2" style={{ gap: 'var(--space-xs)' }}>
            <span className="text-h1 text-text-main tabular-nums leading-none">
              {value.toLocaleString('es-MX')}
            </span>
            <span className="text-label uppercase text-text-muted">uds.</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between border-t border-border-main/60 pt-3" style={{ gap: 'var(--space-md)' }}>
            <span className="text-label uppercase text-text-muted">Peso</span>
            <span className="text-secondary font-bold text-text-main tabular-nums">
              {safePercentage !== null ? `${safePercentage.toFixed(1)}%` : 'N/D'}
            </span>
          </div>

          {safePercentage !== null && (
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
          )}
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
