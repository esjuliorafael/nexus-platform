"use client";

import { useLayoutEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { saveRaffleCheckoutDraft } from '../../lib/raffle-checkout-draft';
import { useRaffleSelectionUiStore } from '../../store/raffle-selection-ui.store';
import { RaffleSelectionDrawer } from './RaffleSelectionDrawer';
import { useCheckoutTransitionStore } from '../../store/checkout-transition.store';
import { useCheckoutTransitionGuard } from '../../hooks/useCheckoutTransitionGuard';

export function RaffleSelectionDrawerHost() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isOpen,
    isContinuing,
    raffleId,
    selectedTickets,
    ticketOpportunities,
    ticketPrice,
    coupon,
    updateSelectedTickets,
    updateCoupon,
    closeSelection,
    setContinuing,
  } = useRaffleSelectionUiStore();
  const readyPath = useCheckoutTransitionStore((state) => state.readyPath);
  const beginCheckoutTransition = useCheckoutTransitionStore((state) => state.begin);
  const finishCheckoutTransition = useCheckoutTransitionStore((state) => state.finish);

  const checkoutPath = raffleId ? `/raffles/${raffleId}/checkout` : null;

  useCheckoutTransitionGuard({
    active: isContinuing,
    targetPath: checkoutPath ?? '',
    onRecover: () => setContinuing(false),
    onUnexpectedRoute: closeSelection,
  });

  useLayoutEffect(() => {
    if (!isContinuing || !checkoutPath || pathname !== checkoutPath || readyPath !== checkoutPath) return;

    const frame = window.requestAnimationFrame(closeSelection);

    return () => window.cancelAnimationFrame(frame);
  }, [checkoutPath, closeSelection, isContinuing, pathname, readyPath]);

  const handleContinue = () => {
    if (!raffleId || !checkoutPath || !selectedTickets.length || isContinuing) return;

    saveRaffleCheckoutDraft({ raffleId, tickets: selectedTickets, coupon });
    const sourcePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    beginCheckoutTransition(checkoutPath, sourcePath);
    setContinuing(true);
    router.push(checkoutPath, { scroll: false });
  };

  return (
    <RaffleSelectionDrawer
      isOpen={isOpen}
      raffleId={raffleId ?? 0}
      selectedTickets={selectedTickets}
      ticketOpportunities={ticketOpportunities}
      ticketPrice={ticketPrice}
      coupon={coupon}
      onClose={closeSelection}
      onSelectedTicketsChange={updateSelectedTickets}
      onCouponChange={updateCoupon}
      onContinue={handleContinue}
      isContinuing={isContinuing}
      onExited={() => {
        setContinuing(false);
        finishCheckoutTransition();
      }}
    />
  );
}
