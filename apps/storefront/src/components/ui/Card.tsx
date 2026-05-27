import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface StorefrontCardProps extends HTMLAttributes<HTMLDivElement> {
  level?: 1 | 2 | 3;
  interactive?: boolean;
}

export function StorefrontCard({
  className,
  level = 1,
  interactive = false,
  style,
  ...props
}: StorefrontCardProps) {
  const radius = {
    1: 'var(--sf-radius-outer)',
    2: 'var(--sf-radius-inner)',
    3: 'var(--sf-radius-nested)',
  }[level];

  const paddings = {
    1: 'var(--sf-padding-outer)',
    2: 'var(--sf-padding-inner)',
    3: 'var(--sf-space-md)',
  };

  return (
    <div
      className={cn(
        'bg-white border border-stone-200/60 shadow-sm transition-all duration-300',
        interactive && 'hover:border-brand-500/20 hover:shadow-xl hover:shadow-brand-500/5 active:scale-[0.99]',
        className
      )}
      style={{
        borderRadius: radius,
        padding: paddings[level as keyof typeof paddings],
        transitionTimingFunction: 'var(--sf-ease)',
        ...style,
      }}
      {...props}
    />
  );
}
