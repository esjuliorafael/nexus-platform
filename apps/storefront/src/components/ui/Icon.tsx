import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StorefrontIconProps {
  icon: LucideIcon;
  variant?: 'brand' | 'muted' | 'dark' | 'success' | 'warning' | 'error';
  context?: 'section' | 'card' | 'autonomous';
  className?: string;
}

export function StorefrontIcon({
  icon: Icon,
  variant = 'brand',
  context = 'card',
  className,
}: StorefrontIconProps) {
  const variants = {
    brand: 'bg-brand-50 text-brand-500 border-brand-100 shadow-brand-500/5',
    muted: 'bg-stone-100 text-stone-500 border-stone-200 shadow-stone-900/5',
    dark: 'bg-stone-900 text-white border-stone-800 shadow-stone-900/20',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5',
    warning: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/5',
    error: 'bg-red-50 text-red-500 border-red-100 shadow-red-500/5',
  };

  const isSection = context === 'section';
  const isAutonomous = context === 'autonomous';
  const size = isSection || isAutonomous ? 'var(--sf-size-icon-section)' : 'var(--sf-size-icon-card)';
  const innerSize = isSection || isAutonomous ? 'var(--sf-size-inner-icon-section)' : 'var(--sf-size-inner-icon-card)';
  const radius = isSection
    ? 'var(--sf-radius-inner)'
    : isAutonomous
      ? 'var(--sf-radius-card-inner)'
      : 'var(--sf-radius-nested)';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-105',
        variants[variant],
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        transitionTimingFunction: 'var(--sf-ease)',
      }}
    >
      <Icon
        size={innerSize}
        strokeWidth={1.7}
      />
    </div>
  );
}

export const StorefrontSectionIcon = (props: Omit<StorefrontIconProps, 'context'>) => (
  <StorefrontIcon {...props} context="section" />
);

export const StorefrontCardIcon = (props: Omit<StorefrontIconProps, 'context'>) => (
  <StorefrontIcon {...props} context="card" />
);

export const StorefrontAutonomousIcon = (props: Omit<StorefrontIconProps, 'context'>) => (
  <StorefrontIcon {...props} context="autonomous" />
);
