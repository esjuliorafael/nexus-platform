import { Check } from "lucide-react";

interface NexusCheckboxRowProps {
  checked: boolean;
  label: React.ReactNode;
  onChange: () => void;
  disabled?: boolean;
}

export const NexusCheckboxRow: React.FC<NexusCheckboxRowProps> = ({
  checked,
  label,
  onChange,
  disabled = false,
}) => (
  <label
    className="group flex cursor-pointer items-center border border-border-main bg-bg-muted text-text-main transition-colors hover:border-brand-300 hover:bg-brand-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-500/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
    style={{
      minHeight: "var(--h-button-card)",
      gap: "var(--space-base)",
      padding: "var(--space-base)",
      borderRadius: "var(--radius-card-inner)",
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="peer sr-only"
    />
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center border transition-colors peer-focus-visible:border-brand-500"
      style={{
        borderColor: checked ? "var(--brand-600)" : "var(--border-main)",
        backgroundColor: checked ? "var(--brand-600)" : "var(--bg-card)",
        color: checked ? "white" : "transparent",
        borderRadius: "var(--radius-card-nested-compact)",
      }}
    >
      <Check size={14} strokeWidth={3} />
    </span>
    <span className="text-body font-medium">{label}</span>
  </label>
);
