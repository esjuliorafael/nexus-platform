import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`py-20 text-center animate-in fade-in zoom-in-95 duration-700 ${className}`}>
      <div className="relative w-28 h-28 bg-bg-muted rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-text-muted/20 border border-border-main/50 overflow-hidden">
        {/* Subtle internal grid */}
        <div className="absolute inset-0 opacity-[0.1]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '12px 12px' }} />
        <Icon size={52} strokeWidth={1} className="relative z-10" />
      </div>
      <h3 className="text-display text-text-main mb-4">
        {title}
      </h3>
      <p className="text-secondary text-text-muted max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <div className="mt-12">
          {action}
        </div>
      )}
    </div>
  );
};
