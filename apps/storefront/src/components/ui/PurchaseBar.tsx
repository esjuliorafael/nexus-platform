import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { formatPrice } from '../../utils/formatters';
import { StorefrontTemporarySurfaceChrome } from './TemporarySurfaceMotion';
import { StorefrontCheckoutMotion } from './CheckoutMotion';
import { STOREFRONT_EASING, STOREFRONT_MOTION_MS, toMotionSeconds } from '../../lib/motion';

interface StorefrontPurchaseBarProps {
  total: number;
  buttonLabel: string;
  buttonIcon: LucideIcon;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  totalLabel?: string;
  totalValue?: string;
  className?: string;
  entrance?: 'none' | 'temporary' | 'checkout';
  entranceReady?: boolean;
}

export function StorefrontPurchaseBar({
  total,
  buttonLabel,
  buttonIcon,
  onAction,
  loading = false,
  disabled = false,
  totalLabel = 'Total',
  totalValue,
  className = '',
  entrance = 'none',
  entranceReady = true,
}: StorefrontPurchaseBarProps) {
  const ButtonIcon = buttonIcon;
  const reduceMotion = useReducedMotion();
  const content = (
    <div
      className="flex items-center justify-between border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: 'var(--sf-h-mobile-nav)',
        borderRadius: 'var(--sf-radius-outer)',
        gap: 'var(--sf-space-sm)',
        padding: 'var(--sf-space-sm)',
      }}
    >
      <div className="min-w-0 shrink-0 pl-[var(--sf-space-sm)]">
        <span className="block sf-text-caption text-stone-400">{totalLabel}</span>
        <p className="truncate sf-text-h2 font-black text-brand-500">
          {totalValue ?? `$${formatPrice(total)}`}
        </p>
      </div>

      <Button
        type="button"
        context="autonomous"
        variant="primary"
        icon={ButtonIcon}
        disabled={disabled || loading}
        onClick={onAction}
        className="shrink-0"
        style={{
          height: 'var(--sf-size-mobile-nav-item)',
          borderRadius: 'var(--sf-radius-mobile-nav-item)',
          '--sf-button-icon-size': 'var(--sf-size-mobile-nav-icon)',
        } as CSSProperties}
      >
        {loading ? (
          <Spinner className="text-white" />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={buttonLabel}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{
                duration: toMotionSeconds(
                  reduceMotion
                    ? STOREFRONT_MOTION_MS.duration.instant
                    : STOREFRONT_MOTION_MS.duration.standard,
                ),
                ease: STOREFRONT_EASING.reveal,
              }}
            >
              {buttonLabel}
            </motion.span>
          </AnimatePresence>
        )}
      </Button>
    </div>
  );
  const chromeProps = {
    className: `fixed z-40 md:hidden ${className}`,
    style: {
      bottom: 'var(--sf-inset-mobile-chrome-block)',
      left: 'var(--sf-inset-mobile-chrome)',
      right: 'var(--sf-inset-mobile-chrome)',
    },
  };

  if (entrance === 'temporary') {
    return (
      <StorefrontTemporarySurfaceChrome edge="bottom" {...chromeProps}>
        {content}
      </StorefrontTemporarySurfaceChrome>
    );
  }

  if (entrance === 'checkout') {
    return (
      <StorefrontCheckoutMotion phase="actions" ready={entranceReady} {...chromeProps}>
        {content}
      </StorefrontCheckoutMotion>
    );
  }

  return (
    <div
      {...chromeProps}
      style={{
        bottom: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
      }}
    >
      {content}
    </div>
  );
}
