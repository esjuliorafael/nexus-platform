import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import {
  NexusFilterGroup,
  type NexusFilterOption,
} from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";

export type OperationsSourceFilter = "all" | "store" | "raffles";
export type OperationsStatusFilter =
  | "all"
  | "payment_review"
  | "pending"
  | "paid"
  | "not_completed"
  | "cancelled";
export type OperationsPaymentFilter = "all" | "transfer" | "card";

export interface OperationsAdvancedFilters {
  source: OperationsSourceFilter;
  status: OperationsStatusFilter;
  paymentMethod: OperationsPaymentFilter;
}

export const DEFAULT_OPERATIONS_FILTERS: OperationsAdvancedFilters = {
  source: "all",
  status: "all",
  paymentMethod: "all",
};

const SOURCE_OPTIONS: NexusFilterOption<OperationsSourceFilter>[] = [
  { value: "all", label: "Todo" },
  { value: "store", label: "Tienda" },
  { value: "raffles", label: "Rifas" },
];

const STATUS_OPTIONS: NexusFilterOption<OperationsStatusFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "payment_review", label: "En revisión" },
  { value: "pending", label: "Apartadas" },
  { value: "paid", label: "Pagadas" },
  { value: "not_completed", label: "No concretadas" },
  { value: "cancelled", label: "Canceladas" },
];

const PAYMENT_OPTIONS: NexusFilterOption<OperationsPaymentFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "transfer", label: "Depósito / Transferencia" },
  { value: "card", label: "Tarjeta" },
];

interface OperationsFiltersModalProps {
  isOpen: boolean;
  value: OperationsAdvancedFilters;
  onClose: () => void;
  onApply: (filters: OperationsAdvancedFilters) => void;
  onClear: () => void;
}

export const OperationsFiltersModal: React.FC<
  OperationsFiltersModalProps
> = ({ isOpen, value, onClose, onApply, onClear }) => {
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Operaciones"
      eyebrow="Centro Operativo"
      icon={Filter}
      onClose={onClose}
      footer={
        <NexusModalActions>
          <NexusAutonomousButton
            type="button"
            variant="secondary"
            icon={RotateCcw}
            onClick={() => {
              setDraft(DEFAULT_OPERATIONS_FILTERS);
              onClear();
            }}
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
          title="Origen"
          value={draft.source}
          options={SOURCE_OPTIONS}
          onChange={(source) =>
            setDraft((current) => ({ ...current, source }))
          }
        />
        <NexusFilterGroup
          title="Estado"
          value={draft.status}
          options={STATUS_OPTIONS}
          desktopFullRowValues={["cancelled"]}
          onChange={(status) =>
            setDraft((current) => ({ ...current, status }))
          }
        />
        <NexusFilterGroup
          title="Método de Pago"
          value={draft.paymentMethod}
          options={PAYMENT_OPTIONS}
          onChange={(paymentMethod) =>
            setDraft((current) => ({ ...current, paymentMethod }))
          }
        />
      </div>
    </NexusDrawer>
  );
};
