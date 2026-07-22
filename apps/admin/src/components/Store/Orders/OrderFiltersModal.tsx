import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusDrawer } from "../../ui/NexusDrawer";
import { NexusFilterGroup, type NexusFilterOption } from "../../ui/NexusFilterGroup";
import { NexusModalActions } from "../../ui/NexusModal";

export type OrderStatusFilter =
  | "pending"
  | "paid"
  | "cancelled"
  | "payment_review"
  | "not_completed"
  | "all";
export type OrderTypeFilter = "all" | "birds" | "articles" | "mixed";
export type OrderPaymentMethodFilter = "all" | "transfer" | "card";
export type OrderDeliveryMethodFilter = "all" | "bus_station" | "airport" | "parcel";

export interface OrderAdvancedFilters {
  status: OrderStatusFilter;
  type: OrderTypeFilter;
  paymentMethod: OrderPaymentMethodFilter;
  deliveryMethod: OrderDeliveryMethodFilter;
}

export const DEFAULT_ORDER_ADVANCED_FILTERS: OrderAdvancedFilters = {
  status: "pending",
  type: "all",
  paymentMethod: "all",
  deliveryMethod: "all",
};

interface OrderFiltersModalProps {
  isOpen: boolean;
  value: OrderAdvancedFilters;
  onClose: () => void;
  onApply: (filters: OrderAdvancedFilters) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: NexusFilterOption<OrderStatusFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "payment_review", label: "En revisión" },
  { value: "pending", label: "Apartadas" },
  { value: "paid", label: "Pagadas" },
  { value: "not_completed", label: "No concretadas" },
  { value: "cancelled", label: "Canceladas" },
];

const TYPE_OPTIONS: NexusFilterOption<OrderTypeFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "birds", label: "Aves" },
  { value: "articles", label: "Artículos" },
  { value: "mixed", label: "Mixtos" },
];

const PAYMENT_OPTIONS: NexusFilterOption<OrderPaymentMethodFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "transfer", label: "Depósito / Transferencia" },
  { value: "card", label: "Tarjeta" },
];

const DELIVERY_OPTIONS: NexusFilterOption<OrderDeliveryMethodFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "bus_station", label: "Central de autobuses" },
  { value: "airport", label: "Aeropuerto" },
  { value: "parcel", label: "Paquetería" },
];

export const OrderFiltersModal: React.FC<OrderFiltersModalProps> = ({
  isOpen,
  value,
  onClose,
  onApply,
  onClear,
}) => {
  const [draft, setDraft] = React.useState<OrderAdvancedFilters>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_ORDER_ADVANCED_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Órdenes"
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
          title="Estado"
          value={draft.status}
          options={STATUS_OPTIONS}
          desktopFullRowValues={["cancelled"]}
          onChange={(status) => setDraft((current) => ({ ...current, status }))}
        />
        <NexusFilterGroup
          title="Tipo de Pedido"
          value={draft.type}
          options={TYPE_OPTIONS}
          desktopFullRowValues={["mixed"]}
          onChange={(type) => setDraft((current) => ({ ...current, type }))}
        />
        <NexusFilterGroup
          title="Método de Pago"
          value={draft.paymentMethod}
          options={PAYMENT_OPTIONS}
          onChange={(paymentMethod) => setDraft((current) => ({ ...current, paymentMethod }))}
        />
        <NexusFilterGroup
          title="Método de Entrega"
          value={draft.deliveryMethod}
          options={DELIVERY_OPTIONS}
          desktopFullRowValues={["parcel"]}
          onChange={(deliveryMethod) => setDraft((current) => ({ ...current, deliveryMethod }))}
        />
      </div>
    </NexusDrawer>
  );
};
