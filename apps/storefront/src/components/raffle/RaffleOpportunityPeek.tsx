"use client";

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Waypoints } from 'lucide-react';
import type { RaffleOpportunity } from '../../types';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { RaffleTicketSelectionExplorer } from './RaffleTicketSelectionExplorer';

const OPPORTUNITY_COACHMARK_STORAGE_KEY = 'nexus-raffle-opportunity-coachmark-seen';
const OPPORTUNITY_COACHMARK_DURATION_MS = 4_000;

interface RaffleOpportunityPeekProps {
  selectedTickets: string[];
  ticketOpportunities: RaffleOpportunity[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRemoveTicket: (ticket: string) => void;
}

export function RaffleOpportunityPeek({
  selectedTickets,
  ticketOpportunities,
  isOpen,
  onOpen,
  onClose,
  onRemoveTicket,
}: RaffleOpportunityPeekProps) {
  const opportunitiesByTicket = useMemo(
    () => new Map(ticketOpportunities.map((item) => [item.mainTicketNumber, item.extraOpportunities])),
    [ticketOpportunities],
  );
  const latestSelectedTicket = selectedTickets[selectedTickets.length - 1] ?? null;
  const [isCoachmarkVisible, setIsCoachmarkVisible] = useState(false);
  const isAvailable = selectedTickets.some((ticket) => (opportunitiesByTicket.get(ticket)?.length ?? 0) > 0);

  useEffect(() => {
    if (isOpen && !isAvailable) onClose();
  }, [isAvailable, isOpen, onClose]);

  const dismissCoachmark = () => {
    setIsCoachmarkVisible(false);
    window.localStorage.setItem(OPPORTUNITY_COACHMARK_STORAGE_KEY, 'true');
  };

  const handleOpen = () => {
    dismissCoachmark();
    onOpen();
  };

  useEffect(() => {
    if (!isAvailable || isOpen) {
      setIsCoachmarkVisible(false);
      return;
    }

    if (window.localStorage.getItem(OPPORTUNITY_COACHMARK_STORAGE_KEY) === 'true') return;

    setIsCoachmarkVisible(true);
    const timeoutId = window.setTimeout(() => {
      setIsCoachmarkVisible(false);
      window.localStorage.setItem(OPPORTUNITY_COACHMARK_STORAGE_KEY, 'true');
    }, OPPORTUNITY_COACHMARK_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isAvailable, isOpen]);

  return (
    <>
      <AnimatePresence>
        {isAvailable && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed z-40 flex items-center md:hidden"
            style={{
              right: 'var(--sf-inset-mobile-chrome)',
              bottom: 'calc(var(--sf-inset-mobile-chrome-block) + var(--sf-h-mobile-nav) + var(--sf-space-md))',
              gap: 'var(--sf-space-sm)',
            }}
          >
            <AnimatePresence>
              {isCoachmarkVisible && (
                <motion.span
                  id="raffle-opportunity-coachmark"
                  role="tooltip"
                  initial={{ opacity: 0, x: 8, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="pointer-events-none flex items-center whitespace-nowrap border border-stone-200/90 bg-white sf-text-secondary-strong text-stone-700 shadow-[0_12px_30px_rgba(87,68,55,0.12)]"
                  style={{
                    minHeight: 'var(--sf-h-button-card)',
                    paddingInline: 'var(--sf-space-md)',
                    borderRadius: 'var(--sf-radius-card-inner)',
                  }}
                >
                  Ver oportunidades
                </motion.span>
              )}
            </AnimatePresence>
            <Button
              type="button"
              variant="primary"
              context="autonomous"
              size="icon"
              icon={Waypoints}
              isIconOnly
              onClick={handleOpen}
              aria-label={`Ver oportunidades del boleto ${latestSelectedTicket}`}
              aria-describedby={isCoachmarkVisible ? 'raffle-opportunity-coachmark' : undefined}
              className="shadow-[0_14px_34px_rgba(87,68,55,0.2)]"
              style={{
                width: 'var(--sf-size-mobile-nav-item)',
                height: 'var(--sf-size-mobile-nav-item)',
                borderRadius: 'var(--sf-radius-outer)',
                '--sf-button-icon-size': 'var(--sf-size-mobile-nav-icon)',
              } as React.CSSProperties}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomSheet
        isOpen={isOpen && isAvailable}
        onClose={onClose}
        title="Oportunidades del boleto"
        icon={Waypoints}
      >
        <RaffleTicketSelectionExplorer
          selectedTickets={selectedTickets}
          ticketOpportunities={ticketOpportunities}
          variant="sheet"
          onRemoveTicket={onRemoveTicket}
        />
      </BottomSheet>
    </>
  );
}
