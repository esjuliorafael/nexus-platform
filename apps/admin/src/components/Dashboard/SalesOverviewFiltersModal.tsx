import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import type {
  SalesOverviewPeriod,
  SalesOverviewPaymentMethod,
  SalesOverviewProductType,
} from "../../types";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import {
  NexusFilterGroup,
  type NexusFilterOption,
} from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";

export interface SalesOverviewFilters {
  period: SalesOverviewPeriod;
  productType: SalesOverviewProductType;
  paymentMethod: SalesOverviewPaymentMethod;
}

export const DEFAULT_SALES_OVERVIEW_FILTERS: SalesOverviewFilters = {
  period: "MONTH",
  productType: "ALL",
  paymentMethod: "ALL",
};

const PERIOD_OPTIONS: NexusFilterOption<SalesOverviewPeriod>[] = [
  { value: "TODAY", label: "Hoy" },
  { value: "7D", label: "7 Días" },
  { value: "15D", label: "15 Días" },
  { value: "MONTH", label: "Este Mes" },
  { value: "ALL", label: "Histórico" },
];

const PRODUCT_TYPE_OPTIONS: NexusFilterOption<SalesOverviewProductType>[] = [
  { value: "ALL", label: "Todos" },
  { value: "BIRD", label: "Aves" },
  { value: "ITEM", label: "Artículos" },
];

const PAYMENT_METHOD_OPTIONS: NexusFilterOption<SalesOverviewPaymentMethod>[] = [
  { value: "ALL", label: "Todos" },
  { value: "TRANSFER", label: "Depósito / Transferencia" },
  { value: "MERCADOPAGO", label: "Tarjeta" },
];

interface SalesOverviewFiltersModalProps {
  isOpen: boolean;
  value: SalesOverviewFilters;
  onClose: () => void;
  onApply: (filters: SalesOverviewFilters) => void;
  onClear: () => void;
}

export const SalesOverviewFiltersModal: React.FC<
  SalesOverviewFiltersModalProps
> = ({ isOpen, value, onClose, onApply, onClear }) => {
  const [draft, setDraft] = React.useState<SalesOverviewFilters>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_SALES_OVERVIEW_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Órdenes"
      eyebrow="Resumen de Órdenes"
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
          title="Tipo de Producto"
          value={draft.productType}
          options={PRODUCT_TYPE_OPTIONS}
          onChange={(productType) =>
            setDraft((current) => ({ ...current, productType }))
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
