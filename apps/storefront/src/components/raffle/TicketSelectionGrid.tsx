import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, Ticket, UsersRound } from 'lucide-react';
import { Raffle, RaffleTicketAvailability } from '../../types';
import {
  getRaffleParticipationUnitPrice,
  getRaffleTicketDisplayStatus,
  isRaffleTicketPartiallyShared,
  RaffleParticipationMode,
} from '../../lib/raffle-participation';
import { cn } from '../../utils/cn';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { StorefrontConfirmModal } from '../ui/ConfirmModal';
import { StorefrontField } from '../ui/Field';
import { StorefrontModal } from '../ui/Modal';
import { StorefrontPaginator } from '../ui/Paginator';
import { TicketFilterPanel, TicketFilters } from './TicketFilterPanel';
import { RaffleSelectionSummaryCard } from './RaffleSelectionSummaryCard';

const DEFAULT_TICKETS_PER_PAGE = 50;
const DEFAULT_TICKET_FILTERS: TicketFilters = {
  availability: 'AVAILABLE',
  parity: 'ALL',
  pageSize: DEFAULT_TICKETS_PER_PAGE,
};

interface TicketSelectionGridProps {
  raffle: Raffle;
  ticketAvailability: RaffleTicketAvailability[];
  selectedTickets: string[];
  participationMode: RaffleParticipationMode;
  onParticipationModeChange: (mode: RaffleParticipationMode) => void;
  onSelectedTicketsChange: (tickets: string[]) => void;
  onOpenSelection: () => void;
}

interface SharedParticipationDetailsSurfaceProps {
  hasExtraOpportunities: boolean;
  isMobile: boolean | null;
  isOpen: boolean;
  onClose: () => void;
  prizePolicy: string | null;
}

function SharedParticipationDetailsSurface({
  hasExtraOpportunities,
  isMobile,
  isOpen,
  onClose,
  prizePolicy,
}: SharedParticipationDetailsSurfaceProps) {
  if (isMobile === null) return null;

  const content = (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
      <ul className="flex flex-col sf-text-secondary text-stone-700" style={{ gap: 'var(--sf-space-md)' }}>
        <li>Cada boleto admite hasta dos participaciones compartidas.</li>
        <li>Pagas el 50% del boleto y, si resulta ganador, te corresponde el 50% del premio.</li>
        <li>La otra mitad puede ser adquirida por otra persona. Si no se adquiere, tu participación sigue siendo del 50%.</li>
        {hasExtraOpportunities && (
          <li>En rifas de oportunidades, ambas participaciones comparten por igual las oportunidades asociadas al boleto. Si una oportunidad resulta ganadora, se aplica el mismo reparto.</li>
        )}
      </ul>
      {prizePolicy && (
        <div className="border-t border-stone-200 pt-[var(--sf-space-lg)]">
          <h3 className="sf-text-label font-bold text-stone-500">Entrega de premios indivisibles</h3>
          <p className="mt-[var(--sf-space-sm)] sf-text-secondary text-stone-700">{prizePolicy}</p>
        </div>
      )}
      <Button type="button" context="section" onClick={onClose} className="w-full">
        Entendido
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Participación compartida"
        icon={UsersRound}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <StorefrontModal
      isOpen={isOpen}
      onClose={onClose}
      title="Participación compartida"
      icon={UsersRound}
      width="compact"
      showDefaultActions={false}
    >
      {content}
    </StorefrontModal>
  );
}

function getPrimaryTickets(raffle: Raffle) {
  if (raffle.extraOpportunities?.length) {
    return raffle.extraOpportunities
      .map((opportunity) => opportunity.mainTicketNumber)
      .sort((left, right) => Number(left) - Number(right));
  }

  // Defensive fallback for an older API response. Main folios always start at 1;
  // zero belongs to the opportunity pool in a closed opportunity universe.
  return Array.from(
    { length: raffle.ticketQuantity },
    (_, index) => String(index + 1).padStart(raffle.digits, '0'),
  );
}

