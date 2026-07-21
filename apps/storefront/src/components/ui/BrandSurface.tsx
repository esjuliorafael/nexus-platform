import { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function StorefrontBrandSurface({
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border border-white/[0.22] bg-white/[0.14] shadow-[0_12px_32px_rgba(12,10,9,0.16),inset_0_0_0_1px_rgba(12,10,9,0.05)] backdrop-blur-md",
        className,
      )}
      style={{
        padding: "var(--sf-padding-brand-surface)",
        borderRadius: "var(--sf-radius-control-surface)",
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
