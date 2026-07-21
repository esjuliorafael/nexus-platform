"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { BottomSheet } from "./BottomSheet";
import { StorefrontDrawerDialog } from "./DrawerDialog";
import { StorefrontDrawerHeader } from "./DrawerHeader";
import { StorefrontTemporarySurfaceItem } from "./TemporarySurfaceMotion";

interface StorefrontFilterPanelProps {
  isOpen: boolean;
  title: string;
  icon: LucideIcon;
  dialogLabel: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}

export function StorefrontFilterPanel({
  isOpen,
  title,
  icon,
  dialogLabel,
  children,
  footer,
  onClose,
}: StorefrontFilterPanelProps) {
  const surfaceMode = useResponsiveSurfaceMode();
  useBodyScrollLock(isOpen && surfaceMode === "drawer");

  if (surfaceMode === null) return null;

  if (surfaceMode === "drawer") {
    return (
      <StorefrontDrawerDialog
        open={isOpen}
        label={dialogLabel}
        onRequestClose={onClose}
      >
        <div className="shrink-0">
          <StorefrontDrawerHeader
            icon={icon}
            title={title}
            closeLabel="Cerrar filtros"
            onClose={onClose}
            className="flex"
          />
        </div>

        <StorefrontTemporarySurfaceItem
          phase="content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          style={{ padding: "var(--sf-padding-inner)" }}
        >
          {children}
        </StorefrontTemporarySurfaceItem>

        <StorefrontTemporarySurfaceItem
          phase="footer"
          className="shrink-0 border-t border-stone-100"
          style={{ padding: "var(--sf-padding-inner)" }}
        >
          {footer}
        </StorefrontTemporarySurfaceItem>
      </StorefrontDrawerDialog>
    );
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      footer={footer}
    >
      {children}
    </BottomSheet>
  );
}

function useResponsiveSurfaceMode() {
  const [mode, setMode] = useState<"drawer" | "sheet" | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateMode = () => setMode(mediaQuery.matches ? "drawer" : "sheet");

    updateMode();
    mediaQuery.addEventListener("change", updateMode);
    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  return mode;
}