export function TicketSelectionGrid({
  raffle,
  ticketAvailability,
  selectedTickets,
  participationMode,
  onParticipationModeChange,
  onSelectedTicketsChange,
  onOpenSelection,
}: TicketSelectionGridProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const selectionSectionRef = useRef<HTMLElement>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>({ ...DEFAULT_TICKET_FILTERS });
  const [draftFilters, setDraftFilters] = useState<TicketFilters>(filters);
  const [pendingParticipationMode, setPendingParticipationMode] = useState<RaffleParticipationMode | null>(null);
  const [isSharedParticipationDetailsOpen, setIsSharedParticipationDetailsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const allTickets = useMemo(() => {
    return getPrimaryTickets(raffle);
  }, [raffle]);
  const hasExtraOpportunities = Boolean(raffle.extraOpportunities?.length);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobile(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  const ticketAvailabilityByNumber = useMemo(
    () => new Map(ticketAvailability.map((ticket) => [ticket.ticketNumber, ticket])),
    [ticketAvailability],
  );

  const toggleTicket = (number: string) => {
    const availability = ticketAvailabilityByNumber.get(number);
    if (getRaffleTicketDisplayStatus(availability, participationMode) !== 'AVAILABLE') return;

    onSelectedTicketsChange(
      selectedTickets.includes(number)
        ? selectedTickets.filter((ticket) => ticket !== number)
        : [...selectedTickets, number]
    );
  };

  const requestParticipationModeChange = (nextMode: RaffleParticipationMode) => {
    if (nextMode === participationMode || pendingParticipationMode) return;

    if (selectedTickets.length === 0) {
      onParticipationModeChange(nextMode);
      return;
    }

    setPendingParticipationMode(nextMode);
  };

  const confirmParticipationModeChange = () => {
    if (!pendingParticipationMode) return;

    onParticipationModeChange(pendingParticipationMode);
    setPendingParticipationMode(null);
  };

  const filteredTickets = allTickets.filter((ticket) => {
    const status = getRaffleTicketDisplayStatus(ticketAvailabilityByNumber.get(ticket), participationMode);
    const number = Number.parseInt(ticket, 10);
    const matchesSearch = ticket.includes(search);
    const matchesAvailability = filters.availability === 'ALL' || status === filters.availability;
    const matchesParity = filters.parity === 'ALL' || (filters.parity === 'EVEN' ? number % 2 === 0 : number % 2 !== 0);

    return matchesSearch && matchesAvailability && matchesParity;
  });
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / filters.pageSize));
  const visibleTickets = filteredTickets.slice((page - 1) * filters.pageSize, page * filters.pageSize);
  const visibleRangeStart = filteredTickets.length === 0 ? 0 : ((page - 1) * filters.pageSize) + 1;
  const visibleRangeEnd = Math.min(page * filters.pageSize, filteredTickets.length);
  const totalAmount = selectedTickets.length * getRaffleParticipationUnitPrice(raffle.ticketPrice, participationMode);
  const hasActiveFilters = filters.availability !== DEFAULT_TICKET_FILTERS.availability
    || filters.parity !== 'ALL'
    || filters.pageSize !== DEFAULT_TICKETS_PER_PAGE;
  const pendingParticipationModeLabel = pendingParticipationMode === 'SHARED'
    ? 'participación compartida'
    : 'boleto completo';

  const openFilters = () => {
    setDraftFilters(filters);
    setIsFilterPanelOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFilterPanelOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters({ ...DEFAULT_TICKET_FILTERS });
  };

  const showAllTickets = () => {
    const nextFilters: TicketFilters = { ...filters, availability: 'ALL' };
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      selectionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    setPage(1);
  }, [filters, search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      <div
        className="grid grid-cols-1 items-start lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]"
        style={{ gap: 'var(--sf-space-xl)' }}
      >
        <section
          ref={selectionSectionRef}
          className="flex min-w-0 scroll-mt-[var(--sf-mobile-chrome-content-padding-top)] flex-col md:scroll-mt-[var(--sf-space-lg)]"
          style={{ gap: 'var(--sf-space-md)' }}
        >
          <div
            className="flex flex-col border-b border-stone-200"
            style={{ gap: 'var(--sf-space-md)', paddingBottom: 'var(--sf-space-lg)' }}
          >
            <div
              className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              style={{ gap: 'var(--sf-space-md)' }}
            >
              <div className="min-w-0 flex-none basis-auto sm:flex-1" style={{ minInlineSize: '14rem' }}>
                <h2 className="sf-text-h1 text-stone-850">Selecciona tus boletos</h2>
                <p className="sf-text-body text-stone-500">Elige los números disponibles para participar.</p>
              </div>

              <div className="order-3 flex w-full sm:order-2 sm:w-auto" style={{ gap: 'var(--sf-space-sm)' }}>
                <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
                  <StorefrontField
                    icon={Search}
                    type="text"
                    placeholder="Buscar número..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  type="button"
                  variant={hasActiveFilters ? 'brand' : 'outline'}
                  context="section"
                  size="icon"
                  isIconOnly
                  icon={SlidersHorizontal}
                  onClick={openFilters}
                  aria-label="Filtrar boletos"
                  className="shrink-0"
                />
              </div>

              {raffle.sharedParticipationEnabled && (
                <fieldset className="order-2 w-full min-w-0 sm:order-3" disabled={Boolean(pendingParticipationMode)}>
                  <legend className="sf-text-label font-bold text-stone-500" style={{ marginBottom: 'var(--sf-space-sm)' }}>
                    Modalidad de participación
                  </legend>
                  <div className="grid w-full grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--sf-space-sm)' }}>
                    {([
                      ['FULL', 'Boleto completo', Ticket],
                      ['SHARED', 'Participación compartida', UsersRound],
                    ] as const).map(([mode, label, Icon]) => {
                      const isActive = participationMode === mode;
                      const price = getRaffleParticipationUnitPrice(raffle.ticketPrice, mode);

                      return (
                        <label
                          key={mode}
                          className={cn(
                            'grid h-[var(--sf-h-input)] min-w-0 cursor-pointer grid-cols-[var(--sf-size-inner-icon-card)_minmax(0,1fr)_auto] items-center border px-[var(--sf-space-base)] py-[var(--sf-space-xs)] transition-colors focus-within:ring-4 focus-within:ring-brand-500/20',
                            isActive
                              ? 'border-brand-500 bg-brand-50 text-brand-900'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-300 hover:bg-white',
                            pendingParticipationMode && 'cursor-not-allowed opacity-60',
                          )}
                          style={{ columnGap: 'var(--sf-space-sm)', borderRadius: 'var(--sf-radius-inner)' }}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name={`raffle-participation-${raffle.id}`}
                            value={mode}
                            checked={isActive}
                            onChange={() => requestParticipationModeChange(mode)}
                          />
                          <Icon className="shrink-0" size="var(--sf-size-inner-icon-card)" strokeWidth={2} aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="sf-text-body font-bold leading-tight">{label}</span>
                          </span>
                          <span className="shrink-0 self-center text-right sf-text-body font-bold tabular-nums">
                            ${formatPrice(price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {raffle.sharedParticipationEnabled && participationMode === 'SHARED' && (
                <div
                  role="note"
                  className="order-2 flex w-full min-w-0 items-center border border-sky-200 bg-sky-50/60 sm:order-4"
                  style={{ borderRadius: 'var(--sf-radius-inner)', padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-sm)' }}
                >
                  <UsersRound className="shrink-0 text-sky-700" size="var(--sf-size-inner-icon-card)" strokeWidth={2} aria-hidden="true" />
                  <p className="min-w-0 flex-1 sf-text-secondary text-stone-700">
                    Pagas el 50% del boleto y, si gana, recibes el 50% del premio.{' '}
                    <button
                      type="button"
                      onClick={() => setIsSharedParticipationDetailsOpen(true)}
                      aria-haspopup="dialog"
                      className="font-bold text-sky-800 underline decoration-sky-300 underline-offset-2 transition-colors hover:text-sky-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20"
                    >
                      ¿Qué es una participación compartida?
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>

        {filteredTickets.length > 0 ? (
          <>
            <div
              className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10"
              style={{ gap: 'var(--sf-space-sm)' }}
            >
              {visibleTickets.map((number) => {
                const availability = ticketAvailabilityByNumber.get(number);
                const ticketStatus = getRaffleTicketDisplayStatus(availability, participationMode);
                const isOccupied = ticketStatus !== 'AVAILABLE';
                const isSelected = selectedTickets.includes(number);
                const isPartiallyShared = isRaffleTicketPartiallyShared(availability);
                const ticketAriaLabel = isPartiallyShared
                  ? participationMode === 'SHARED'
                    ? `Boleto ${number}, una participación compartida disponible`
                    : `Boleto ${number}, una participación compartida ya fue ocupada`
                  : `Boleto ${number}`;

                return (
                  <button
                    key={number}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => toggleTicket(number)}
                    aria-label={ticketAriaLabel}
                    className={cn(
                      'aspect-square flex items-center justify-center text-xs font-black transition-all duration-300 active:scale-90 sm:text-sm',
                      isSelected
                        ? 'scale-105 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                        : isPartiallyShared
                          ? isOccupied
                            ? 'cursor-not-allowed border border-sky-300 bg-sky-50 text-sky-800 opacity-70'
                            : 'border border-sky-300 bg-sky-50 text-sky-800 hover:border-sky-500 hover:bg-sky-100'
                          : ticketStatus === 'PAID'
                        ? 'cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700 opacity-70'
                        : ticketStatus === 'RESERVED'
                          ? 'cursor-not-allowed border border-amber-200 bg-amber-50 text-amber-700 opacity-70'
                          : 'border border-stone-200 bg-white text-stone-600 hover:border-brand-500 hover:text-brand-500'
                    )}
                    style={{ borderRadius: 'var(--sf-radius-inner)' }}
                  >
                    <span className="flex flex-col items-center leading-none" style={{ gap: 'var(--sf-space-xs)' }}>
                      <span>{number}</span>
                      {isPartiallyShared && availability?.shared && (
                        <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em]">{availability.shared.occupied}/2</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="grid grid-cols-[max-content_max-content] justify-center sf-text-label text-stone-400 md:flex md:flex-wrap md:items-center md:justify-center"
              style={{
                columnGap: 'var(--sf-space-md)',
                rowGap: 'var(--sf-space-sm)',
              }}
            >
              <LegendItem label="Disponible" className="bg-white border border-stone-200" />
              <LegendItem label="Seleccionado" className="bg-brand-500" />
              <LegendItem label="Apartado" className="bg-amber-500" />
              <LegendItem label="Pagado" className="bg-emerald-600" />
              {raffle.sharedParticipationEnabled && <LegendItem label="Compartido 1/2" className="bg-sky-500" />}
            </div>

            <div
              className="flex flex-col items-center md:flex-row md:justify-between"
              style={{ gap: 'var(--sf-space-base)' }}
            >
              <p className="text-center sf-text-secondary text-stone-500 md:text-left">
                Mostrando {visibleRangeStart}–{visibleRangeEnd} de {filteredTickets.length} boletos
              </p>

              <StorefrontPaginator page={page} totalPages={totalPages} onPageChange={changePage} />
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center text-center"
            style={{ gap: 'var(--sf-space-md)', paddingBlock: 'var(--sf-space-xl)' }}
          >
            <div className="flex max-w-md flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
              <h3 className="sf-text-h2 text-stone-950">
                {filters.availability === 'AVAILABLE' ? 'No quedan boletos disponibles' : 'No encontramos boletos'}
              </h3>
              <p className="sf-text-secondary text-stone-500">
                {filters.availability === 'AVAILABLE'
                  ? 'Puedes consultar el universo completo y revisar el estado de cada boleto.'
                  : 'Prueba con otros filtros o cambia el número que estás buscando.'}
              </p>
            </div>
            {filters.availability === 'AVAILABLE' && (
              <Button type="button" variant="outline" context="autonomous" onClick={showAllTickets}>
                Ver todos
              </Button>
            )}
          </div>
        )}
        </section>

        <aside id="raffle-selection-summary" className="hidden scroll-mt-[var(--sf-mobile-chrome-content-padding-top)] lg:block">
          <RaffleSelectionSummaryCard
            selectedTickets={selectedTickets}
            ticketOpportunities={raffle.extraOpportunities ?? []}
            total={totalAmount}
            participationMode={participationMode}
            onRemoveTicket={toggleTicket}
            actionLabel="Revisar selección"
            onAction={onOpenSelection}
            actionDisabled={selectedTickets.length === 0}
            actionTestId="raffle-selection-trigger"
          />
        </aside>
      </div>

      <TicketFilterPanel
        isOpen={isFilterPanelOpen}
        filters={draftFilters}
        onChange={setDraftFilters}
        onReset={resetFilters}
        onApply={applyFilters}
        onClose={() => setIsFilterPanelOpen(false)}
      />

      <StorefrontConfirmModal
        isOpen={pendingParticipationMode !== null}
        onClose={() => setPendingParticipationMode(null)}
        eyebrow="Cambio de modalidad"
        title="¿Confirmar cambio?"
        message={`Cambiarás a ${pendingParticipationModeLabel}. ${
          selectedTickets.length === 1
            ? 'Se quitará 1 boleto de tu selección. Después podrás elegirlo nuevamente con la nueva modalidad.'
            : `Se quitarán ${selectedTickets.length} boletos de tu selección. Después podrás elegirlos nuevamente con la nueva modalidad.`
        }`}
        variant="warning"
        confirmLabel="Cambiar modalidad"
        cancelLabel="Mantener selección"
        actionLayout="inline"
        onConfirm={confirmParticipationModeChange}
      />

      <SharedParticipationDetailsSurface
        hasExtraOpportunities={hasExtraOpportunities}
        isMobile={isMobile}
        isOpen={isSharedParticipationDetailsOpen}
        onClose={() => setIsSharedParticipationDetailsOpen(false)}
        prizePolicy={raffle.sharedParticipationPrizePolicy}
      />
    </>
  );
}

function LegendItem({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center justify-start" style={{ gap: 'var(--sf-space-sm)' }}>
      <div className={cn('h-3 w-3 rounded-full', className)} />
      {label}
    </div>
  );
}
