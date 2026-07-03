"use client";

import type { SegmentedControlOption } from "./SegmentedControl";

interface StorefrontPillFilterProps {
  title: string;
  value: string;
  options: SegmentedControlOption[];
  onChange: (value: string) => void;
  fullBleedMobile?: boolean;
}

export function StorefrontPillFilter({
  title,
  value,
  options,
  onChange,
  fullBleedMobile = false,
}: StorefrontPillFilterProps) {
  return (
    <section className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
      <h2 className="sf-text-h3 font-black text-stone-950">{title}</h2>

      <div
        className={
          fullBleedMobile
            ? "-mx-[var(--sf-inset-page-mobile)] overflow-x-auto px-[var(--sf-inset-page-mobile)] [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
            : ""
        }
        style={fullBleedMobile ? { scrollPaddingInline: "var(--sf-inset-page-mobile)" } : undefined}
      >
        <div
          className={fullBleedMobile ? "flex w-max min-w-full items-center md:w-auto md:min-w-0 md:flex-wrap" : "flex flex-wrap items-center"}
          style={{ gap: "var(--sf-space-sm)" }}
        >
          {options.map((option) => {
            const isActive = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`sf-text-button-card shrink-0 whitespace-nowrap transition-colors ${
                  isActive ? "bg-brand-500 text-white" : "bg-transparent text-stone-500 hover:text-stone-900"
                }`}
                style={{
                  height: "var(--sf-h-button-card)",
                  borderRadius: "var(--sf-radius-card-inner)",
                  paddingInline: "var(--sf-space-lg)",
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
}
