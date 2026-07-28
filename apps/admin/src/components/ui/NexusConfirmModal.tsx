import React from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { NexusAutonomousButton, type NexusButtonVariant } from "./NexusButton";
import { NexusModalActions } from "./NexusModal";
import {
  NexusSurfaceHeaderItem,
  NexusSurfaceItem,
  NexusTemporarySurface,
} from "./NexusTemporarySurface";

type NexusConfirmTone = "danger" | "warning" | "brand";

interface NexusConfirmModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  message: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: NexusConfirmTone;
  icon?: LucideIcon;
  zIndex?: number;
  isLoading?: boolean;
}

const toneClasses: Record<NexusConfirmTone, string> = {
  brand: "border-brand-100 bg-brand-50 text-brand-600",
  danger: "border-rose-100 bg-rose-50 text-rose-500",
  warning: "border-amber-100 bg-amber-50 text-amber-500",
};

const confirmVariantByTone: Record<NexusConfirmTone, NexusButtonVariant> = {
  brand: "brand",
  danger: "danger",
  warning: "warning",
};

export const NexusConfirmModal: React.FC<NexusConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  showCancel = true,
  onConfirm,
  onCancel,
  tone = "danger",
  icon: Icon = AlertTriangle,
  zIndex = 250,
  isLoading = false,
}) => {
  const titleId = React.useId();

  return (
    <NexusTemporarySurface
      isOpen={isOpen}
      onClose={onCancel}
      role="alertdialog"
      labelledBy={titleId}
      zIndex={zIndex}
      desktopPresentation="modal"
      mobilePresentation="sheet"
      containerClassName="flex items-end justify-center p-0 sm:items-center sm:p-[var(--space-lg)]"
      panelClassName="box-border w-full min-w-0 max-w-full overflow-hidden rounded-b-none rounded-t-[var(--radius-outer)] bg-bg-card shadow-2xl sm:rounded-[var(--radius-outer)]"
      panelStyle={{ maxWidth: "min(100dvw, var(--width-modal-compact))" }}
    >
      <div
        className="box-border flex w-full min-w-0 max-w-full flex-col items-center overflow-x-hidden text-center"
        style={{
          padding: "var(--padding-inner)",
          paddingBottom:
            "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
          gap: "var(--space-md)",
        }}
      >
        <NexusSurfaceHeaderItem
          part="identity"
          className="flex flex-col items-center"
          style={{ gap: "var(--space-md)" }}
        >
          <div
            className={`flex items-center justify-center border ${toneClasses[tone]}`}
            style={{
              width: "var(--size-icon-autonomous)",
              height: "var(--size-icon-autonomous)",
              borderRadius: "var(--radius-card-inner)",
            }}
          >
            <Icon size={22} />
          </div>

          <div
            className="flex flex-col items-center"
            style={{ gap: "var(--space-xs)" }}
          >
            <h3 id={titleId} className="text-h2 text-text-main">
              {title}
            </h3>
          </div>
        </NexusSurfaceHeaderItem>

        <NexusSurfaceItem phase="content">
          <p className="max-w-full break-words text-secondary text-text-muted">
            {message}
          </p>
        </NexusSurfaceItem>

        <NexusModalActions
          className="w-full flex-col sm:flex-row"
          style={{ marginTop: "var(--space-sm)" }}
        >
          {showCancel && (
            <NexusAutonomousButton
              type="button"
              onClick={onCancel}
              variant="secondary"
              disabled={isLoading}
              className="w-full sm:flex-1"
            >
              {cancelLabel}
            </NexusAutonomousButton>
          )}
          <NexusAutonomousButton
            type="button"
            onClick={onConfirm}
            variant={confirmVariantByTone[tone]}
            isLoading={isLoading}
            className="w-full sm:flex-1"
          >
            {confirmLabel}
          </NexusAutonomousButton>
        </NexusModalActions>
      </div>
    </NexusTemporarySurface>
  );
};
