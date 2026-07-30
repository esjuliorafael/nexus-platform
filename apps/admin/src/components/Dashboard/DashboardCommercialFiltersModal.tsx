import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import type {
  DashboardCommercialSource,
  SalesOverviewPaymentMethod,
  SalesOverviewPeriod,
} from "../../types";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import {
  NexusFilterGroup,
  type NexusFilterOption,
} from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";

export interface DashboardCommercialFilters {
  period: SalesOverviewPeriod;
  source: DashboardCommercialSource;
  paymentMethod: SalesOverviewPaymentMethod;
}

export const DEFAULT_DASHBOARD_COMMERCIAL_FILTERS: DashboardCommercialFilters = {
  period: "7D",
  source: "ALL",
  paymentMethod: "ALL",
};

const PERIOD_OPTIONS: NexusFilterOption<SalesOverviewPeriod>[] = [
  { value: "TODAY", label: "Hoy" },
  { value: "7D", label: "7 Días" },
  { value: "15D", label: "15 Días" },
  { value: "MONTH", label: "Este Mes" },
  { value: "ALL", label: "Histórico" },
];

const SOURCE_OPTIONS: NexusFilterOption<DashboardCommercialSource>[] = [
  { value: "ALL", label: "Todo" },
  { value: "STORE", label: "Tienda" },
  { value: "RAFFLES", label: "Rifas" },
];

const PAYMENT_METHOD_OPTIONS: NexusFilterOption<SalesOverviewPaymentMethod>[] = [
  { value: "ALL", label: "Todos" },
  { value: "TRANSFER", label: "Depósito / Transferencia" },
  { value: "MERCADOPAGO", label: "Tarjeta" },
];

interface DashboardCommercialFiltersModalProps {
  isOpen: boolean;
  value: DashboardCommercialFilters;
  onClose: () => void;
  onApply: (filters: DashboardCommercialFilters) => void;
  onClear: () => void;
}

export const DashboardCommercialFiltersModal: React.FC<
  DashboardCommercialFiltersModalProps
> = ({ isOpen, value, onClose, onApply, onClear }) => {
  const [draft, setDraft] =
    React.useState<DashboardCommercialFilters>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_DASHBOARD_COMMERCIAL_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Inicio"
      eyebrow="Vista Comercial"
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
          title="Periodo"
          value={draft.period}
          options={PERIOD_OPTIONS}
          onChange={(period) =>
            setDraft((current) => ({ ...current, period }))
          }
        />
        <NexusFilterGroup
          title="Origen"
          value={draft.source}
          options={SOURCE_OPTIONS}
          onChange={(source) =>
            setDraft((current) => ({ ...current, source }))
          }
        />
        <NexusFilterGroup
          title="Método de Pago"
          value={draft.paymentMethod}
          options={PAYMENT_METHOD_OPTIONS}
          onChange={(paymentMethod) =>
            setDraft((current) => ({ ...current, paymentMethod }))
          }
        />
      </div>
    </NexusDrawer>
  );
};
