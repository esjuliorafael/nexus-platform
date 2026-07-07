import React from 'react';
import { LucideIcon } from 'lucide-react';
import { iconSizes } from '../../constants';

interface NexusIconProps {
  icon: LucideIcon;
  variant?: 'brand' | 'muted' | 'blue' | 'emerald' | 'orange' | 'solid-brand';
  isMuted?: boolean;
  className?: string;
  hoverGroup?: string;
  style?: React.CSSProperties;
}

/**
 * NexusSectionIcon: Optimizado para el Header de NexusSection.
 * Su radio se deriva directamente del sistema global de geometría recursiva (Nivel 2).
 */
export const NexusSectionIcon: React.FC<NexusIconProps> = ({
  icon: Icon,
  variant = 'muted',
  isMuted = false,
  className = '',
  hoverGroup = 'group/section'
}) => {
  const variantStyles = {
    brand: 'bg-brand-50 text-brand-500 border-brand-100/50 shadow-sm shadow-brand-500/5',
    muted: 'bg-bg-muted text-text-main border-border-main shadow-inner',
    blue: 'bg-blue-50 text-blue-600 border-blue-100/50 shadow-sm',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm',
    orange: 'bg-orange-50 text-orange-600 border-orange-100/50 shadow-sm',
    'solid-brand': 'bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/20'
  };

  const mutedClasses = isMuted ? 'bg-bg-muted text-text-muted/30 border-border-main/50 scale-100 grayscale' : '';
  
  // Animación ligada al grupo de la sección
  const animationClasses = !isMuted ? `${hoverGroup}:scale-110 ${hoverGroup}:-rotate-3` : '';

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 border transition-all duration-500 
        ${variantStyles[variant]} ${mutedClasses} ${animationClasses} ${className}`}
      style={{ 
        transitionTimingFunction: 'var(--ease-emil)',
        borderRadius: 'var(--radius-inner-visual)',
        width: 'var(--size-icon-section)',
        height: 'var(--size-icon-section)'
      }}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      <Icon 
        size={iconSizes.section}
        strokeWidth={1.5} 
        className="transition-all duration-500 relative z-10" 
      />
    </div>
  );
};

/**
 * NexusCardIcon: Optimizado para el interior de una NexusCard o elementos de UI pequeños.
 * Al estar dentro de un elemento con padding, usamos la FÓRMULA SIMPLE respecto al padre.
 */
export const NexusCardIcon: React.FC<NexusIconProps> = ({
  icon: Icon,
  variant = 'brand',
  isMuted = false,
  className = '',
  hoverGroup = 'group/card'
}) => {
  const variantStyles = {
    brand: 'bg-brand-50 text-brand-500 border-brand-100/50 shadow-sm shadow-brand-500/5',
    muted: 'bg-bg-muted text-text-main border-border-main shadow-inner',
    blue: 'bg-blue-50 text-blue-600 border-blue-100/50 shadow-sm',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm',
    orange: 'bg-orange-50 text-orange-600 border-orange-100/50 shadow-sm',
    'solid-brand': 'bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/20'
  };

  const mutedClasses = isMuted ? 'bg-bg-muted text-text-muted/30 border-border-main/50 scale-100 grayscale' : '';
  const animationClasses = !isMuted ? `${hoverGroup}:scale-110 ${hoverGroup}:-rotate-3` : '';

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 border transition-all duration-500 
        ${variantStyles[variant]} ${mutedClasses} ${animationClasses} ${className}`}
      style={{ 
        transitionTimingFunction: 'var(--ease-emil)',
        borderRadius: 'var(--radius-nested-simple)',
        width: 'var(--size-icon-card)',
        height: 'var(--size-icon-card)'
      }}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      <Icon 
        size={iconSizes.card}
        strokeWidth={1.5} 
        className="transition-all duration-500 relative z-10" 
      />
    </div>
  );
};

/**
 * NexusCardThumbnailIcon: Versión de imagen para el interior de una NexusCard.
 * Mantiene la misma geometría y comportamiento de animación que NexusCardIcon.
 */
