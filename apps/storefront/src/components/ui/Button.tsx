import { ButtonHTMLAttributes, CSSProperties, ReactNode, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  context?: 'section' | 'card' | 'autonomous' | 'default';
  density?: 'default' | 'compact';
  icon?: LucideIcon;
  isLoading?: boolean;
  isIconOnly?: boolean;
  floatingContent?: ReactNode;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    context = 'default',
    density = 'default',
    icon: Icon,
    isLoading = false,
    isIconOnly = false,
    floatingContent,
    asChild = false,
    disabled,
    style,
    ...props
  }, ref) => {
    const isCard = context === 'card';
    const isAutonomous = context === 'autonomous';
    const isAutonomousCompact = isAutonomous && density === 'compact';
    
    const variants = {
      brand: 'bg-brand-500 text-white hover:bg-brand-600 border border-brand-500 shadow-lg shadow-brand-500/20',
      primary: 'bg-brand-500 text-white hover:bg-brand-600 border border-brand-500 shadow-lg shadow-brand-500/20',
      secondary: 'bg-stone-900 text-white hover:bg-stone-950 border border-stone-900 shadow-lg shadow-stone-900/10',
      outline: 'border border-stone-200 bg-transparent hover:bg-stone-50 text-stone-700',
      ghost: 'bg-transparent hover:bg-stone-100 text-stone-600 border border-transparent',
      danger: 'bg-red-500 text-white hover:bg-red-600 border border-red-500 shadow-lg shadow-red-500/20',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-lg shadow-emerald-500/20',
      warning: 'bg-amber-500 text-stone-950 hover:bg-amber-600 border border-amber-500 shadow-lg shadow-amber-500/20',
      dark: 'bg-stone-950 text-white hover:bg-stone-900 border border-stone-900 shadow-lg shadow-stone-950/15',
    };

    const contextStyles = {
      section: 'h-[var(--sf-h-button-section)] sf-text-button-section',
      autonomous: isAutonomousCompact
        ? 'h-[var(--sf-h-button-card)] sf-text-button-card'
        : 'h-[var(--sf-h-button-section)] sf-text-button-autonomous',
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
      autonomous: isAutonomousCompact ? 'var(--sf-radius-card-nested-compact)' : 'var(--sf-radius-card-inner)',
      card: 'var(--sf-radius-nested)',
      default: size === 'icon' ? 'var(--sf-radius-nested)' : 'var(--sf-radius-card-inner)',
    };

    const paddingStyle = isIconOnly || size === 'icon'
      ? {}
      : {
          paddingInline: isCard
            ? 'var(--sf-padding-button-card-inline)'
            : 'var(--sf-padding-button-inline)',
        };

    const iconSize = isCard || isAutonomousCompact
      ? 'var(--sf-button-icon-size, var(--sf-size-inner-icon-card))'
      : 'var(--sf-button-icon-size, var(--sf-size-inner-icon-section))';

    const resolvedStyle: CSSProperties = {
      borderRadius: radiusByContext[context],
      transitionTimingFunction: 'var(--sf-ease)',
      ...paddingStyle,
      ...style,
    };

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center select-none transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:opacity-50 disabled:pointer-events-none',
            variants[variant],
            contextStyles[context],
            size === 'icon' || isIconOnly ? 'aspect-square p-0' : '',
            className
          )}
          style={resolvedStyle}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center select-none transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          contextStyles[context],
          size === 'icon' || isIconOnly ? 'aspect-square p-0' : '',
          className
        )}
        style={resolvedStyle}
        disabled={disabled || isLoading}
        {...props}
      >
        <span className="relative inline-flex items-center justify-center">
          {isLoading && (
            <Loader2
              className="absolute animate-spin"
              style={{ width: iconSize, height: iconSize }}
              strokeWidth={2.5}
            />
          )}
          <span
            className={cn(
              'inline-flex items-center justify-center transition-all duration-300',
              isLoading ? 'scale-90 opacity-0' : 'scale-100 opacity-100',
            )}
            style={{ gap: Icon && !isIconOnly && children ? 'var(--sf-space-sm)' : undefined }}
          >
            {Icon && <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={2.5} />}
            {!isIconOnly && children}
          </span>
        </span>
        {floatingContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

export const StorefrontButton = Button;
export const StorefrontSectionButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'context'>>(
  (props, ref) => <Button ref={ref} {...props} context="section" />,
);
StorefrontSectionButton.displayName = 'StorefrontSectionButton';

export const StorefrontCardButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'context'>>(
  (props, ref) => <Button ref={ref} {...props} context="card" />,
);
StorefrontCardButton.displayName = 'StorefrontCardButton';

export const StorefrontAutonomousButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'context'>>(
  (props, ref) => <Button ref={ref} {...props} context="autonomous" />,
);
StorefrontAutonomousButton.displayName = 'StorefrontAutonomousButton';
