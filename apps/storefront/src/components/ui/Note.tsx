import type { HTMLAttributes, ReactNode } from 'react';
import { type LucideIcon, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type StorefrontNoteTone = 'default' | 'warning' | 'inverse';

interface StorefrontNoteProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: StorefrontNoteTone;
}

const toneClasses: Record<StorefrontNoteTone, string> = {
  default: 'border-stone-200 bg-stone-50/70 text-stone-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  inverse: 'border-white/10 bg-white/5 text-stone-300',
};

const iconClasses: Record<StorefrontNoteTone, string> = {
  default: 'text-stone-500',
  warning: 'text-amber-700',
  inverse: 'text-brand-400',
};

export function StorefrontNote({
  children,
  className,
  icon: Icon = Info,
  tone = 'default',
  style,
  ...props
}: StorefrontNoteProps) {
  return (
    <div
      className={cn('flex items-center border', toneClasses[tone], className)}
      style={{
        borderRadius: 'var(--sf-radius-card-inner)',
        padding: 'var(--sf-padding-inner)',
        gap: 'var(--sf-space-md)',
        ...style,
      }}
      {...props}
    >
      <Icon
        className={cn('shrink-0', iconClasses[tone])}
        style={{
          width: 'var(--sf-size-inner-icon-card)',
          height: 'var(--sf-size-inner-icon-card)',
        }}
        strokeWidth={2}
        aria-hidden="true"
      />
      <div className="sf-text-secondary min-w-0">{children}</div>
    </div>
  );
}
