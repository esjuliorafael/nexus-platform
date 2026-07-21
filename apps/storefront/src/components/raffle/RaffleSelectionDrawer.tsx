import { useEffect, useState } from 'react';
import { CheckCircle2, Ticket, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatPrice } from '../../utils/formatters';
import { RaffleOpportunity } from '../../types';
import { RaffleCouponValidationResponse } from '../../api/raffle-coupons';
import { RaffleCouponRedemption } from './RaffleCouponRedemption';
import { StorefrontPurchaseBar } from '../ui/PurchaseBar';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { RaffleTicketSelectionExplorer } from './RaffleTicketSelectionExplorer';
import { StorefrontDrawerDialog } from '../ui/DrawerDialog';
import { StorefrontDrawerHeader } from '../ui/DrawerHeader';
import {
  StorefrontTemporarySurfaceChrome,
  StorefrontTemporarySurfaceHeaderItem,
  StorefrontTemporarySurfaceItem,
} from '../ui/TemporarySurfaceMotion';

interface RaffleSelectionDrawerProps {
  isOpen: boolean;
  raffleId: number;
  selectedTickets: string[];
  ticketOpportunities: RaffleOpportunity[];
  ticketPrice: number | string;
  coupon: RaffleCouponValidationResponse | null;
  onClose: () => void;
  onSelectedTicketsChange: (tickets: string[]) => void;
  onCouponChange: (coupon: RaffleCouponValidationResponse | null) => void;
  onContinue: () => void;
  isContinuing?: boolean;
  onExited?: () => void;
}

export function RaffleSelectionDrawer({ isOpen, raffleId, selectedTickets, ticketOpportunities, ticketPrice, coupon, onClose, onSelectedTicketsChange, onCouponChange, onContinue, isContinuing = false, onExited }: RaffleSelectionDrawerProps) {
  const [shouldLockPage, setShouldLockPage] = useState(isOpen);
  const [restoreScrollOnUnlock, setRestoreScrollOnUnlock] = useState(true);
  useBodyScrollLock(shouldLockPage, { restoreScroll: restoreScrollOnUnlock });
  useEffect(() => {
    if (isOpen) {
      setRestoreScrollOnUnlock(true);
      setShouldLockPage(true);
    }
  }, [isOpen]);
  const subtotal = selectedTickets.length * Number(ticketPrice);
  const total = Math.max(0, subtotal - (coupon?.discountTotal || 0));
  const handleClose = () => {
    if (!isContinuing) onClose();
  };
  const removeTicket = (ticket: string) => {
    onCouponChange(null);
    onSelectedTicketsChange(selectedTickets.filter((current) => current !== ticket));
  };
  const handleContinue = () => {
    setRestoreScrollOnUnlock(false);
    onContinue();
  };

  return <StorefrontDrawerDialog
    open={isOpen}
    label="Mi selección"
    onRequestClose={handleClose}
    closeDisabled={isContinuing}
    restoreFocus={!isContinuing}
    returnFocusSelector='[data-testid="raffle-selection-trigger"]'
    busy={isContinuing}
    onExitComplete={() => {
      setShouldLockPage(false);
      if (onExited) window.requestAnimationFrame(onExited);
    }}
  >
      <div className="shrink-0">
        <DrawerHeader count={selectedTickets.length} onClose={handleClose} />
      </div>
      <StorefrontTemporarySurfaceItem phase="content" className="flex-1 overflow-y-auto px-[var(--sf-inset-page-mobile)] pt-[calc(var(--sf-inset-mobile-chrome-block)+var(--sf-h-mobile-nav)+var(--sf-space-mobile-chrome-after))] sm:p-[var(--sf-padding-inner)]" style={{ paddingBottom: 'var(--sf-space-xl)' }}>
        {selectedTickets.length ? (
          <RaffleTicketSelectionExplorer
            selectedTickets={selectedTickets}
            ticketOpportunities={ticketOpportunities}
            variant="drawer"
            onRemoveTicket={removeTicket}
          />
        ) : <p className="sf-text-secondary text-stone-500">Selecciona tus números para continuar.</p>}
      </StorefrontTemporarySurfaceItem>

      {selectedTickets.length > 0 && <StorefrontTemporarySurfaceItem phase="footer" className="shrink-0 border-t border-stone-100 bg-white/95 sm:hidden" style={{ paddingInline: 'var(--sf-inset-page-mobile)', paddingTop: 'var(--sf-space-md)', paddingBottom: 'var(--sf-mobile-chrome-content-padding-bottom)' }}><RaffleCouponRedemption raffleId={raffleId} tickets={selectedTickets} coupon={coupon} onCouponChange={onCouponChange} /></StorefrontTemporarySurfaceItem>}
      <StorefrontTemporarySurfaceItem phase="footer" className="hidden shrink-0 border-t border-stone-100 bg-stone-50/70 sm:block" style={{ padding: 'var(--sf-padding-inner)' }}>
        <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
          {selectedTickets.length > 0 && <RaffleCouponRedemption raffleId={raffleId} tickets={selectedTickets} coupon={coupon} onCouponChange={onCouponChange} />}
          {coupon && <div className="flex items-center justify-between sf-text-secondary text-stone-500"><span>Descuento</span><span>-${formatPrice(coupon.discountTotal)}</span></div>}
          <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}><span className="sf-text-label text-stone-400">Total</span><span className="sf-text-h1 text-brand-500">${formatPrice(total)}</span></div>
          <Button type="button" context="section" className="w-full" icon={CheckCircle2} disabled={!selectedTickets.length || isContinuing} isLoading={isContinuing} onClick={handleContinue}>Finalizar apartado</Button>
        </div>
      </StorefrontTemporarySurfaceItem>
      {selectedTickets.length > 0 && <StorefrontPurchaseBar total={total} buttonLabel="Finalizar apartado" buttonIcon={Ticket} loading={isContinuing} disabled={isContinuing} onAction={handleContinue} entrance="temporary" />}
  </StorefrontDrawerDialog>;
}

