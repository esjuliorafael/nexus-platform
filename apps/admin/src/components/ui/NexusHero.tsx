import React from 'react';
import { LucideIcon } from 'lucide-react';
import { NexusHeroIcon } from './NexusIcon';

interface NexusHeroProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  variant?: 'warning' | 'success' | 'brand' | 'default' | 'dark';
  badge?: string;
  badgeValue?: string;
  className?: string;
}

export const NexusHero: React.FC<NexusHeroProps> = ({ 
  title, 
  subtitle, 
  icon, 
  variant = 'default', 
  badge, 
  badgeValue, 
  className = '' 
}) => {
  const variantClasses = {
    warning: 'bg-stone-900 text-white border-stone-800 shadow-xl shadow-stone-900/10',
    success: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/20',
    brand: 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20',
    default: 'bg-bg-card text-text-main border-border-main shadow-sm',
    dark: 'bg-stone-900 text-white border-stone-800 shadow-xl shadow-black/40'
  };

  const isDefault = variant === 'default';

  return (
    <div 
      className={`relative border flex flex-col sm:flex-row items-start sm:items-center justify-between overflow-hidden group/hero transition-all duration-700 active:scale-[0.995] animate-in fade-in slide-in-from-bottom-6 duration-700 ${variantClasses[variant]} ${className}`}
      style={{ 
        transitionTimingFunction: 'var(--ease-emil)',
        borderRadius: 'var(--radius-outer)',
        padding: 'var(--padding-outer)',
        gap: 'var(--space-lg)'
      }}
    >
      {/* Technical Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Mesh/Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        {/* Top-right subtle glow */}
        <div className={`absolute -top-24 -right-24 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-[80px] sm:blur-[100px] transition-transform duration-1000 group-hover/hero:scale-110 ${
          isDefault ? 'bg-brand-400 opacity-20' : 'bg-white opacity-10'
        }`} />
      </div>

      <div className="relative z-10 flex items-center" style={{ gap: 'var(--space-md)' }}>
        <NexusHeroIcon 
          icon={icon} 
          variant={isDefault ? 'brand' : 'solid-brand'}
          className={!isDefault ? 'bg-white/10 backdrop-blur-md border-white/20 text-white' : ''}
        />
        
        <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-300 [animation-fill-mode:both] flex flex-col" style={{ gap: 'var(--space-xs)' }}>
          <h2 className={`text-hero font-black leading-none ${isDefault ? 'text-text-main' : 'text-white'}`}>
            {title}
          </h2>
          <p className={`text-label uppercase tracking-[0.2em] font-bold ${
            isDefault ? 'text-text-muted/60' : 'text-white/60'
          }`}>
            {subtitle}
          </p>
        </div>
      </div>

      {badge && badgeValue && (
        <div 
          className={`relative z-10 border text-left sm:text-right w-full sm:w-auto shadow-lg animate-in zoom-in-95 slide-in-from-right-4 duration-700 delay-500 [animation-fill-mode:both] flex flex-col group/badge transition-transform duration-500 hover:-translate-y-1 ${
            isDefault 
              ? 'bg-bg-muted border-border-main' 
              : 'bg-black/20 backdrop-blur-md border-white/10 shadow-black/20'
          }`}
          style={{ 
            borderRadius: 'var(--radius-inner-visual)',
            padding: 'var(--space-md)',
            gap: 'var(--space-xs)'
          }}
        >
          <p className={`text-label uppercase tracking-widest ${
            isDefault ? 'text-text-muted' : 'text-white/50'
          }`}>{badge}</p>
          <p className={`text-h1 font-black tabular-nums ${
            isDefault ? 'text-brand-600' : 'text-white'
          }`}>{badgeValue}</p>
        </div>
      )}
    </div>
  );
};
