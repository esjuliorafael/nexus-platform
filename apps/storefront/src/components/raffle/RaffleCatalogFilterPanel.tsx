"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/Button";
import { StorefrontFilterPanel } from "../ui/FilterPanel";
import { StorefrontPillFilter } from "../ui/PillFilter";

export type RaffleCatalogType = "ALL" | "SIMPLE" | "OPPORTUNITIES";

interface RaffleCatalogFilterPanelProps {
  isOpen: boolean;
  value: RaffleCatalogType;
  onChange: (value: RaffleCatalogType) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}

const raffleTypeOptions = [
  { value: "ALL", label: "Todas" },
  { value: "SIMPLE", label: "Simples" },
  { value: "OPPORTUNITIES", label: "Oportunidades" },
];

export function RaffleCatalogFilterPanel({
  isOpen,
  value,
  onChange,
  onReset,
  onApply,
  onClose,
}: RaffleCatalogFilterPanelProps) {
  const fields = (
    <StorefrontPillFilter
      title="Tipo de rifa"
      value={value}
      options={raffleTypeOptions}
      onChange={(nextValue) => onChange(nextValue as RaffleCatalogType)}
      context="modal"
      fullBleedMobile
      fullBleedMobileInset="page"
      desktopColumns={3}
    />
  );
  const actions = (
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
  );

  return (
    <StorefrontFilterPanel
      isOpen={isOpen}
      title="Filtrar rifas"
      icon={SlidersHorizontal}
      dialogLabel="Filtros de rifas"
      footer={actions}
      onClose={onClose}
    >
      {fields}
    </StorefrontFilterPanel>
  );
}
