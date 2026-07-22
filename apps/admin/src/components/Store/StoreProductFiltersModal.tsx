import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import { NexusFilterGroup, type NexusFilterOption } from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";

export type StoreProductTypeFilter = "all" | "bird" | "item";
export type StoreProductPurposeFilter = "all" | "BREEDING" | "COMBAT";
export type StoreProductAgeFilter = "all" | "STAG" | "COCK" | "PULLET" | "HEN";
export type StoreProductPublicationFilter = "all" | "published" | "paused";

export interface StoreProductAdvancedFilters {
  type: StoreProductTypeFilter;
  publication: StoreProductPublicationFilter;
  purpose: StoreProductPurposeFilter;
  age: StoreProductAgeFilter;
}

export const DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS: StoreProductAdvancedFilters = {
  type: "all",
  publication: "all",
  purpose: "all",
  age: "all",
};

interface StoreProductFiltersModalProps {
  isOpen: boolean;
  value: StoreProductAdvancedFilters;
  onClose: () => void;
  onApply: (filters: StoreProductAdvancedFilters) => void;
  onClear: () => void;
}

const TYPE_OPTIONS: NexusFilterOption<StoreProductTypeFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "bird", label: "Aves" },
  { value: "item", label: "Artículos" },
];

const PUBLICATION_OPTIONS: NexusFilterOption<StoreProductPublicationFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "paused", label: "Pausados" },
];

const PURPOSE_OPTIONS: NexusFilterOption<StoreProductPurposeFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "BREEDING", label: "Cría" },
  { value: "COMBAT", label: "Combate" },
];

const AGE_OPTIONS: NexusFilterOption<StoreProductAgeFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "STAG", label: "Pollo" },
  { value: "COCK", label: "Gallo" },
  { value: "PULLET", label: "Polla" },
  { value: "HEN", label: "Gallina" },
];

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
    setDraft(DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Productos"
      eyebrow="Tienda"
      icon={Filter}
      onClose={onClose}
      footer={
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
      }
    >
      <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
        <NexusFilterGroup
          title="Tipo de Producto"
          value={draft.type}
          options={TYPE_OPTIONS}
          onChange={(type) => setDraft((current) => ({ ...current, type }))}
        />
        <NexusFilterGroup
          title="Estado de Publicación"
          value={draft.publication}
          options={PUBLICATION_OPTIONS}
          onChange={(publication) => setDraft((current) => ({ ...current, publication }))}
        />
        <NexusFilterGroup
          title="Propósito"
          value={draft.purpose}
          options={PURPOSE_OPTIONS}
          onChange={(purpose) => setDraft((current) => ({ ...current, purpose }))}
        />
        <NexusFilterGroup
          title="Etapa"
          value={draft.age}
          options={AGE_OPTIONS}
          onChange={(age) => setDraft((current) => ({ ...current, age }))}
        />
      </div>
    </NexusDrawer>
  );
};
