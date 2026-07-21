"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Sparkles, Ticket, Trash2 } from 'lucide-react';
import type { RaffleOpportunity } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type RaffleTicketSelectionExplorerVariant = 'sheet' | 'drawer' | 'dark';

interface RaffleTicketSelectionExplorerProps {
  selectedTickets: string[];
  ticketOpportunities: RaffleOpportunity[];
  variant?: RaffleTicketSelectionExplorerVariant;
  onRemoveTicket?: (ticket: string) => void;
}

export function RaffleTicketSelectionExplorer({
  selectedTickets,
  ticketOpportunities,
  variant = 'sheet',
  onRemoveTicket,
}: RaffleTicketSelectionExplorerProps) {
  const opportunitiesByTicket = useMemo(
    () => new Map(ticketOpportunities.map((item) => [item.mainTicketNumber, item.extraOpportunities])),
    [ticketOpportunities],
  );
  const latestSelectedTicket = selectedTickets[selectedTickets.length - 1] ?? null;
  const [activeTicket, setActiveTicket] = useState<string | null>(latestSelectedTicket);
  const selectorRailRef = useRef<HTMLDivElement>(null);
  const pointerDragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    scrollLeft: 0,
    didDrag: false,
  });
  const isDark = variant === 'dark';
  const additionalNumbers = activeTicket ? opportunitiesByTicket.get(activeTicket) ?? [] : [];
  const participationNumberCount = additionalNumbers.length + 1;

  useEffect(() => {
    setActiveTicket(latestSelectedTicket);
  }, [latestSelectedTicket, selectedTickets]);

  if (!activeTicket) return null;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = selectorRailRef.current;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !rail || rail.scrollWidth <= rail.clientWidth) return;

    pointerDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
      didDrag: false,
    };
    rail.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = selectorRailRef.current;
    const drag = pointerDragRef.current;
    if (!rail || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.didDrag = true;
    if (!drag.didDrag) return;

    event.preventDefault();
    rail.scrollLeft = drag.scrollLeft - distance;
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rail = selectorRailRef.current;
    const drag = pointerDragRef.current;
    if (!rail || drag.pointerId !== event.pointerId) return;

    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    drag.pointerId = null;
    window.setTimeout(() => {
      drag.didDrag = false;
    }, 0);
  };

  const preventClickAfterDrag = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!pointerDragRef.current.didDrag) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const selectorRailClassName = variant === 'sheet'
    ? 'scrollbar-hide flex touch-pan-x select-none overflow-x-auto overscroll-x-contain cursor-grab active:cursor-grabbing'
    : variant === 'drawer'
      ? 'scrollbar-hide -mx-[var(--sf-inset-page-mobile)] flex touch-pan-x select-none overflow-x-auto overscroll-x-contain px-[var(--sf-inset-page-mobile)] cursor-grab active:cursor-grabbing [scroll-padding-inline:var(--sf-inset-page-mobile)] sm:-mx-[var(--sf-padding-inner)] sm:px-[var(--sf-padding-inner)] sm:[scroll-padding-inline:var(--sf-padding-inner)]'
      : 'scrollbar-hide -mx-[var(--sf-padding-inner)] flex touch-pan-x select-none overflow-x-auto overscroll-x-contain px-[var(--sf-padding-inner)] cursor-grab active:cursor-grabbing [scroll-padding-inline:var(--sf-padding-inner)]';

  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
        <h4 className={isDark ? 'sf-text-secondary-strong text-white' : 'sf-text-secondary-strong text-stone-950'}>
          Boletos seleccionados
        </h4>
        <div
          ref={selectorRailRef}
          className={selectorRailClassName}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          onClickCapture={preventClickAfterDrag}
          style={{
            gap: 'var(--sf-space-sm)',
            ...(variant === 'sheet'
              ? {
                  marginInline: 'calc(var(--sf-inset-page-mobile) * -1)',
                  paddingInline: 'var(--sf-inset-page-mobile)',
                }
              : {}),
          }}
        >
          {selectedTickets.map((ticketNumber) => {
            const isActive = ticketNumber === activeTicket;

            return (
              <button
                key={ticketNumber}
                type="button"
                aria-pressed={isActive}
                aria-label={`Consultar oportunidades del boleto ${ticketNumber}`}
                onClick={() => setActiveTicket(ticketNumber)}
                className={`flex shrink-0 items-center justify-center border sf-text-secondary-strong transition-colors ${
                  isActive
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : isDark
                      ? 'border-stone-700 bg-stone-800 text-stone-300 hover:border-brand-400 hover:text-white'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-200 hover:text-brand-700'
                }`}
                style={{
                  minWidth: 'var(--sf-h-button-card)',
                  minHeight: 'var(--sf-h-button-card)',
                  paddingInline: 'var(--sf-space-md)',
                  borderRadius: 'var(--sf-radius-inner)',
                }}
              >
                {ticketNumber}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-md)' }}>
        <div className="flex min-w-0 items-center" style={{ gap: 'var(--sf-space-md)' }}>
          <div
            className="flex shrink-0 items-center justify-center bg-brand-500 text-white"
            style={{
              width: 'var(--sf-h-button-section)',
              height: 'var(--sf-h-button-section)',
              borderRadius: 'var(--sf-radius-inner)',
            }}
          >
            <Ticket size={20} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="sf-text-label text-stone-400">Número principal</p>
            <p className={isDark ? 'sf-text-display leading-none text-white' : 'sf-text-display leading-none text-stone-950'}>
              {activeTicket}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center" style={{ gap: 'var(--sf-space-sm)' }}>
          <Badge variant={isDark ? 'overlayBrand' : 'brand'} context="section">
            {participationNumberCount} {participationNumberCount === 1 ? 'número' : 'números'}
          </Badge>
          {onRemoveTicket && (
            <Button
              type="button"
              variant="ghost"
              context="autonomous"
              density="compact"
              size="icon"
              icon={Trash2}
              isIconOnly
              onClick={() => onRemoveTicket(activeTicket)}
              aria-label={`Quitar boleto ${activeTicket}`}
              className={isDark ? 'text-stone-300 hover:bg-red-500/15 hover:text-red-300' : 'hover:bg-red-50 hover:text-red-600'}
            />
          )}
        </div>
      </div>

      {additionalNumbers.length > 0 && (
        <div
          className={`flex flex-col border-t pt-[var(--sf-space-lg)] ${isDark ? 'border-stone-800' : 'border-stone-100'}`}
          style={{ gap: 'var(--sf-space-md)' }}
        >
          <div className="flex items-center" style={{ gap: 'var(--sf-space-sm)' }}>
            <Sparkles className="shrink-0 text-brand-500" size={18} strokeWidth={2.25} />
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
              <h4 className={isDark ? 'sf-text-secondary-strong text-white' : 'sf-text-secondary-strong text-stone-950'}>
                Oportunidades adicionales
              </h4>
              <p className={isDark ? 'sf-text-secondary text-stone-400' : 'sf-text-secondary text-stone-500'}>
                Este boleto también participa con estos números.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4" style={{ gap: 'var(--sf-space-sm)' }}>
            {additionalNumbers.map((number) => (
              <span
                key={number}
                className={`flex items-center justify-center border sf-text-secondary-strong ${
                  isDark
                    ? 'border-stone-700 bg-stone-800 text-stone-200'
                    : 'border-stone-200 bg-stone-50 text-stone-700'
                }`}
                style={{
                  minHeight: 'var(--sf-h-button-card)',
                  borderRadius: 'var(--sf-radius-inner)',
                }}
              >
                {number}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
