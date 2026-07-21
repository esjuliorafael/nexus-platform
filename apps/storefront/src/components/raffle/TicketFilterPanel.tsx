"use client";

import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { StorefrontFilterPanel } from '../ui/FilterPanel';
import { StorefrontPillFilter } from '../ui/PillFilter';

export type TicketAvailabilityFilter = 'ALL' | 'AVAILABLE' | 'RESERVED' | 'PAID';
export type TicketParityFilter = 'ALL' | 'EVEN' | 'ODD';
export type TicketPageSize = 25 | 50 | 100;

export interface TicketFilters {
  availability: TicketAvailabilityFilter;
  parity: TicketParityFilter;
  pageSize: TicketPageSize;
}

interface TicketFilterPanelProps {
  isOpen: boolean;
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}

const availabilityOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'RESERVED', label: 'Apartados' },
  { value: 'PAID', label: 'Pagados' },
];

const parityOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'EVEN', label: 'Pares' },
  { value: 'ODD', label: 'Impares' },
];

const pageSizeOptions = [
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

export function TicketFilterPanel({
  isOpen,
  filters,
  onChange,
  onReset,
  onApply,
  onClose,
}: TicketFilterPanelProps) {
  const fields = (
    <TicketFilterContent
      filters={filters}
      onChange={onChange}
    />
  );
  const actions = <TicketFilterActions onReset={onReset} onApply={onApply} />;

  return (
    <StorefrontFilterPanel
      isOpen={isOpen}
      title="Filtrar boletos"
      icon={SlidersHorizontal}
      dialogLabel="Filtros de boletos"
      footer={actions}
      onClose={onClose}
    >
      {fields}
    </StorefrontFilterPanel>
  );
}

function TicketFilterContent({
  filters,
  onChange,
}: Pick<TicketFilterPanelProps, 'filters' | 'onChange'>) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
      <StorefrontPillFilter
        title="Disponibilidad"
        value={filters.availability}
        options={availabilityOptions}
        onChange={(availability) => onChange({ ...filters, availability: availability as TicketAvailabilityFilter })}
        context="modal"
        fullBleedMobile
        fullBleedMobileInset="page"
        desktopColumns={2}
      />

      <StorefrontPillFilter
        title="Número"
        value={filters.parity}
        options={parityOptions}
        onChange={(parity) => onChange({ ...filters, parity: parity as TicketParityFilter })}
        context="modal"
        fullBleedMobile
        fullBleedMobileInset="page"
        desktopColumns={2}
        desktopFullRowValues={['ALL']}
      />

      <StorefrontPillFilter
        title="Boletos por página"
        value={String(filters.pageSize)}
        options={pageSizeOptions}
        onChange={(pageSize) => onChange({ ...filters, pageSize: Number(pageSize) as TicketPageSize })}
        context="modal"
        fullBleedMobile
        fullBleedMobileInset="page"
        desktopColumns={3}
      />
    </div>
  );
}

function TicketFilterActions({
  onReset,
  onApply,
}: Pick<TicketFilterPanelProps, 'onReset' | 'onApply'>) {
  return (
    <div className="flex" style={{ gap: 'var(--sf-space-sm)' }}>
      <Button type="button" variant="outline" context="section" className="flex-1" icon={RotateCcw} onClick={onReset}>
        Restablecer
      </Button>
      <Button type="button" variant="brand" context="section" className="flex-1" onClick={onApply}>
        Aplicar filtros
      </Button>
    </div>
  );
}
