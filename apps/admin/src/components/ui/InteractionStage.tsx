import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InteractionStageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
  isDashed?: boolean;
  size?: 'normal' | 'compact';
  level?: 1 | 2;
}

export const InteractionStage: React.FC<InteractionStageProps> = ({
  icon: Icon,
  title,
  description,
  action,
  onClick,
  onDragOver,
  onDrop,
  className = '',
  isDashed = true,
  size = 'normal',
  level = 2
}) => {
  const isLevel1 = level === 1;
  
  // Fórmulas de Geometría y Estilo por Nivel
  const containerRadius = isLevel1 ? 'var(--radius-outer)' : 'var(--radius-inner-visual)';
  const iconContainerRadius = isLevel1 ? 'var(--radius-inner-visual)' : 'var(--radius-nested-simple)';
  const paddingStyle = isLevel1 ? 'calc(var(--space-lg) * 2)' : 'var(--space-lg)';
  const titleClass = isLevel1 ? 'text-h1' : 'text-h2';

  return (
    <div 
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        text-center animate-in fade-in zoom-in-95 duration-700 cursor-pointer group
        transition-all duration-500 flex flex-col justify-center items-center
        ${isDashed ? 'border-2 border-dashed border-border-main/60 hover:border-brand-300 hover:bg-brand-50/10' : ''}
        ${className}
      `}
      style={{ borderRadius: containerRadius, padding: `${paddingStyle} 0` }}
    >
      <div 
        className={`
          relative flex items-center justify-center mx-auto
          transition-all duration-700 group-hover:scale-110 group-hover:rotate-3
          ${isDashed ? 'bg-bg-card border border-border-main/50 text-stone-300 group-hover:text-brand-500 shadow-sm' : 'bg-bg-muted text-text-muted/20 border border-border-main/50'}
        `}
        style={{ 
          width: isLevel1 ? 'var(--size-stage-container)' : 'var(--size-stage-container-compact)',
          height: isLevel1 ? 'var(--size-stage-container)' : 'var(--size-stage-container-compact)',
          marginBottom: isLevel1 ? 'var(--space-lg)' : 'var(--space-md)',
          borderRadius: iconContainerRadius
        }}
      >
        {/* Subtle internal grid for EmptyState feel */}
        {!isDashed && (
          <div className="absolute inset-0 opacity-[0.1]" 
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '12px 12px' }} />
        )}
        <Icon 
          style={{ 
            width: isLevel1 ? 'var(--size-stage-icon)' : 'var(--size-stage-icon-compact)',
            height: isLevel1 ? 'var(--size-stage-icon)' : 'var(--size-stage-icon-compact)'
          }}
          strokeWidth={1} 
          className="relative z-10" 
        />
      </div>
      
      <h3 className={`${titleClass} text-text-main mb-4 group-hover:text-brand-700 transition-colors`}>
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
