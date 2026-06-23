import React from "react";
import { LucideIcon } from "lucide-react";

export type NexusBadgeVariant =
  | "brand"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "muted"
  | "overlayBrand"
  | "overlay"
  | "overlaySuccess";

export type NexusBadgeContext =
  | "section"
  | "card"
  | "autonomous"
  | "default";

interface NexusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: NexusBadgeVariant;
  context?: NexusBadgeContext;
}

const variantStyles: Record<NexusBadgeVariant, string> = {
  brand: "border border-brand-100 bg-brand-50 text-brand-700",
  success: "border border-emerald-200/70 bg-emerald-50 text-emerald-700",
  info: "border border-blue-200/70 bg-blue-50 text-blue-700",
  warning: "border border-amber-200/70 bg-amber-50 text-amber-700",
  danger: "border border-rose-200/70 bg-rose-50 text-rose-700",
  muted: "border border-border-main bg-bg-muted text-text-muted",
  overlayBrand:
    "border border-brand-400/30 bg-brand-500 text-white backdrop-blur-md",
  overlay: "border border-white/10 bg-stone-950/45 text-white backdrop-blur-md",
  overlaySuccess:
    "border border-emerald-400/20 bg-emerald-500 text-white backdrop-blur-md",
};

const radiusStyles: Record<NexusBadgeContext, string> = {
  section: "var(--radius-inner-visual)",
  card: "var(--radius-nested-simple)",
  autonomous: "var(--radius-card-inner)",
  default: "var(--radius-nested-simple)",
};

export const NexusBadge: React.FC<NexusBadgeProps> = ({
  children,
  icon: Icon,
  variant = "muted",
  context = "default",
  className = "",
  style,
  ...props
}) => (
  <span
    className={`inline-flex items-center text-label uppercase ${variantStyles[variant]} ${className}`}
    style={{
      gap: "var(--space-xs)",
      padding: "var(--space-xs) calc(var(--space-sm) * 1.5)",
      borderRadius: radiusStyles[context],
      ...style,
    }}
    {...props}
  >
    {Icon && (
      <Icon
        strokeWidth={2.5}
        style={{
          width: "var(--size-inner-icon-badge)",
          height: "var(--size-inner-icon-badge)",
        }}
      />
    )}
    {children}
  </span>
);

export const NexusSectionBadge: React.FC<Omit<NexusBadgeProps, "context">> = (
  props,
) => <NexusBadge {...props} context="section" />;

export const NexusCardBadge: React.FC<Omit<NexusBadgeProps, "context">> = (
  props,
) => <NexusBadge {...props} context="card" />;

export const NexusAutonomousBadge: React.FC<
  Omit<NexusBadgeProps, "context">
> = (props) => <NexusBadge {...props} context="autonomous" />;