function DrawerHeader({ count, onClose }: { count: number; onClose: () => void }) {
  return <>
    <StorefrontDrawerHeader
      icon={Ticket}
      title="Mi selección"
      subtitle={`${count} boleto${count === 1 ? '' : 's'}`}
      closeLabel="Cerrar mi selección"
      onClose={onClose}
      className="hidden sm:flex"
    />
    <StorefrontTemporarySurfaceChrome edge="top" className="absolute z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center sm:hidden" style={{ top: 'var(--sf-inset-mobile-chrome-block)', left: 'var(--sf-inset-mobile-chrome)', right: 'var(--sf-inset-mobile-chrome)', gap: 'var(--sf-space-md)' }}>
      <div aria-hidden="true" style={{ width: 'var(--sf-h-mobile-nav)', height: 'var(--sf-h-mobile-nav)' }} />
      <StorefrontTemporarySurfaceHeaderItem part="identity" className="pointer-events-none flex min-w-0 items-center justify-center overflow-hidden border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]" style={{ height: 'var(--sf-h-mobile-nav)', borderRadius: 'var(--sf-radius-outer)', paddingInline: 'var(--sf-space-md)' }}><div className="min-w-0 text-center"><p className="truncate sf-text-secondary font-medium text-stone-700">Mi selección</p><p className="sf-text-caption text-stone-400">{count} boleto{count === 1 ? '' : 's'}</p></div></StorefrontTemporarySurfaceHeaderItem>
      <StorefrontTemporarySurfaceHeaderItem part="close" className="flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]" style={{ height: 'var(--sf-h-mobile-nav)', borderRadius: 'var(--sf-radius-outer)', padding: 'var(--sf-space-sm)' }}><Button type="button" variant="ghost" size="icon" context="section" icon={X} isIconOnly onClick={onClose} aria-label="Cerrar mi selección" style={{ width: 'var(--sf-size-mobile-nav-item)', height: 'var(--sf-size-mobile-nav-item)', borderRadius: 'var(--sf-radius-mobile-nav-item)' }} /></StorefrontTemporarySurfaceHeaderItem>
    </StorefrontTemporarySurfaceChrome>
  </>;
}
