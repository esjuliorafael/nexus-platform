import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusDrawer } from "../../ui/NexusDrawer";
import { NexusFilterGroup, type NexusFilterOption } from "../../ui/NexusFilterGroup";
import { NexusModalActions } from "../../ui/NexusModal";

export type RaffleParticipationStatusFilter =
  | "PENDING"
  | "PAID"
  | "CANCELLED"
  | "PAYMENT_REVIEW"
  | "NOT_COMPLETED"
  | "ALL";
export type RaffleParticipationTypeFilter = "all" | "simple" | "opportunities";
export type RaffleParticipationPaymentFilter = "all" | "transfer" | "card";

export interface RaffleParticipationAdvancedFilters {
  status: RaffleParticipationStatusFilter;
  type: RaffleParticipationTypeFilter;
  paymentMethod: RaffleParticipationPaymentFilter;
}

export const DEFAULT_RAFFLE_PARTICIPATION_FILTERS: RaffleParticipationAdvancedFilters = {
  status: "PENDING",
  type: "all",
  paymentMethod: "all",
};

interface RaffleParticipationFiltersModalProps {
  isOpen: boolean;
  value: RaffleParticipationAdvancedFilters;
  onClose: () => void;
  onApply: (filters: RaffleParticipationAdvancedFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: NexusFilterOption<RaffleParticipationStatusFilter>[] = [
  { value: "ALL", label: "Todas" },
  { value: "PAYMENT_REVIEW", label: "En revisión" },
  { value: "PENDING", label: "Apartadas" },
  { value: "PAID", label: "Pagadas" },
  { value: "NOT_COMPLETED", label: "No concretadas" },
  { value: "CANCELLED", label: "Canceladas" },
];

const TYPE_OPTIONS: NexusFilterOption<RaffleParticipationTypeFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "simple", label: "Simples" },
  { value: "opportunities", label: "Oportunidades" },
];

const PAYMENT_OPTIONS: NexusFilterOption<RaffleParticipationPaymentFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "transfer", label: "Depósito / Transferencia" },
  { value: "card", label: "Tarjeta" },
];

export const RaffleParticipationFiltersModal: React.FC<
  RaffleParticipationFiltersModalProps
> = ({ isOpen, value, onClose, onApply, onClear }) => {
  const [draft, setDraft] = React.useState<RaffleParticipationAdvancedFilters>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_RAFFLE_PARTICIPATION_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Participaciones"
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
          desktopFullRowValues={["CANCELLED"]}
          onChange={(status) => setDraft((current) => ({ ...current, status }))}
        />
        <NexusFilterGroup
          title="Tipo de Rifa"
          value={draft.type}
          options={TYPE_OPTIONS}
          onChange={(type) => setDraft((current) => ({ ...current, type }))}
        />
        <NexusFilterGroup
          title="Método de Pago"
          value={draft.paymentMethod}
          options={PAYMENT_OPTIONS}
          onChange={(paymentMethod) => setDraft((current) => ({ ...current, paymentMethod }))}
        />
      </div>
    </NexusDrawer>
  );
};
