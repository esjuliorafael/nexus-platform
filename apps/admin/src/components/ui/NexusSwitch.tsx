import React from "react";

interface NexusSwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeClassName?: string;
  inactiveClassName?: string;
}

export const NexusSwitch: React.FC<NexusSwitchProps> = ({
  checked,
  onChange,
  activeClassName = "bg-brand-500 shadow-lg shadow-brand-500/20",
  inactiveClassName = "bg-stone-200",
  className = "",
  disabled,
  ...props
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative shrink-0 transition-all duration-300 active:scale-90 disabled:opacity-60 ${checked ? activeClassName : inactiveClassName} ${className}`}
    style={{
      width: "calc(var(--h-button-card) * 1.15)",
      height: "calc(var(--h-button-card) * 0.58)",
      borderRadius: "var(--radius-pill)",
      transitionTimingFunction: "var(--ease-emil)",
      ...props.style,
    }}
    {...props}
  >
    <span
      className="absolute bg-white shadow-sm transition-all duration-300"
      style={{
        top: "var(--space-xs)",
        left: checked
          ? "calc(100% - (var(--h-button-card) * 0.42) - var(--space-xs))"
          : "var(--space-xs)",
        width: "calc(var(--h-button-card) * 0.42)",
        height: "calc(var(--h-button-card) * 0.42)",
        borderRadius: "var(--radius-circle)",
        transitionTimingFunction: "var(--ease-emil)",
      }}
    />
  </button>
);
