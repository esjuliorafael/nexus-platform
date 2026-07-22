import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { type LucideIcon, X } from "lucide-react";
import { NexusAutonomousButton } from "./NexusButton";
import { useModalScrollLock } from "./useModalScrollLock";

interface NexusDrawerProps {
  isOpen: boolean;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
}

export const NexusDrawer: React.FC<NexusDrawerProps> = ({
  isOpen,
  title,
  eyebrow,
  icon: Icon,
  onClose,
  children,
  footer,
  zIndex = 100,
}) => {
  useModalScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 flex w-full max-w-[100dvw] items-end justify-center overflow-x-hidden md:items-stretch md:justify-end"
      style={{ zIndex }}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 animate-in fade-in duration-300"
        style={{ backgroundColor: "var(--modal-backdrop)" }}
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[88dvh] w-full min-w-0 flex-col overflow-hidden rounded-b-none rounded-t-[var(--radius-outer)] bg-bg-card shadow-2xl animate-in slide-in-from-bottom-10 duration-300 md:h-full md:max-h-none md:rounded-l-[var(--radius-outer)] md:rounded-r-none md:slide-in-from-bottom-0 md:slide-in-from-right-10"
        style={{ maxWidth: "min(100dvw, var(--width-drawer))" }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-border-main"
          style={{
            padding: "var(--padding-inner)",
            gap: "var(--space-md)",
          }}
        >
          <div className="flex min-w-0 items-center" style={{ gap: "var(--space-md)" }}>
            {Icon && (
              <div
                className="flex shrink-0 items-center justify-center border border-brand-100 bg-brand-50 text-brand-600"
                style={{
                  width: "var(--size-icon-autonomous)",
                  height: "var(--size-icon-autonomous)",
                  borderRadius: "var(--radius-card-inner)",
                }}
              >
                <Icon size={22} />
              </div>
            )}
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
              {eyebrow && (
                <span className="text-label uppercase tracking-[0.15em] text-brand-500">{eyebrow}</span>
              )}
              <h3 className="break-words text-h1 text-text-main">{title}</h3>
            </div>
          </div>
          <NexusAutonomousButton
            type="button"
            variant="secondary"
            density="compact"
            isIconOnly
            icon={X}
            className="shrink-0"
            aria-label="Cerrar"
            onClick={onClose}
          />
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            padding: "var(--padding-inner)",
            paddingBottom: footer
              ? "var(--padding-inner)"
              : "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0 border-t border-border-main bg-bg-card"
            style={{
              padding: "var(--padding-inner)",
              paddingBottom: "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
