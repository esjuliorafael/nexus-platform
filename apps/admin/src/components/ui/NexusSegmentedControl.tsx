import React from 'react';

export interface NexusSegmentedControlOption<T extends string> {
  value: T;
  label: string;
  activeClassName?: string;
}

interface NexusSegmentedControlProps<T extends string> {
  value: T;
  options: NexusSegmentedControlOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function NexusSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
}: NexusSegmentedControlProps<T>) {
  return (
    <div
      className={`flex bg-stone-100 border border-stone-200 shadow-inner ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      style={{
        borderRadius: 'var(--radius-nested-simple)',
        padding: 'var(--space-xs)',
        gap: 'var(--space-xs)',
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`text-label font-black uppercase transition-all duration-300 ${
              isActive
                ? option.activeClassName || 'bg-white text-brand-600 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'
            }`}
            style={{
              borderRadius: 'var(--radius-nested-compact)',
              paddingBlock: 'var(--space-xs)',
              paddingInline: 'var(--space-base)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
