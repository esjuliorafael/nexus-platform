import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import {
  NexusFilterGroup,
  type NexusFilterOption,
} from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";
import {
  DEFAULT_TICKET_BOARD_FILTER,
  type TicketBoardFilter,
} from "./RaffleTicketBoardView";

interface RaffleTicketBoardFiltersModalProps {
  isOpen: boolean;
  value: TicketBoardFilter;
  onClose: () => void;
  onApply: (filter: TicketBoardFilter) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: NexusFilterOption<TicketBoardFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponibles" },
  { value: "reserved", label: "Apartados" },
  { value: "paid", label: "Pagados" },
  { value: "review", label: "En revisión" },
];

export const RaffleTicketBoardFiltersModal: React.FC<
  RaffleTicketBoardFiltersModalProps
> = ({ isOpen, value, onClose, onApply, onClear }) => {
  const [draft, setDraft] = React.useState<TicketBoardFilter>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_TICKET_BOARD_FILTER);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Boletos"
      eyebrow="Boletera"
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
      <NexusFilterGroup
        title="Estado"
        value={draft}
        options={STATUS_OPTIONS}
        onChange={setDraft}
      />
    </NexusDrawer>
  );
};
