import { NexusCheckboxControl } from "./NexusCheckboxControl";

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
    <NexusCheckboxControl checked={checked} onChange={onChange} disabled={disabled} />
    <span className="text-body font-medium">{label}</span>
  </label>
);
