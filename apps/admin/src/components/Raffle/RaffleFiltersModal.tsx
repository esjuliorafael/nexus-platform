import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import { NexusFilterGroup, type NexusFilterOption } from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";

export type RaffleStatusFilter =
  | "all"
  | "open"
  | "upcoming"
  | "paused"
  | "closed"
  | "finished"
  | "cancelled";
export type RaffleTypeFilter = "all" | "simple" | "opportunities";
export type RaffleAccessFilter = "all" | "public" | "early_access";
export type RaffleFeaturedFilter = "all" | "featured" | "standard";

export interface RaffleAdvancedFilters {
  status: RaffleStatusFilter;
  type: RaffleTypeFilter;
  access: RaffleAccessFilter;
  featured: RaffleFeaturedFilter;
}

export const DEFAULT_RAFFLE_ADVANCED_FILTERS: RaffleAdvancedFilters = {
  status: "open",
  type: "all",
  access: "all",
  featured: "all",
};

interface RaffleFiltersModalProps {
  isOpen: boolean;
  value: RaffleAdvancedFilters;
  onClose: () => void;
  onApply: (filters: RaffleAdvancedFilters) => void;
  onClear: () => void;
}

const TYPE_OPTIONS: NexusFilterOption<RaffleTypeFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "simple", label: "Simples" },
  { value: "opportunities", label: "Oportunidades" },
];

const STATUS_OPTIONS: NexusFilterOption<RaffleStatusFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "upcoming", label: "Próximas" },
  { value: "paused", label: "Pausadas" },
  { value: "closed", label: "Cerradas" },
  { value: "finished", label: "Finalizadas" },
  { value: "cancelled", label: "Canceladas" },
];

const ACCESS_OPTIONS: NexusFilterOption<RaffleAccessFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "public", label: "Público" },
  { value: "early_access", label: "Acceso anticipado" },
];

const FEATURED_OPTIONS: NexusFilterOption<RaffleFeaturedFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "featured", label: "Destacadas" },
  { value: "standard", label: "No destacadas" },
];

export const RaffleFiltersModal: React.FC<RaffleFiltersModalProps> = ({
  isOpen,
  value,
  onClose,
  onApply,
  onClear,
}) => {
  const [draft, setDraft] = React.useState<RaffleAdvancedFilters>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_RAFFLE_ADVANCED_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Rifas"
      eyebrow="Rifas"
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
            title="Estado"
            value={draft.status}
            options={STATUS_OPTIONS}
            onChange={(status) => setDraft((current) => ({ ...current, status }))}
          />
          <NexusFilterGroup
            title="Tipo de Rifa"
            value={draft.type}
            options={TYPE_OPTIONS}
            onChange={(type) => setDraft((current) => ({ ...current, type }))}
          />
          <NexusFilterGroup
            title="Acceso"
            value={draft.access}
            options={ACCESS_OPTIONS}
            onChange={(access) => setDraft((current) => ({ ...current, access }))}
          />
          <NexusFilterGroup
            title="Presentación"
            value={draft.featured}
            options={FEATURED_OPTIONS}
            onChange={(featured) => setDraft((current) => ({ ...current, featured }))}
          />
      </div>
    </NexusDrawer>
  );
};
