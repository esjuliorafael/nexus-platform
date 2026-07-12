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
  context?: 'section' | 'card';
  className?: string;
}

export function NexusSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  context = 'card',
  className = '',
}: NexusSegmentedControlProps<T>) {
  const isSectionContext = context === 'section';

  return (
    <div
      className={`flex bg-stone-100 border border-stone-200 shadow-inner ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      style={{
        borderRadius: isSectionContext
          ? 'var(--radius-inner-visual)'
          : 'var(--radius-nested-simple)',
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
              borderRadius: isSectionContext
                ? 'var(--radius-segmented-section-option)'
                : 'var(--radius-segmented-card-option)',
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
