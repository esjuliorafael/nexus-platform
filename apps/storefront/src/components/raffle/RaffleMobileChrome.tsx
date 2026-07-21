import type { CSSProperties } from 'react';
import { BellRing, CheckCircle2, ChevronLeft, Ticket } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../ui/Button';
import { formatPrice } from '../../utils/formatters';
import {
  STOREFRONT_DETAIL_MOTION_SEQUENCE_MS,
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from '../../lib/motion';

interface RaffleMobileTopBarProps {
  title: string;
  showTitle: boolean;
  selectedCount: number;
  onBack: () => void;
  onOpenSelection: () => void;
}

export function RaffleMobileTopBar({
  title,
  showTitle,
  selectedCount,
  onBack,
  onOpenSelection,
}: RaffleMobileTopBarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed z-40 grid items-center md:hidden"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.chromeDelayMs),
        ease: STOREFRONT_EASING.reveal,
      }}
      style={{
        top: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
        gridTemplateColumns: 'var(--sf-h-mobile-nav) minmax(0, 1fr) var(--sf-h-mobile-nav)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <RailButton icon={ChevronLeft} label="Volver a sorteos" onClick={onBack} />

      <div
        className={`pointer-events-none min-w-0 overflow-hidden border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)] transition-all duration-200 ${
          showTitle ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          padding: 'var(--sf-space-sm)',
        }}
      >
        <div
          className="flex h-full items-center justify-center px-[var(--sf-space-md)]"
          style={{ borderRadius: 'var(--sf-radius-mobile-nav-item)' }}
        >
          <span className="truncate text-center sf-text-secondary font-medium text-stone-600">{title}</span>
        </div>
      </div>

      <RailButton
        icon={Ticket}
        label="Revisar selección"
        onClick={onOpenSelection}
        badge={selectedCount > 0 ? selectedCount : undefined}
        dataTestId="raffle-selection-trigger"
      />
    </motion.div>
  );
}

interface RaffleSelectionBarProps {
  selectedCount: number;
  total: number;
  onAction: () => void;
}

export function RaffleSelectionBar({
  selectedCount,
  total,
  onAction,
}: RaffleSelectionBarProps) {
  const buttonLabel = selectedCount === 0 ? 'Elegir boletos' : 'Revisar selección';
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed z-40 md:hidden"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.actionsDelayMs),
        ease: STOREFRONT_EASING.reveal,
      }}
      style={{
        bottom: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
      }}
    >
      <div
        className="flex items-center justify-between border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          gap: 'var(--sf-space-sm)',
          padding: 'var(--sf-space-sm)',
        }}
      >
        <div className="min-w-0 shrink pl-[var(--sf-space-sm)]">
          <span className="block sf-text-caption text-stone-400">Mi selección</span>
          <p className="truncate sf-text-secondary-strong text-brand-500">
            {selectedCount > 0 ? `${selectedCount} boletos · $${formatPrice(total)}` : 'Elige tus boletos'}
          </p>
        </div>

        <Button
          type="button"
          context="autonomous"
          variant="primary"
          icon={Ticket}
          onClick={onAction}
          data-testid="raffle-selection-trigger"
          className="shrink-0"
          style={{
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            '--sf-button-icon-size': 'var(--sf-size-mobile-nav-icon)',
          } as CSSProperties}
        >
          {buttonLabel}
        </Button>
      </div>
    </motion.div>
  );
}

interface RaffleOpeningReminderBarProps {
  isRegistered: boolean;
  onAction: () => void;
}

export function RaffleOpeningReminderBar({
  isRegistered,
  onAction,
}: RaffleOpeningReminderBarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed z-40 md:hidden"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.actionsDelayMs),
        ease: STOREFRONT_EASING.reveal,
      }}
      style={{
        bottom: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
      }}
    >
      <div
        className={`flex items-center justify-between border shadow-[0_18px_48px_rgba(87,68,55,0.14)] ${
          isRegistered
            ? 'border-stone-200/80 bg-stone-50'
            : 'border-stone-200/90 bg-white'
        }`}
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          gap: 'var(--sf-space-sm)',
          padding: 'var(--sf-space-sm)',
        }}
        aria-live="polite"
      >
        <div className="min-w-0 shrink pl-[var(--sf-space-sm)]">
          <span className="block sf-text-caption text-stone-400">
            {isRegistered ? 'Aviso registrado' : 'Aviso de apertura'}
          </span>
          <p
            className={`truncate sf-text-secondary-strong ${
              isRegistered ? 'text-stone-500' : 'text-stone-700'
            }`}
          >
            {isRegistered ? 'Te avisaremos por WhatsApp' : '¿Quieres que te avisemos?'}
          </p>
        </div>

        {isRegistered ? (
          <div
            className="inline-flex shrink-0 items-center justify-center bg-stone-100 text-stone-500 sf-text-button-autonomous"
            style={{
              height: 'var(--sf-size-mobile-nav-item)',
              borderRadius: 'var(--sf-radius-mobile-nav-item)',
              gap: 'var(--sf-space-sm)',
              paddingInline: 'var(--sf-padding-button-inline)',
            }}
          >
            <CheckCircle2
              style={{
                width: 'var(--sf-size-mobile-nav-icon)',
                height: 'var(--sf-size-mobile-nav-icon)',
              }}
              strokeWidth={2.25}
            />
            Registrado
          </div>
        ) : (
          <Button
            type="button"
            context="autonomous"
            variant="primary"
            icon={BellRing}
            onClick={onAction}
            className="shrink-0"
            style={{
              height: 'var(--sf-size-mobile-nav-item)',
              borderRadius: 'var(--sf-radius-mobile-nav-item)',
              '--sf-button-icon-size': 'var(--sf-size-mobile-nav-icon)',
            } as CSSProperties}
          >
            Quiero el aviso
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function RailButton({
  icon: Icon,
  label,
  onClick,
  badge,
  dataTestId,
}: {
  icon: typeof ChevronLeft;
  label: string;
  onClick: () => void;
  badge?: number;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={dataTestId}
      onClick={onClick}
      className="relative flex items-center justify-center border border-stone-200/90 bg-white text-stone-600 shadow-[0_12px_30px_rgba(87,68,55,0.1)] transition-colors hover:text-stone-950"
      style={{
        width: 'var(--sf-h-mobile-nav)',
        height: 'var(--sf-h-mobile-nav)',
        borderRadius: 'var(--sf-radius-outer)',
      }}
    >
      <Icon size={20} strokeWidth={2.25} />
      {badge !== undefined && (
        <span
          className="absolute flex items-center justify-center bg-brand-500 text-white sf-text-caption"
          style={{
            top: 'var(--sf-space-xs)',
            right: 'var(--sf-space-xs)',
            minWidth: '1.25rem',
            height: '1.25rem',
            paddingInline: '0.1875rem',
            borderRadius: '999px',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
