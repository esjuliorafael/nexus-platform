import React from 'react';
import { Search } from 'lucide-react';
import { iconSizes } from '../../constants';

interface NexusSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onValueChange: (value: string) => void;
}

export const NexusSectionSearch: React.FC<NexusSearchInputProps> = ({
  value,
  onValueChange,
  placeholder = 'Buscar...',
  className = '',
  ...props
}) => (
  <label
    className={`flex w-full min-w-0 items-center border border-border-main bg-bg-card transition-colors duration-300 focus-within:border-brand-300 sm:w-[min(22rem,35vw)] ${className}`}
    style={{
      height: 'var(--size-button-section)',
      borderRadius: 'var(--radius-inner-visual)',
      paddingInline: 'var(--padding-button-inline)',
      gap: 'var(--space-sm)',
    }}
  >
    <Search
      aria-hidden="true"
      className="shrink-0 text-text-muted"
      size={iconSizes.section}
      strokeWidth={2.4}
    />
    <input
      {...props}
      type="search"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      className="min-w-0 flex-1 bg-transparent text-button-section font-semibold text-text-main outline-none placeholder:text-text-muted/60"
    />
  </label>
);
