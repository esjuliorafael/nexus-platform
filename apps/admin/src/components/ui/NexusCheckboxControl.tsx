import { Check } from "lucide-react";

interface NexusCheckboxControlProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export const NexusCheckboxControl: React.FC<NexusCheckboxControlProps> = ({
  checked,
  onChange,
  disabled = false,
}) => (
  <>
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
  </>
);
