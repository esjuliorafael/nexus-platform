"use client";

import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps {
  value: string;
  options: SegmentedControlOption[];
  onChange: (value: string) => void;
  columns?: string;
  className?: string;
}

export function SegmentedControl({
  value,
  options,
  onChange,
  columns,
  className,
}: SegmentedControlProps) {
  const isGrid = Boolean(columns);

  return (
    <div
      className={cn(
        isGrid ? `grid ${columns}` : 'inline-flex flex-wrap',
        'bg-stone-100 border border-stone-200/50',
        className,
      )}
      style={{
        borderRadius: 'var(--sf-radius-card-inner)',
        padding: 'var(--sf-space-xs)',
        gap: 'var(--sf-space-xs)',
      }}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'sf-text-button-card inline-flex items-center justify-center whitespace-nowrap border transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 active:scale-95',
              isSelected
                ? 'border-white bg-white text-brand-600 shadow-sm'
                : 'border-transparent text-stone-500 hover:bg-white/60 hover:text-stone-850',
            )}
            style={{
              minHeight: 'var(--sf-h-button-card)',
              borderRadius: 'var(--sf-radius-card-nested)',
              paddingInline: 'var(--sf-padding-button-card-inline)',
              transitionTimingFunction: 'var(--sf-ease)',
            }}
          >
            {Icon && (
              <Icon
                style={{
                  width: 'var(--sf-size-inner-icon-badge)',
                  height: 'var(--sf-size-inner-icon-badge)',
                }}
                strokeWidth={isSelected ? 2.6 : 2.2}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
