import { ButtonHTMLAttributes, CSSProperties, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  context?: 'section' | 'card' | 'autonomous' | 'default';
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', context = 'default', asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 border border-brand-500 shadow-lg shadow-brand-500/20',
      secondary: 'bg-stone-900 text-white hover:bg-stone-950 border border-stone-900 shadow-lg shadow-stone-900/10',
      outline: 'border border-stone-200 bg-transparent hover:bg-stone-50 text-stone-700',
      ghost: 'bg-transparent hover:bg-stone-100 text-stone-600 border border-transparent',
      danger: 'bg-red-500 text-white hover:bg-red-600 border border-red-500 shadow-lg shadow-red-500/20',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-lg shadow-emerald-500/20',
    };

    const contextStyles = {
      section: 'h-[var(--sf-h-button-section)] sf-text-button-section',
      autonomous: 'h-[var(--sf-h-button-section)] sf-text-button-section',
      card: 'h-[var(--sf-h-button-card)] sf-text-button-card',
      default: size === 'sm'
        ? 'h-10 px-4 sf-text-button-card'
        : size === 'lg'
          ? 'h-[var(--sf-h-button-section)] px-8 sf-text-button-section'
          : size === 'icon'
            ? 'h-[var(--sf-h-button-card)] aspect-square p-0'
            : 'h-[var(--sf-h-button-section)] px-6 sf-text-button-section',
    };

    const radiusByContext: Record<NonNullable<ButtonProps['context']>, string> = {
      section: 'var(--sf-radius-inner)',
      autonomous: 'var(--sf-radius-card-inner)',
      card: 'var(--sf-radius-nested)',
      default: size === 'icon' ? 'var(--sf-radius-nested)' : 'var(--sf-radius-card-inner)',
    };

    const resolvedStyle: CSSProperties = {
      borderRadius: radiusByContext[context],
      transitionTimingFunction: 'var(--sf-ease)',
      ...style,
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center select-none transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          contextStyles[context],
          size === 'icon' ? 'aspect-square p-0' : '',
          className
        )}
        style={resolvedStyle}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
