import React from "react";
import { type LucideIcon, X } from "lucide-react";
import { NexusAutonomousButton } from "./NexusButton";
import {
  NexusSurfaceHeaderItem,
  NexusSurfaceItem,
  NexusTemporarySurface,
  useNexusSurfacePhase,
  useNexusTemporarySurfaceContext,
} from "./NexusTemporarySurface";

interface NexusModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  iconTone?: "brand" | "danger" | "warning";
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "compact" | "standard" | "wide";
  zIndex?: number;
  onAfterClose?: () => void;
}

interface NexusModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const widthBySize = {
  compact: "var(--width-modal-compact)",
  standard: "var(--width-modal-standard)",
  wide: "var(--width-modal-wide)",
};

export const NexusModal: React.FC<NexusModalProps> = ({
  isOpen,
  title,
  eyebrow,
  icon: Icon,
  iconTone = "brand",
  onClose,
  children,
  footer,
  size = "standard",
  zIndex = 100,
  onAfterClose,
}) => {
  const titleId = React.useId();
  const iconToneClasses = {
    brand: "border-brand-100 bg-brand-50 text-brand-600",
    danger: "border-rose-100 bg-rose-50 text-rose-500",
    warning: "border-amber-100 bg-amber-50 text-amber-500",
  };

  return (
    <NexusTemporarySurface
      isOpen={isOpen}
      onClose={onClose}
      onAfterClose={onAfterClose}
      labelledBy={titleId}
      zIndex={zIndex}
      desktopPresentation="modal"
      mobilePresentation="sheet"
      containerClassName="flex items-end justify-center p-0 sm:items-center sm:p-[var(--space-lg)]"
      panelClassName="box-border flex max-h-[90dvh] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-b-none rounded-t-[var(--radius-outer)] bg-bg-card shadow-2xl sm:rounded-[var(--radius-outer)]"
      panelStyle={{ maxWidth: `min(100dvw, ${widthBySize[size]})` }}
    >
      <div className="box-border flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <div
          className="flex shrink-0 items-start justify-between"
          style={{
            gap: "var(--space-md)",
            padding: "var(--padding-inner)",
            paddingBottom: "var(--space-md)",
          }}
        >
          <NexusSurfaceHeaderItem
            part="identity"
            className="flex min-w-0 items-start"
            style={{ gap: "var(--space-md)" }}
          >
            {Icon && (
              <div
                className={`flex shrink-0 items-center justify-center border ${iconToneClasses[iconTone]}`}
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
              onClick={onClose}
              type="button"
              variant="secondary"
              density="compact"
              isIconOnly
              icon={X}
              aria-label="Cerrar"
            />
          </NexusSurfaceHeaderItem>
        </div>

        <div
          className="nexus-mobile-temporary-scroll-region min-h-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden"
          style={{
            paddingInline: "var(--padding-inner)",
            paddingBottom: footer
              ? "var(--padding-inner)"
              : "calc(var(--padding-inner) + env(safe-area-inset-bottom))",
          }}
        >
          <NexusSurfaceItem phase="content" spatialMotion={false}>
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
      </div>
    </NexusTemporarySurface>
  );
};

export const NexusModalActions: React.FC<NexusModalActionsProps> = ({
  children,
  className = "",
  style,
  ...props
}) => {
  const isInsideTemporarySurface = useNexusTemporarySurfaceContext();
  const containingPhase = useNexusSurfacePhase();
  const classes = `flex ${className}`;
  const mergedStyle = { gap: "var(--space-sm)", ...style };

  if (isInsideTemporarySurface && containingPhase !== "footer") {
    return (
      <NexusSurfaceItem
        phase="footer"
        className={classes}
        style={mergedStyle}
        {...props}
      >
        {children}
      </NexusSurfaceItem>
    );
  }

  return (
    <div className={classes} style={mergedStyle} {...props}>
      {children}
    </div>
  );
};