export const NexusCardThumbnailIcon: React.FC<{
  src: string;
  alt?: string;
  isMuted?: boolean;
  className?: string;
  hoverGroup?: string;
}> = ({
  src,
  alt = '',
  isMuted = false,
  className = '',
  hoverGroup = 'group/card'
}) => {
  const mutedClasses = isMuted ? 'grayscale opacity-60' : '';
  const animationClasses = !isMuted ? `${hoverGroup}:scale-110 ${hoverGroup}:-rotate-3` : '';

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 border border-border-main overflow-hidden bg-stone-100 shadow-inner transition-all duration-500 
        ${mutedClasses} ${animationClasses} ${className}`}
      style={{ 
        transitionTimingFunction: 'var(--ease-emil)',
        borderRadius: 'var(--radius-nested-simple)',
        width: 'var(--size-icon-card)',
        height: 'var(--size-icon-card)'
      }}
    >
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover relative z-10"
      />
      <div className="absolute inset-0 bg-black/5 pointer-events-none z-20" />
    </div>
  );
};

/**
 * NexusHeroIcon: La versión de mayor escala del sistema.
 * Mantiene la concentricidad con el radio de nivel 2 (radius-inner-visual).
 * Optimizada con un tamaño de glifo que genera el "aire técnico" Editorial.
 */
export const NexusHeroIcon: React.FC<NexusIconProps & { size?: 'hero' }> = ({
  icon: Icon,
  variant = 'brand',
  isMuted = false,
  className = '',
  hoverGroup = 'group/hero'
}) => {
  const variantStyles = {
    brand: 'bg-brand-50 text-brand-500 border-brand-100/50 shadow-sm',
    muted: 'bg-bg-muted text-text-main border-border-main shadow-inner',
    blue: 'bg-blue-50 text-blue-600 border-blue-100/50 shadow-sm',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm',
    orange: 'bg-orange-50 text-orange-600 border-orange-100/50 shadow-sm',
    'solid-brand': 'bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/20'
  };

  const mutedClasses = isMuted ? 'grayscale opacity-40' : '';
  const animationClasses = !isMuted ? `${hoverGroup}:scale-105 ${hoverGroup}:-rotate-3` : '';

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 border transition-all duration-700 
        ${variantStyles[variant]} ${mutedClasses} ${animationClasses} ${className}`}
      style={{ 
        transitionTimingFunction: 'var(--ease-emil)',
        borderRadius: 'var(--radius-inner-visual)',
        width: 'var(--size-icon-section)',
        height: 'var(--size-icon-section)'
      }}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      {/* Glifo reducido respecto al contenedor para dar "aire" (24px glifo / 56px contenedor) */}
      <Icon 
        size={24}
        strokeWidth={1.5} 
        className="transition-all duration-500 relative z-10" 
      />
    </div>
  );
};

/**
 * NexusAutonomousIcon: Para tarjetas autónomas de nivel 1 (CategoryCard, ProductCard icon, etc.)
 * Usa --radius-card-inner y --size-icon-section al ser el primer nivel de anidamiento.
 */
export const NexusAutonomousIcon: React.FC<NexusIconProps> = ({
  icon: Icon,
  variant = 'brand',
  isMuted = false,
  className = '',
  hoverGroup = 'group',
  style
}) => {
  const variantStyles = {
    brand: 'bg-brand-50 text-brand-500 border-brand-100/50 shadow-sm shadow-brand-500/5',
    muted: 'bg-bg-muted text-text-main border-border-main shadow-inner',
    blue: 'bg-blue-50 text-blue-600 border-blue-100/50 shadow-sm',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100/50 shadow-sm',
    orange: 'bg-orange-50 text-orange-600 border-orange-100/50 shadow-sm',
    'solid-brand': 'bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/20'
  };

  const mutedClasses = isMuted ? 'bg-bg-muted text-text-muted/30 border-border-main/50 grayscale' : '';
  const animationClasses = !isMuted ? `${hoverGroup}:scale-110 ${hoverGroup}:-rotate-3` : '';

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 border transition-all duration-500
        ${variantStyles[variant]} ${mutedClasses} ${animationClasses} ${className}`}
      style={{
        transitionTimingFunction: 'var(--ease-emil)',
        borderRadius: 'var(--radius-card-inner)',
        width: 'var(--size-icon-autonomous)',
        height: 'var(--size-icon-autonomous)',
        ...style
      }}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      <Icon 
        size={iconSizes.autonomous}
        strokeWidth={1.5} 
        className="transition-all duration-500 relative z-10" 
      />
    </div>
  );
};
