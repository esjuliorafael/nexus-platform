import React from "react";

export interface NexusFilterOption<T extends string> {
  value: T;
  label: string;
}

interface NexusFilterGroupProps<T extends string> {
  title: string;
  value: T;
  options: readonly NexusFilterOption<T>[];
  onChange: (value: T) => void;
  desktopFullRowValues?: readonly T[];
}

export const NexusFilterGroup = <T extends string>({
  title,
  value,
  options,
  onChange,
  desktopFullRowValues = [],
}: NexusFilterGroupProps<T>) => (
  <section className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
    <h4 className="text-label uppercase tracking-[0.15em] text-text-muted">{title}</h4>
    <div
      className="no-scrollbar -mx-[var(--padding-inner)] touch-pan-x overflow-x-auto overscroll-x-contain pl-[max(var(--padding-inner),env(safe-area-inset-left))] pr-[max(var(--padding-inner),env(safe-area-inset-right))] md:mx-0 md:overflow-visible md:px-0"
      style={{
        scrollPaddingInlineStart: "max(var(--padding-inner), env(safe-area-inset-left))",
        scrollPaddingInlineEnd: "max(var(--padding-inner), env(safe-area-inset-right))",
      }}
    >
      <div
        className="flex w-max min-w-full items-center md:grid md:w-full md:min-w-0 md:grid-cols-2"
        style={{ gap: "var(--space-sm)" }}
        role="group"
        aria-label={title}
      >
        {options.map((option, index) => {
          const isActive = option.value === value;
          const isFullRow = index === 0 || desktopFullRowValues.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`shrink-0 whitespace-nowrap border border-transparent text-button-card font-bold transition-all duration-300 md:w-full ${
                isFullRow ? "md:col-span-2" : ""
              } ${
                isActive
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "bg-transparent text-text-muted hover:text-text-main"
              }`}
              style={{
                height: "var(--size-button-card)",
                borderRadius: "var(--radius-card-inner)",
                paddingInline: "var(--padding-button-card-inline)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  </section>
);
