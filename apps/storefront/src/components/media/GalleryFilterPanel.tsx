"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { SegmentedControlOption } from "../ui/SegmentedControl";
import { Button } from "../ui/Button";
import { StorefrontFilterPanel } from "../ui/FilterPanel";
import { StorefrontPillFilter } from "../ui/PillFilter";

interface GalleryFilterPanelProps {
  isOpen: boolean;
  type: string;
  category: string;
  categoryOptions: SegmentedControlOption[];
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}

const mediaTypeOptions = [
  { value: "ALL", label: "Todo" },
  { value: "PHOTO", label: "Fotos" },
  { value: "VIDEO", label: "Videos" },
];

export function GalleryFilterPanel({
  isOpen,
  type,
  category,
  categoryOptions,
  onTypeChange,
  onCategoryChange,
  onReset,
  onApply,
  onClose,
}: GalleryFilterPanelProps) {
  return (
    <StorefrontFilterPanel
      isOpen={isOpen}
      title="Filtrar galería"
      icon={SlidersHorizontal}
      dialogLabel="Filtros de la galería"
      footer={
        <div className="flex" style={{ gap: "var(--sf-space-sm)" }}>
          <Button
            type="button"
            variant="outline"
            context="section"
            className="flex-1"
            icon={RotateCcw}
            onClick={onReset}
          >
            Restablecer
          </Button>
          <Button
            type="button"
            variant="brand"
            context="section"
            className="flex-1"
            onClick={onApply}
          >
            Aplicar filtros
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <StorefrontPillFilter
          title="Tipo de medio"
          value={type}
          options={mediaTypeOptions}
          onChange={onTypeChange}
          context="modal"
          fullBleedMobile
          fullBleedMobileInset="page"
          desktopColumns={3}
        />
        <StorefrontPillFilter
          title="Categorías"
          value={category}
          options={categoryOptions}
          onChange={onCategoryChange}
          context="modal"
          fullBleedMobile
          fullBleedMobileInset="page"
          desktopColumns={2}
          desktopFullRowValues={["ALL"]}
        />
      </div>
    </StorefrontFilterPanel>
  );
}
