"use client";

import { AlertTriangle, Check, LucideIcon, X } from "lucide-react";
import { StorefrontModal } from "./Modal";
import { Button } from "./Button";

interface StorefrontConfirmModalProps {
  isOpen: boolean;
  eyebrow?: string;
  title: string;
  message: string;
  icon?: LucideIcon;
  variant?: "brand" | "danger" | "success" | "warning";
  confirmLabel?: string;
  cancelLabel?: string;
  actionLayout?: "stacked" | "inline";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onClose: () => void;
}

export function StorefrontConfirmModal({
  isOpen,
  eyebrow,
  title,
  message,
  icon = AlertTriangle,
  variant = "brand",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  actionLayout = "stacked",
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}: StorefrontConfirmModalProps) {
  const confirmVariant = variant === "danger" ? "danger" : variant === "success" ? "success" : variant === "warning" ? "warning" : "primary";

  return (
    <StorefrontModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      icon={icon}
      variant={variant}
      width="compact"
      showDefaultActions={false}
    >
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <p className="sf-text-body whitespace-pre-line font-medium text-stone-600">
          {message}
        </p>
        <div
          className={actionLayout === "inline" ? "grid grid-cols-1 sm:grid-cols-2" : "flex flex-col"}
          style={{ gap: "var(--sf-space-sm)" }}
        >
          <Button
            type="button"
            variant="outline"
            context="section"
            icon={X}
            onClick={async () => {
              if (onCancel) {
                await onCancel();
                return;
              }
              onClose();
            }}
            className={actionLayout === "inline"
              ? "w-full border-stone-100 text-stone-500 hover:bg-stone-50"
              : "order-2 w-full border-stone-100 text-stone-500 hover:bg-stone-50"}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            context="section"
            icon={Check}
            isLoading={isLoading}
            onClick={async () => {
              await onConfirm();
            }}
            className={actionLayout === "inline" ? "w-full" : "order-1 w-full"}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </StorefrontModal>
  );
}
