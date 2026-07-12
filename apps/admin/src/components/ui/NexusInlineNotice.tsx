import React from "react";
import { AlertCircle, AlertTriangle, Check, Info, LucideIcon } from "lucide-react";

export type NexusInlineNoticeVariant = "neutral" | "info" | "success" | "warning" | "danger";
export type NexusInlineNoticeContext = "section" | "card";

interface NexusInlineNoticeProps {
  title: string;
  children: React.ReactNode;
  variant?: NexusInlineNoticeVariant;
  context?: NexusInlineNoticeContext;
  icon?: LucideIcon;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<NexusInlineNoticeVariant, string> = {
  neutral: "border-border-main bg-bg-muted text-text-muted",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

const variantIcons: Record<NexusInlineNoticeVariant, LucideIcon> = {
  neutral: Info,
  info: Info,
  success: Check,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export const NexusInlineNotice: React.FC<NexusInlineNoticeProps> = ({
  title,
  children,
  variant = "neutral",
  context = "section",
  icon: Icon = variantIcons[variant],
  className = "",
  style,
}) => (
  <div
    className={`flex flex-col border ${variantStyles[variant]} ${className}`}
    role={variant === "warning" || variant === "danger" ? "alert" : "status"}
    style={{
      gap: "var(--space-md)",
      padding: "var(--padding-inner)",
      borderRadius: context === "section" ? "var(--radius-inner-visual)" : "var(--radius-nested-simple)",
      ...style,
    }}
  >
    <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
      <Icon size={18} className="shrink-0" />
      <span className="text-label uppercase tracking-[0.15em]">{title}</span>
    </div>
    <div className="text-secondary">{children}</div>
  </div>
);
