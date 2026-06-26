import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface StorefrontCardProps extends HTMLAttributes<HTMLDivElement> {
  level?: 1 | 2 | 3;
  density?: 'default' | 'compact' | 'micro' | 'none';
  interactive?: boolean;
  muted?: boolean;
}

export function StorefrontCard({
  className,
  level = 1,
  density = 'default',
  interactive = false,
  muted = false,
  style,
  ...props
}: StorefrontCardProps) {
  const radius = {
    1: 'var(--sf-radius-outer)',
    2: 'var(--sf-radius-card-inner)',
    3: 'var(--sf-radius-card-nested)',
  }[level];

  const paddings =
    density === 'none'
      ? {
          1: '0',
          2: '0',
          3: '0',
        }
      : {
          1: density === 'compact' ? 'var(--sf-padding-inner)' : 'var(--sf-padding-outer)',
          2: density === 'micro' ? 'var(--sf-space-base)' : 'var(--sf-padding-inner)',
          3: density === 'micro' ? 'var(--sf-space-sm)' : 'var(--sf-space-md)',
        };

  return (
    <div
      className={cn(
        'bg-white border border-stone-200/60 shadow-sm transition-all duration-300',
        interactive && 'hover:border-brand-500/20 hover:shadow-xl hover:shadow-brand-500/5 active:scale-[0.99]',
        muted && 'opacity-60 grayscale-[0.35]',
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

export const StorefrontAutonomousCard = (props: Omit<StorefrontCardProps, 'level'>) => (
  <StorefrontCard {...props} level={1} density={props.density || 'compact'} />
);

export const StorefrontSectionCard = (props: Omit<StorefrontCardProps, 'level'>) => (
  <StorefrontCard {...props} level={2} />
);

export const StorefrontNestedCard = (props: Omit<StorefrontCardProps, 'level'>) => (
  <StorefrontCard {...props} level={3} />
);
