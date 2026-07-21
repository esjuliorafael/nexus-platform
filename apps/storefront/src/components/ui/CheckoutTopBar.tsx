import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { STOREFRONT_EASING, STOREFRONT_MOTION_MS, toMotionSeconds } from '../../lib/motion';
import { StorefrontCheckoutMotion } from './CheckoutMotion';

interface StorefrontCheckoutTopBarProps {
  title: string;
  summaryOpen: boolean;
  onBack: () => void;
  onToggleSummary: () => void;
  summaryIcon?: LucideIcon;
  summaryLabel?: string;
  entranceReady?: boolean;
}

export function StorefrontCheckoutTopBar({
  title,
  summaryOpen,
  onBack,
  onToggleSummary,
  summaryIcon: SummaryIcon = ShoppingBag,
  summaryLabel = 'Ver resumen del pedido',
  entranceReady = true,
}: StorefrontCheckoutTopBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <StorefrontCheckoutMotion
      phase="chrome"
      ready={entranceReady}
      className="fixed z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center md:hidden"
      style={{
        top: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <CheckoutTopRail>
        <button
          type="button"
          onClick={onBack}
          className="group flex shrink-0 items-center justify-center border border-transparent text-stone-500 transition-all duration-300 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          style={{
            width: 'var(--sf-size-mobile-nav-item)',
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            transitionTimingFunction: 'var(--sf-ease)',
          }}
          aria-label="Volver"
        >
          <ArrowLeft
            style={{ width: 'var(--sf-size-mobile-nav-icon)', height: 'var(--sf-size-mobile-nav-icon)' }}
            strokeWidth={2.35}
          />
        </button>
      </CheckoutTopRail>

      <div
        className="pointer-events-none flex min-w-0 items-center justify-center overflow-hidden border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          paddingInline: 'var(--sf-space-md)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={title}
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
            className="min-w-0 truncate text-center sf-text-secondary font-medium text-stone-600"
          >
            {title}
          </motion.p>
        </AnimatePresence>
      </div>

      <CheckoutTopRail>
        <button
          type="button"
          onClick={onToggleSummary}
          className={`group relative flex shrink-0 items-center justify-center border transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
            summaryOpen
              ? 'border-brand-100 bg-brand-50 text-brand-800 shadow-sm'
              : 'border-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-950'
          }`}
          style={{
            minWidth: 'var(--sf-size-mobile-nav-item)',
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            paddingInline: 'var(--sf-space-sm)',
            transitionTimingFunction: 'var(--sf-ease)',
          }}
          aria-label={summaryLabel}
          aria-expanded={summaryOpen}
        >
          <SummaryIcon
            style={{ width: 'var(--sf-size-mobile-nav-icon)', height: 'var(--sf-size-mobile-nav-icon)' }}
            strokeWidth={2.25}
          />
        </button>
      </CheckoutTopRail>
    </StorefrontCheckoutMotion>
  );
}

function CheckoutTopRail({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: 'var(--sf-h-mobile-nav)',
        borderRadius: 'var(--sf-radius-outer)',
        padding: 'var(--sf-space-sm)',
      }}
    >
      {children}
    </div>
  );
}
