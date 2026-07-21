"use client";

import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { StorefrontFilterPanel } from '../ui/FilterPanel';
import { StorefrontPillFilter } from '../ui/PillFilter';

export interface CatalogFilters {
  type: string;
  purpose: string;
  status: string;
}

interface CatalogFilterPanelProps {
  isOpen: boolean;
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}

const typeOptions = [
  { value: 'ALL', label: 'Todo' },
  { value: 'BIRD', label: 'Aves' },
  { value: 'ITEM', label: 'Artículos' },
];

const purposeOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'BREEDING', label: 'Cría' },
  { value: 'COMBAT', label: 'Combate' },
];

const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'RESERVED', label: 'Reservados' },
  { value: 'SOLD', label: 'Vendidos' },
];

export function CatalogFilterPanel({
  isOpen,
  filters,
  onChange,
  onReset,
  onApply,
  onClose,
}: CatalogFilterPanelProps) {
  const fields = <CatalogFilterContent filters={filters} onChange={onChange} />;
  const actions = <CatalogFilterActions onReset={onReset} onApply={onApply} />;

  return (
    <StorefrontFilterPanel
      isOpen={isOpen}
      title="Filtrar catálogo"
      icon={SlidersHorizontal}
      dialogLabel="Filtros del catálogo"
      footer={actions}
      onClose={onClose}
    >
      {fields}
    </StorefrontFilterPanel>
  );
}

function CatalogFilterContent({
  filters,
  onChange,
}: Pick<CatalogFilterPanelProps, 'filters' | 'onChange'>) {
  const updateType = (type: string) => {
    onChange({
      ...filters,
      type,
      purpose: type === 'BIRD' ? filters.purpose : 'ALL',
    });
  };

  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
      <StorefrontPillFilter
        title="Tipo de producto"
        value={filters.type}
        options={typeOptions}
        onChange={updateType}
        context="modal"
        fullBleedMobile
        fullBleedMobileInset="page"
        layout="first-full-row"
      />

      {filters.type === 'BIRD' && (
        <StorefrontPillFilter
          title="Propósito"
          value={filters.purpose}
          options={purposeOptions}
          onChange={(purpose) => onChange({ ...filters, purpose })}
          context="modal"
          fullBleedMobile
          fullBleedMobileInset="page"
          desktopColumns={3}
        />
      )}

      <StorefrontPillFilter
        title="Disponibilidad"
        value={filters.status}
        options={statusOptions}
        onChange={(status) => onChange({ ...filters, status })}
        context="modal"
        fullBleedMobile
        fullBleedMobileInset="page"
        desktopColumns={2}
      />
    </div>
  );
}

function CatalogFilterActions({
  onReset,
  onApply,
}: Pick<CatalogFilterPanelProps, 'onReset' | 'onApply'>) {
  return (
    <div className="flex" style={{ gap: 'var(--sf-space-sm)' }}>
      <Button
        type="button"
        variant="outline"
        context="section"
        className="flex-1"
        icon={RotateCcw}
        onClick={onReset}
      >
        Restablecer
      </Button>
      <Button type="button" variant="brand" context="section" className="flex-1" onClick={onApply}>
        Aplicar filtros
      </Button>
    </div>
  );
}
