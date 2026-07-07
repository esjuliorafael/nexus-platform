import React from 'react';
import { Filter, Check, RotateCcw } from 'lucide-react';
import { NexusModal, NexusModalActions } from '../ui/NexusModal';
import { NexusAutonomousButton } from '../ui/NexusButton';

export type StoreProductPurposeFilter = 'all' | 'BREEDING' | 'COMBAT';
export type StoreProductAgeFilter = 'all' | 'STAG' | 'COCK' | 'PULLET' | 'HEN';
export type StoreProductPublicationFilter = 'all' | 'published' | 'paused';

export interface StoreProductAdvancedFilters {
  publication: StoreProductPublicationFilter;
  purpose: StoreProductPurposeFilter;
  age: StoreProductAgeFilter;
}

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface StoreProductFiltersModalProps {
  isOpen: boolean;
  value: StoreProductAdvancedFilters;
  onClose: () => void;
  onApply: (filters: StoreProductAdvancedFilters) => void;
  onClear: () => void;
}

const PURPOSE_OPTIONS: FilterOption<StoreProductPurposeFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'BREEDING', label: 'Cría' },
  { value: 'COMBAT', label: 'Combate' },
];

const PUBLICATION_OPTIONS: FilterOption<StoreProductPublicationFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'paused', label: 'Pausados' },
];

const AGE_OPTIONS: FilterOption<StoreProductAgeFilter>[] = [
  { value: 'all', label: 'Todas' },
  { value: 'STAG', label: 'Pollo' },
  { value: 'COCK', label: 'Gallo' },
  { value: 'PULLET', label: 'Polla' },
  { value: 'HEN', label: 'Gallina' },
];

const FilterGroup = <T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) => (
  <section className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
    <h4 className="text-label uppercase tracking-[0.15em] text-text-muted">
      {title}
    </h4>
    <div
      className="flex flex-wrap"
      style={{ gap: 'var(--space-sm)' }}
      role="group"
      aria-label={title}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`border text-button-card font-bold transition-all duration-300 ${
              isActive
                ? 'border-brand-500 bg-brand-600 text-white hover:bg-brand-700'
                : 'border-border-main bg-bg-muted text-text-muted hover:text-text-main'
            }`}
            style={{
              height: 'var(--size-button-card)',
              borderRadius: 'var(--radius-card-inner)',
              paddingInline: 'var(--padding-button-card-inline)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </section>
);

export const StoreProductFiltersModal: React.FC<StoreProductFiltersModalProps> = ({
  isOpen,
  value,
  onClose,
  onApply,
  onClear,
}) => {
  const [draft, setDraft] = React.useState<StoreProductAdvancedFilters>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft({ publication: 'all', purpose: 'all', age: 'all' });
    onClear();
  };

  return (
    <NexusModal
      isOpen={isOpen}
      title="Filtros Avanzados"
      eyebrow="Productos"
      icon={Filter}
      onClose={onClose}
      size="compact"
    >
      <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
        <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
          <FilterGroup
            title="Estado de Publicación"
            value={draft.publication}
            options={PUBLICATION_OPTIONS}
            onChange={(publication) => setDraft((prev) => ({ ...prev, publication }))}
          />
          <FilterGroup
            title="Propósito"
            value={draft.purpose}
            options={PURPOSE_OPTIONS}
            onChange={(purpose) => setDraft((prev) => ({ ...prev, purpose }))}
          />
          <FilterGroup
            title="Etapa"
            value={draft.age}
            options={AGE_OPTIONS}
            onChange={(age) => setDraft((prev) => ({ ...prev, age }))}
          />
        </div>

        <NexusModalActions>
          <NexusAutonomousButton
            type="button"
            variant="secondary"
            icon={RotateCcw}
            onClick={handleClear}
            className="flex-1"
          >
            Limpiar
          </NexusAutonomousButton>
          <NexusAutonomousButton
            type="button"
            variant="brand"
            icon={Check}
            onClick={() => onApply(draft)}
            className="flex-[2]"
          >
            Aplicar
          </NexusAutonomousButton>
        </NexusModalActions>
      </div>
    </NexusModal>
  );
};
