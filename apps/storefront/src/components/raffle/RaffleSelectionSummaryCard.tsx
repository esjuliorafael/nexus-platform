import { CheckCircle2, Clock3 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { RaffleOpportunity } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { STOREFRONT_EASING, STOREFRONT_MOTION_MS, toMotionSeconds } from '../../lib/motion';
import { Button } from '../ui/Button';
import { StorefrontAutonomousCard } from '../ui/Card';
import { RaffleTicketSelectionExplorer } from './RaffleTicketSelectionExplorer';

interface RaffleSelectionSummaryCardProps {
  selectedTickets: string[];
  ticketOpportunities: RaffleOpportunity[];
  total: number;
  coupon?: { code: string } | null;
  discount?: number;
  onRemoveTicket?: (ticket: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  actionTestId?: string;
  completionStatus?: {
    label: string;
    tone: 'success' | 'pending';
  };
}

export function RaffleSelectionSummaryCard({
  selectedTickets,
  ticketOpportunities,
  total,
  coupon,
  discount = 0,
  onRemoveTicket,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionLoading = false,
  actionTestId,
  completionStatus,
}: RaffleSelectionSummaryCardProps) {
  const reduceMotion = useReducedMotion();
  const feedbackTransition = {
    duration: toMotionSeconds(
      reduceMotion
        ? STOREFRONT_MOTION_MS.duration.instant
        : STOREFRONT_MOTION_MS.duration.standard,
    ),
    ease: STOREFRONT_EASING.reveal,
  };

  return (
    <StorefrontAutonomousCard
      density="compact"
      className="flex flex-col bg-stone-900 text-white shadow-2xl shadow-stone-900/25 lg:sticky lg:top-[var(--sf-space-lg)]"
      style={{ gap: 'var(--sf-space-lg)' }}
    >
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
        <h2 className="sf-text-h1">Mi selección</h2>
        <p className="sf-text-secondary text-stone-400">
          {selectedTickets.length > 0
            ? `${selectedTickets.length} boleto${selectedTickets.length === 1 ? '' : 's'} seleccionado${selectedTickets.length === 1 ? '' : 's'}.`
            : 'Elige los números con los que deseas participar.'}
        </p>
      </div>

      {selectedTickets.length > 0 && (
        <RaffleTicketSelectionExplorer
          selectedTickets={selectedTickets}
          ticketOpportunities={ticketOpportunities}
          variant="dark"
          onRemoveTicket={onRemoveTicket}
        />
      )}

      <div className="flex flex-col border-t border-stone-800 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
        {coupon && (
          <div className="flex items-center justify-between sf-text-secondary text-stone-400" style={{ gap: 'var(--sf-space-md)' }}>
            <span className="truncate">Cupón {coupon.code}</span>
            <span className="shrink-0 text-emerald-400">-${formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}>
          <span className="sf-text-label text-stone-400">Total</span>
          <strong className="sf-text-display text-brand-500">${formatPrice(total)}</strong>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {completionStatus ? (
            <motion.div
              key={`completion-${completionStatus.label}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={feedbackTransition}
              className={`flex min-h-[var(--sf-h-button-card)] items-center justify-center sf-text-button-card font-bold ${
                completionStatus.tone === 'success' ? 'text-emerald-400' : 'text-amber-300'
              }`}
              style={{ gap: 'var(--sf-space-sm)' }}
              role="status"
            >
              {completionStatus.tone === 'success'
                ? <CheckCircle2 size="var(--sf-size-inner-icon-card)" />
                : <Clock3 size="var(--sf-size-inner-icon-card)" />}
              <span>{completionStatus.label}</span>
            </motion.div>
          ) : actionLabel && onAction ? (
            <motion.div
              key="selection-action"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={feedbackTransition}
            >
              <Button
                type="button"
                context="autonomous"
                className="w-full"
                onClick={onAction}
                data-testid={actionTestId}
                disabled={actionDisabled || actionLoading}
                isLoading={actionLoading}
              >
                {actionLabel}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </StorefrontAutonomousCard>
  );
}
