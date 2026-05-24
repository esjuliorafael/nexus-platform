import React from 'react';
import { LucideIcon } from 'lucide-react';
import { NexusSectionIcon, NexusAutonomousIcon } from './NexusIcon';

interface NexusHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconVariant?: 'brand' | 'muted' | 'blue' | 'emerald' | 'orange' | 'solid-brand';
  action?: React.ReactNode;
  className?: string;
  /**
   * Determina el espaciado inferior y el radio del icono.
   * 'section' usa space-lg y NexusSectionIcon (radius-inner-visual)
   * 'widget' usa space-md y NexusAutonomousIcon (radius-card-inner)
   */
  context?: 'section' | 'widget';
}

export const NexusHeader: React.FC<NexusHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconVariant = 'muted',
  action,
  className = '',
  context = 'widget'
}) => {
  const isSection = context === 'section';
  
  return (
    <div
      className={`flex items-center justify-between group/header ${className}`}
      style={{
        marginBottom: isSection ? 'var(--space-lg)' : 'var(--space-md)',
        gap: 'var(--space-md)'
      }}
    >
      <div className="flex items-center min-w-0" style={{ gap: 'var(--space-md)' }}>
        {isSection ? (
          <NexusSectionIcon
            icon={icon}
            variant={iconVariant}
            hoverGroup="group/header"
          />
        ) : (
          <NexusAutonomousIcon
            icon={icon}
            variant={iconVariant}
            hoverGroup="group/header"
          />
        )}
        <div className="flex flex-col min-w-0" style={{ gap: 'var(--space-xs)' }}>
          <h3 className="text-h2 text-text-main font-bold truncate group-hover/header:text-brand-600 transition-colors duration-500">
            {title}
          </h3>
          {subtitle && (
            <p className="text-label uppercase tracking-[0.15em] text-text-muted/60 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 animate-in fade-in zoom-in-95 duration-500">
          {action}
        </div>
      )}
    </div>
  );
};
