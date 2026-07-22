import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusDrawer } from "../../ui/NexusDrawer";
import { NexusFilterGroup, type NexusFilterOption } from "../../ui/NexusFilterGroup";
import { NexusModalActions } from "../../ui/NexusModal";

export type MediaVaultFilter = "ALL" | "PHOTO" | "VIDEO";

export const DEFAULT_MEDIA_VAULT_FILTER: MediaVaultFilter = "ALL";

interface MediaVaultFiltersModalProps {
  isOpen: boolean;
  value: MediaVaultFilter;
  onClose: () => void;
  onApply: (filter: MediaVaultFilter) => void;
  onClear: () => void;
}

const TYPE_OPTIONS: NexusFilterOption<MediaVaultFilter>[] = [
  { value: "ALL", label: "Todos" },
  { value: "PHOTO", label: "Fotografías" },
  { value: "VIDEO", label: "Videos" },
];

export const MediaVaultFiltersModal: React.FC<MediaVaultFiltersModalProps> = ({
  isOpen,
  value,
  onClose,
  onApply,
  onClear,
}) => {
  const [draft, setDraft] = React.useState<MediaVaultFilter>(value);

  React.useEffect(() => {
    if (isOpen) setDraft(value);
  }, [isOpen, value]);

  const handleClear = () => {
    setDraft(DEFAULT_MEDIA_VAULT_FILTER);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Archivos"
      eyebrow="Bóveda de Medios"
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
        title="Tipo de Archivo"
        value={draft}
        options={TYPE_OPTIONS}
        onChange={setDraft}
      />
    </NexusDrawer>
  );
};
