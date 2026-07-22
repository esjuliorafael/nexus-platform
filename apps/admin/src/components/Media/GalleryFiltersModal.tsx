import React from "react";
import { Check, Filter, RotateCcw } from "lucide-react";
import { apiCategories } from "../../api";
import type { Category } from "../../types";
import { NexusAutonomousButton } from "../ui/NexusButton";
import { NexusDrawer } from "../ui/NexusDrawer";
import { NexusFilterGroup, type NexusFilterOption } from "../ui/NexusFilterGroup";
import { NexusModalActions } from "../ui/NexusModal";

export type GalleryMediaTypeFilter = "all" | "PHOTO" | "VIDEO";

export interface GalleryAdvancedFilters {
  type: GalleryMediaTypeFilter;
  categoryId: string;
}

export const DEFAULT_GALLERY_ADVANCED_FILTERS: GalleryAdvancedFilters = {
  type: "all",
  categoryId: "all",
};

interface GalleryFiltersModalProps {
  isOpen: boolean;
  value: GalleryAdvancedFilters;
  onClose: () => void;
  onApply: (filters: GalleryAdvancedFilters) => void;
  onClear: () => void;
}

const TYPE_OPTIONS: NexusFilterOption<GalleryMediaTypeFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "PHOTO", label: "Fotografías" },
  { value: "VIDEO", label: "Videos" },
];

export const GalleryFiltersModal: React.FC<GalleryFiltersModalProps> = ({
  isOpen,
  value,
  onClose,
  onApply,
  onClear,
}) => {
  const [draft, setDraft] = React.useState<GalleryAdvancedFilters>(value);
  const [categories, setCategories] = React.useState<Category[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;
    setDraft(value);
    void apiCategories
      .getAll()
      .then(setCategories)
      .catch((error) => console.error("No se pudieron cargar las categorías", error));
  }, [isOpen, value]);

  const categoryOptions = React.useMemo<NexusFilterOption<string>[]>(
    () => [
      { value: "all", label: "Todas" },
      ...categories.map((category) => ({ value: String(category.id), label: category.name })),
    ],
    [categories],
  );
  const categoryFullRowValues = React.useMemo(
    () => categories.length % 2 === 1 && categories.length > 0
      ? [String(categories[categories.length - 1].id)]
      : [],
    [categories],
  );

  const handleClear = () => {
    setDraft(DEFAULT_GALLERY_ADVANCED_FILTERS);
    onClear();
  };

  return (
    <NexusDrawer
      isOpen={isOpen}
      title="Filtrar Medios"
      eyebrow="Panel de Medios"
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
          title="Tipo de Medio"
          value={draft.type}
          options={TYPE_OPTIONS}
          onChange={(type) => setDraft((current) => ({ ...current, type }))}
        />
        <NexusFilterGroup
          title="Categoría"
          value={draft.categoryId}
          options={categoryOptions}
          desktopFullRowValues={categoryFullRowValues}
          onChange={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
        />
      </div>
    </NexusDrawer>
  );
};
