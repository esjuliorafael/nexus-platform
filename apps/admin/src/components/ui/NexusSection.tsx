import React from 'react';
import { LucideIcon } from 'lucide-react';
import { NexusSectionIcon } from './NexusIcon';

interface NexusSectionProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconVariant?: 'brand' | 'muted' | 'blue' | 'emerald' | 'rose';
  children: React.ReactNode;
  action?: React.ReactNode;
  actionPlacement?: 'header' | 'below';
  actionClassName?: string;
  className?: string;
  delay?: string;
  animate?: boolean;
}

export const NexusSection: React.FC<NexusSectionProps> = ({ 
  title, 
  subtitle, 
  icon, 
  iconVariant = 'muted',
  children, 
  action,
  actionPlacement = 'header',
  actionClassName = '',
  className = '',
  delay = '0ms',
  animate = true
}) => {
  return (
    <section 
      className={`relative bg-bg-card border border-border-main shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-stone-200/30 dark:hover:shadow-none overflow-hidden group/section flex flex-col ${animate ? 'animate-in fade-in slide-in-from-bottom-4 duration-600' : ''} ${className}`}
      style={{ 
        animationDelay: delay,
        animationTimingFunction: 'var(--ease-emil)',
        animationFillMode: 'both',
        borderRadius: 'var(--radius-outer)',
        padding: 'var(--padding-outer)'
      }}
    >
      {/* Header Area */}
      <div
        className="flex flex-col border-b border-border-main relative z-10 group/header"
        style={{ 
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)',
          paddingBottom: 'var(--space-md)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: 'var(--space-lg)' }}>
          <div
            className="flex min-w-0 flex-col transition-transform duration-500 group-hover/header:translate-x-1"
            style={{ gap: 'var(--space-sm)' }}
          >
            <div className="flex min-w-0 items-center" style={{ gap: 'var(--space-md)' }}>
              <div className="animate-in zoom-in-75 duration-700 [animation-fill-mode:both]" style={{ animationDelay: delay }}>
                <NexusSectionIcon
                  icon={icon}
                  variant={iconVariant}
                  hoverGroup="group/section"
                />
              </div>
              <div className="animate-in fade-in slide-in-from-left-4 duration-700 [animation-fill-mode:both] flex min-w-0 flex-col" style={{ gap: 'var(--space-xs)', animationDelay: delay }}>
                <h3 className="text-h1 text-text-main">
                  {title}
                </h3>
                {subtitle && (
                  <p className="hidden text-secondary text-text-muted sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {subtitle && (
              <p
                className="animate-in fade-in slide-in-from-left-4 text-secondary text-text-muted [animation-fill-mode:both] sm:hidden"
                style={{ animationDelay: delay }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {action && actionPlacement === 'header' && (
            <div className={`w-full sm:w-auto shrink-0 [&>button]:w-full sm:[&>button]:w-auto animate-in fade-in zoom-in-95 duration-700 [animation-fill-mode:both] ${actionClassName}`} style={{ animationDelay: delay }}>
              {action}
            </div>
          )}
        </div>

        {action && actionPlacement === 'below' && (
          <div
            className={`w-full [&>button]:w-full animate-in fade-in zoom-in-95 duration-700 [animation-fill-mode:both] ${actionClassName}`}
            style={{ animationDelay: delay }}
          >
            {action}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 h-full">
        {children}
      </div>
    </section>
  );
};
