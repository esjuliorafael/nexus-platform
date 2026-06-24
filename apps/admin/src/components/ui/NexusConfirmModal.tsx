import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, LucideIcon } from "lucide-react";
import { NexusAutonomousButton, NexusButtonVariant } from "./NexusButton";
import { NexusModalActions } from "./NexusModal";

type NexusConfirmTone = "danger" | "warning" | "brand";

interface NexusConfirmModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  message: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: NexusConfirmTone;
  icon?: LucideIcon;
  zIndex?: number;
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
  onConfirm,
  onCancel,
  tone = "danger",
  icon: Icon = AlertTriangle,
  zIndex = 250,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 flex items-end justify-center p-0 animate-in fade-in duration-300 sm:items-center sm:p-[var(--space-lg)]"
      style={{ zIndex }}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "var(--modal-backdrop)" }}
        onClick={onCancel}
      />
      <div
        className="relative w-full overflow-hidden rounded-b-none rounded-t-[var(--radius-outer)] bg-bg-card shadow-2xl animate-in slide-in-from-bottom-10 duration-300 sm:rounded-[var(--radius-outer)] sm:zoom-in-95"
        style={{ maxWidth: "var(--width-modal-compact)" }}
      >
        <div
          className="flex flex-col items-center text-center"
          style={{
            padding: "var(--padding-inner)",
            paddingBottom:
              "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
            gap: "var(--space-md)",
          }}
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
            <h3 className="text-h2 text-text-main">{title}</h3>
            <p className="text-secondary text-text-muted">{message}</p>
          </div>

          <NexusModalActions
            className="w-full flex-col sm:flex-row"
            style={{ marginTop: "var(--space-sm)" }}
          >
            <NexusAutonomousButton
              type="button"
              onClick={onCancel}
              variant="secondary"
              className="w-full sm:flex-1"
            >
              {cancelLabel}
            </NexusAutonomousButton>
            <NexusAutonomousButton
              type="button"
              onClick={onConfirm}
              variant={confirmVariantByTone[tone]}
              className="w-full sm:flex-1"
            >
              {confirmLabel}
            </NexusAutonomousButton>
          </NexusModalActions>
        </div>
      </div>
    </div>,
    document.body,
  );
};
