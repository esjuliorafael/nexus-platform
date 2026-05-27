import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
  context?: 'section' | 'card' | 'default';
}

export function Badge({ className, variant = 'default', context = 'default', style, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-stone-100 text-stone-600 border border-stone-200/60',
    success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border border-amber-100',
    danger: 'bg-red-50 text-red-600 border border-red-100',
    outline: 'border border-stone-200 text-stone-500',
  };

  const radiusByContext = {
    section: 'var(--sf-radius-inner)',
    card: 'var(--sf-radius-nested)',
    default: '999px',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 sf-text-label',
        variants[variant],
        className
      )}
      style={{
        borderRadius: radiusByContext[context],
        ...style,
      }}
      {...props}
    />
  );
}
