"use client";

import { AlertTriangle, Check, LucideIcon, X } from "lucide-react";
import { StorefrontModal } from "./Modal";
import { Button } from "./Button";

interface StorefrontConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: LucideIcon;
  variant?: "brand" | "danger" | "success";
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onClose: () => void;
}

export function StorefrontConfirmModal({
  isOpen,
  title,
  message,
  icon = AlertTriangle,
  variant = "brand",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}: StorefrontConfirmModalProps) {
  const confirmVariant = variant === "danger" ? "danger" : variant === "success" ? "success" : "primary";

  return (
    <StorefrontModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      icon={icon}
      variant={variant}
      width="compact"
      showDefaultActions={false}
    >
      <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
        <Button
          type="button"
          variant={confirmVariant}
          context="section"
          icon={Check}
          isLoading={isLoading}
          onClick={async () => {
            await onConfirm();
          }}
          className="w-full"
        >
          {confirmLabel}
        </Button>
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
          className="w-full border-stone-100 text-stone-500 hover:bg-stone-50"
        >
          {cancelLabel}
        </Button>
      </div>
    </StorefrontModal>
  );
}
