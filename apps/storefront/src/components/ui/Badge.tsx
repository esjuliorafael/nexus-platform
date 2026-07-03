import { HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'default' | 'success' | 'info' | 'warning' | 'danger' | 'muted' | 'outline' | 'overlay' | 'overlayBrand' | 'overlaySuccess' | 'overlayWarning' | 'overlayDanger';
  context?: 'section' | 'card' | 'autonomous' | 'default';
  icon?: LucideIcon;
}

export function Badge({ className, variant = 'default', context = 'default', icon: Icon, style, children, ...props }: BadgeProps) {
  const variants = {
    brand: 'bg-brand-50 text-brand-700 border border-brand-100',
    default: 'bg-stone-100 text-stone-600 border border-stone-200/60',
    success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    info: 'bg-blue-50 text-blue-700 border border-blue-100',
    warning: 'bg-amber-50 text-amber-600 border border-amber-100',
    danger: 'bg-red-50 text-red-600 border border-red-100',
    muted: 'bg-stone-100 text-stone-500 border border-stone-200/60',
    outline: 'border border-stone-200 text-stone-500',
    overlay: 'border border-white/10 bg-stone-950/45 text-white backdrop-blur-md',
    overlayBrand: 'border border-brand-400/30 bg-brand-500 text-white backdrop-blur-md',
    overlaySuccess: 'border border-emerald-400/30 bg-emerald-500/16 text-emerald-700 backdrop-blur-md',
    overlayWarning: 'border border-amber-400/35 bg-amber-500/16 text-amber-700 backdrop-blur-md',
    overlayDanger: 'border border-red-400/30 bg-red-500/16 text-red-700 backdrop-blur-md',
  };

  const radiusByContext = {
    section: 'var(--sf-radius-inner)',
    card: 'var(--sf-radius-nested)',
    autonomous: 'var(--sf-radius-card-inner)',
    default: 'var(--sf-radius-nested)',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center sf-text-label uppercase',
        variants[variant],
        className
      )}
      style={{
        gap: 'var(--sf-space-xs)',
        padding: 'var(--sf-space-xs) calc(var(--sf-space-sm) * 1.5)',
        borderRadius: radiusByContext[context],
        ...style,
      }}
      {...props}
    >
      {Icon && (
        <Icon
          strokeWidth={2.5}
          style={{
            width: 'var(--sf-size-inner-icon-badge)',
            height: 'var(--sf-size-inner-icon-badge)',
          }}
        />
      )}
      {children}
    </span>
  );
}

export const StorefrontBadge = Badge;
export const StorefrontSectionBadge = (props: Omit<BadgeProps, 'context'>) => (
  <Badge {...props} context="section" />
);
export const StorefrontCardBadge = (props: Omit<BadgeProps, 'context'>) => (
  <Badge {...props} context="card" />
);
export const StorefrontAutonomousBadge = (props: Omit<BadgeProps, 'context'>) => (
  <Badge {...props} context="autonomous" />
);
