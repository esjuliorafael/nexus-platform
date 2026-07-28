import React from "react";
import { type LucideIcon, X } from "lucide-react";
import { NexusAutonomousButton } from "./NexusButton";
import {
  NexusSurfaceHeaderItem,
  NexusSurfaceItem,
  NexusTemporarySurface,
} from "./NexusTemporarySurface";

interface NexusDrawerProps {
  isOpen: boolean;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
  mobileFullscreen?: boolean;
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
  mobileFullscreen = false,
}) => {
  const titleId = React.useId();

  return (
    <NexusTemporarySurface
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      zIndex={zIndex}
      desktopMediaQuery="(min-width: 768px)"
      desktopPresentation="drawer"
      mobilePresentation={mobileFullscreen ? "drawer" : "sheet"}
      containerClassName="flex items-end justify-center md:items-stretch md:justify-end"
      panelClassName={`flex w-full min-w-0 flex-col overflow-hidden bg-bg-card shadow-2xl md:h-full md:max-h-none md:rounded-l-[var(--radius-outer)] md:rounded-r-none ${
        mobileFullscreen
          ? "h-[100dvh] max-h-[100dvh] rounded-none"
          : "max-h-[88dvh] rounded-b-none rounded-t-[var(--radius-outer)]"
      }`}
      panelStyle={{ maxWidth: "min(100dvw, var(--width-drawer))" }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b border-border-main"
        style={{
          padding: "var(--padding-inner)",
          gap: "var(--space-md)",
        }}
      >
        <NexusSurfaceHeaderItem
          part="identity"
          className="flex min-w-0 items-center"
          style={{ gap: "var(--space-md)" }}
        >
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
          <div
            className="flex min-w-0 flex-col"
            style={{ gap: "var(--space-xs)" }}
          >
            {eyebrow && (
              <span className="text-label uppercase tracking-[0.15em] text-brand-500">
                {eyebrow}
              </span>
            )}
            <h3 id={titleId} className="break-words text-h1 text-text-main">
              {title}
            </h3>
          </div>
        </NexusSurfaceHeaderItem>

        <NexusSurfaceHeaderItem part="close" className="shrink-0">
          <NexusAutonomousButton
            type="button"
            variant="secondary"
            density="compact"
            isIconOnly
            icon={X}
            aria-label="Cerrar"
            onClick={onClose}
          />
        </NexusSurfaceHeaderItem>
      </div>

      <div
        className={`nexus-mobile-temporary-scroll-region min-h-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden ${
          mobileFullscreen ? "nexus-mobile-drawer-scroll-region" : ""
        }`}
        style={{
          padding: "var(--padding-inner)",
          paddingBottom: footer
            ? "var(--padding-inner)"
            : "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
        }}
      >
        <NexusSurfaceItem
          phase="content"
          spatialMotion={false}
          className="min-h-full"
        >
          {children}
        </NexusSurfaceItem>
      </div>

      {footer && (
        <NexusSurfaceItem
          phase="footer"
          className="shrink-0 border-t border-border-main bg-bg-card"
          style={{
            padding: "var(--padding-inner)",
            paddingBottom:
              "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
          }}
        >
          {footer}
        </NexusSurfaceItem>
      )}
    </NexusTemporarySurface>
  );
};
