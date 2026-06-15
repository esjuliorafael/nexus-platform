import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  level?: 1 | 2;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  level = 1
}) => {
  const isLevel1 = level === 1;
  
  // Geometría Recursiva Estricta
  const iconRadius = isLevel1 ? 'var(--radius-inner-visual)' : 'var(--radius-nested-simple)';
  const titleClass = isLevel1 ? 'text-h1' : 'text-h2';
  const paddingStyle = isLevel1 ? 'calc(var(--space-lg) * 2)' : 'var(--space-lg)';
  
  return (
    <div 
      className={`text-center animate-in fade-in zoom-in-95 duration-700 ${className}`}
      style={{ padding: `${paddingStyle} 0` }}
    >
      <div 
        className="relative bg-bg-muted flex items-center justify-center mx-auto text-text-muted/20 border border-border-main/50 overflow-hidden"
        style={{ 
          width: isLevel1 ? 'var(--size-stage-container)' : 'var(--size-stage-container-compact)',
          height: isLevel1 ? 'var(--size-stage-container)' : 'var(--size-stage-container-compact)',
          marginBottom: isLevel1 ? 'var(--space-lg)' : 'var(--space-md)',
          borderRadius: iconRadius
        }}
      >
        {/* Subtle internal grid */}
        <div className="absolute inset-0 opacity-[0.1]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '12px 12px' }} />
        <Icon 
          style={{ 
            width: isLevel1 ? 'var(--size-stage-icon)' : 'var(--size-stage-icon-compact)',
            height: isLevel1 ? 'var(--size-stage-icon)' : 'var(--size-stage-icon-compact)'
          }}
          strokeWidth={1} 
          className="relative z-10" 
        />
      </div>
      <h3 className={`${titleClass} text-text-main mb-4`}>
        {title}
      </h3>
      <p className="text-secondary text-text-muted max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <div className={isLevel1 ? 'mt-12' : 'mt-8'}>
          {action}
        </div>
      )}
    </div>
  );
};
