import { HTMLAttributes, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StorefrontIcon } from './Icon';

interface StorefrontSectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function StorefrontSection({
  title,
  eyebrow,
  description,
  icon,
  action,
  children,
  className,
  style,
  ...props
}: StorefrontSectionProps) {
  const hasHeader = title || eyebrow || description || icon || action;

  return (
    <section
      className={cn('relative', className)}
      style={{ paddingBlock: 'var(--sf-space-xl)', ...style }}
      {...props}
    >
      {hasHeader && (
        <div
          className="flex flex-col justify-between md:flex-row md:items-end"
          style={{ marginBottom: 'var(--sf-space-lg)', gap: 'var(--sf-space-md)' }}
        >
          <div className="flex max-w-3xl items-start" style={{ gap: 'var(--sf-space-md)' }}>
            {icon && <StorefrontIcon icon={icon} context="section" />}
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
              {eyebrow && <p className="sf-text-label text-brand-500">{eyebrow}</p>}
              {title && <h2 className="sf-text-display text-stone-850 uppercase">{title}</h2>}
              {description && <p className="sf-text-body max-w-2xl text-stone-500">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
