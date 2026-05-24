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
  className = '',
  delay = '0ms',
  animate = true
}) => {
  return (
    <section 
      className={`relative bg-bg-card border border-border-main shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-stone-200/30 dark:hover:shadow-none overflow-hidden group/section ${animate ? 'animate-in fade-in slide-in-from-bottom-4 duration-600' : ''} ${className}`}
      style={{ 
        animationDelay: delay,
        animationTimingFunction: 'var(--ease-emil)',
        animationFillMode: 'both',
        borderRadius: 'var(--radius-outer)',
        padding: 'var(--padding-outer)'
      }}
    >
      {/* Technical Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Mesh/Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        {/* Top-right subtle glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl transition-transform duration-1000 group-hover/section:scale-125" />
      </div>

      {/* Header Area */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-main relative z-10 group/header"
        style={{ 
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)',
          paddingBottom: 'var(--space-md)'
        }}
      >
        <div className="flex items-center transition-transform duration-500 group-hover/header:translate-x-1" style={{ gap: 'var(--space-md)' }}>
          <div className="animate-in zoom-in-75 duration-700 [animation-fill-mode:both]" style={{ animationDelay: delay }}>
            <NexusSectionIcon 
              icon={icon} 
              variant={iconVariant} 
              hoverGroup="group/section" 
            />
          </div>
          <div className="animate-in fade-in slide-in-from-left-4 duration-700 [animation-fill-mode:both] flex flex-col" style={{ gap: 'var(--space-xs)', animationDelay: delay }}>
            <h3 className="text-h1 text-text-main">
              {title}
            </h3>
            {subtitle && (
              <p className="text-secondary text-text-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="w-full sm:w-auto shrink-0 [&>button]:w-full sm:[&>button]:w-auto animate-in fade-in zoom-in-95 duration-700 [animation-fill-mode:both]" style={{ animationDelay: delay }}>
            {action}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
};
