import React from 'react';
import { LucideIcon } from 'lucide-react';
import { iconSizes } from '../../constants';

export type NexusButtonVariant = 
  | 'brand' 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'success' 
  | 'warning'
  | 'dark';

export type NexusButtonContext = 'section' | 'card' | 'autonomous' | 'default';

interface NexusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NexusButtonVariant;
  context?: NexusButtonContext;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  isLoading?: boolean;
  isIconOnly?: boolean;
}

export const NexusButton: React.FC<NexusButtonProps> = ({
  children,
  variant = 'primary',
  context = 'default',
  size = 'md',
  icon: Icon,
  isLoading,
  isIconOnly = false,
  className = '',
  disabled,
  ...props
}) => {
  const isSection = context === 'section';
  const isCard = context === 'card';
  const isAutonomous = context === 'autonomous';
  
  const contextStyles = {
    section: 'h-[var(--size-button-section)] text-button-section',
    autonomous: 'h-[var(--size-button-autonomous)] text-button-autonomous',
    card: 'h-[var(--size-button-card)] text-button-card',
    default: size === 'sm' ? 'h-9 text-button-card' : size === 'lg' ? 'h-[var(--size-button-section)] text-button-section' : 'h-[var(--size-button-section)] text-button-section'
  };

  const shapeStyles = isIconOnly ? 'px-0 aspect-square' : (isCard ? 'px-6' : 'px-8');

  const radiusStyle = isSection 
    ? { borderRadius: 'var(--radius-inner-visual)' } 
    : isAutonomous
      ? { borderRadius: 'var(--radius-card-inner)' }
      : isCard 
        ? { borderRadius: 'var(--radius-nested-simple)' }
        : {};

  const variantStyles: Record<NexusButtonVariant, string> = {
    brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 border border-brand-500',
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 border border-brand-500',
    secondary: 'bg-bg-muted text-text-main hover:bg-stone-200 dark:hover:bg-stone-800 border border-border-main',
    outline: 'bg-transparent border border-border-main text-text-main hover:border-brand-500 hover:text-brand-600 hover:bg-bg-card',
    ghost: 'bg-transparent text-text-muted hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/10',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20 border border-rose-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 border border-emerald-700',
    warning: 'bg-amber-500 text-stone-900 hover:bg-amber-600 shadow-lg shadow-amber-500/20 border border-amber-600',
    dark: 'bg-stone-900 text-white hover:bg-black shadow-lg shadow-black/20 border border-stone-800'
  };

  const baseStyles = 'inline-flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 border-antialiased';

  const iconSize = iconSizes[context];

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${contextStyles[context]} ${shapeStyles} ${className} ${(!radiusStyle.borderRadius && !className.includes('rounded-')) ? 'rounded-xl' : ''}`}
      disabled={disabled || isLoading}
      style={{
        transitionTimingFunction: 'var(--ease-emil)',
        ...radiusStyle,
        ...props.style
      }}
      {...props}
    >
      <div className="flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className={`flex items-center transition-all duration-300 ${isLoading ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          {Icon && (
            <Icon size={iconSize} strokeWidth={2.5} className={(!isIconOnly && children) ? 'mr-2.5' : ''} />
          )}
          {!isIconOnly && children}
        </div>
      </div>
    </button>
  );
};

export const NexusSectionButton: React.FC<Omit<NexusButtonProps, 'context'>> = (props) => (
  <NexusButton {...props} context="section" />
);

export const NexusAutonomousButton: React.FC<Omit<NexusButtonProps, 'context'>> = (props) => (
  <NexusButton {...props} context="autonomous" />
);

export const NexusCardButton: React.FC<Omit<NexusButtonProps, 'context'>> = (props) => (
  <NexusButton {...props} context="card" />
);
