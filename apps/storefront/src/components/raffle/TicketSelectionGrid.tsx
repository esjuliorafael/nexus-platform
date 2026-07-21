import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Raffle, RaffleTicketAvailability } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { StorefrontField } from '../ui/Field';
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
  onSelectedTicketsChange: (tickets: string[]) => void;
  onOpenSelection: () => void;
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
  onSelectedTicketsChange,
  onOpenSelection,
}: TicketSelectionGridProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const selectionSectionRef = useRef<HTMLElement>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>({ ...DEFAULT_TICKET_FILTERS });
  const [draftFilters, setDraftFilters] = useState<TicketFilters>(filters);

  const allTickets = useMemo(() => {
    return getPrimaryTickets(raffle);
  }, [raffle]);

  const ticketStatusByNumber = useMemo(
    () => new Map(ticketAvailability.map((ticket) => [ticket.ticketNumber, ticket.status])),
    [ticketAvailability],
  );

  const toggleTicket = (number: string) => {
    if (ticketStatusByNumber.has(number)) return;

    onSelectedTicketsChange(
      selectedTickets.includes(number)
        ? selectedTickets.filter((ticket) => ticket !== number)
        : [...selectedTickets, number]
    );
  };

  const filteredTickets = allTickets.filter((ticket) => {
    const status = ticketStatusByNumber.get(ticket) ?? 'AVAILABLE';
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
  const totalAmount = selectedTickets.length * Number(raffle.ticketPrice);
  const hasActiveFilters = filters.availability !== DEFAULT_TICKET_FILTERS.availability
    || filters.parity !== 'ALL'
    || filters.pageSize !== DEFAULT_TICKETS_PER_PAGE;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: 'var(--sf-space-md)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
            <h2 className="sf-text-h1 text-stone-850">Selecciona tus boletos</h2>
            <p className="sf-text-body text-stone-500">Elige los números disponibles para participar.</p>
          </div>
          <div className="flex w-full sm:w-auto" style={{ gap: 'var(--sf-space-sm)' }}>
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
        </div>

        {filteredTickets.length > 0 ? (
          <>
            <div
              className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10"
              style={{ gap: 'var(--sf-space-sm)' }}
            >
              {visibleTickets.map((number) => {
                const ticketStatus = ticketStatusByNumber.get(number);
                const isOccupied = Boolean(ticketStatus);
                const isSelected = selectedTickets.includes(number);

                return (
                  <button
                    key={number}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => toggleTicket(number)}
                    className={cn(
                      'aspect-square flex items-center justify-center text-xs font-black transition-all duration-300 active:scale-90 sm:text-sm',
                      ticketStatus === 'PAID'
                        ? 'cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700 opacity-70'
                        : ticketStatus === 'RESERVED'
                          ? 'cursor-not-allowed border border-amber-200 bg-amber-50 text-amber-700 opacity-70'
                          : isSelected
                            ? 'scale-105 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                            : 'border border-stone-200 bg-white text-stone-600 hover:border-brand-500 hover:text-brand-500'
                    )}
                    style={{ borderRadius: 'var(--sf-radius-inner)' }}
                  >
                    {number}
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
