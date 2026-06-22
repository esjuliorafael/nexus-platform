import React from "react";
import { LucideIcon, PlusCircle } from "lucide-react";

interface UploadPreviewOverlayProps {
  label: string;
  icon?: LucideIcon;
  className?: string;
  context?: "autonomous" | "section" | "card";
}

export const UploadPreviewOverlay: React.FC<UploadPreviewOverlayProps> = ({
  label,
  icon: Icon = PlusCircle,
  className = "",
  context = "autonomous",
}) => {
  const iconContainerRadius = {
    autonomous: "var(--radius-card-inner)",
    section: "var(--radius-inner-visual)",
    card: "var(--radius-card-nested)",
  }[context];

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 ${className}`}
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{ gap: "var(--space-sm)" }}
      >
        <div
          className="relative flex items-center justify-center overflow-hidden border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md"
          style={{
            width: "var(--size-stage-container-compact)",
            height: "var(--size-stage-container-compact)",
            borderRadius: iconContainerRadius,
            transform: "translateZ(0)",
            willChange: "opacity, transform, backdrop-filter",
          }}
        >
          <Icon
            className="relative z-10"
            strokeWidth={2.5}
            style={{
              width: "var(--size-stage-icon-compact)",
              height: "var(--size-stage-icon-compact)",
            }}
          />
        </div>

        <span className="text-label uppercase tracking-[0.15em] text-white">
          {label}
        </span>
      </div>
    </div>
  );
};
