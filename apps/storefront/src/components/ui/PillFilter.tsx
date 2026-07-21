"use client";

import type { SegmentedControlOption } from "./SegmentedControl";

interface StorefrontPillFilterProps {
  title: string;
  value: string;
  options: SegmentedControlOption[];
  onChange: (value: string) => void;
  context?: "page" | "modal";
  fullBleedMobile?: boolean;
  fullBleedMobileInset?: "page" | "container";
  desktopColumns?: 2 | 3;
  desktopFullRowValues?: string[];
  layout?: "default" | "first-full-row";
}

export function StorefrontPillFilter({
  title,
  value,
  options,
  onChange,
  context = "page",
  fullBleedMobile = false,
  fullBleedMobileInset = "page",
  desktopColumns,
  desktopFullRowValues = [],
  layout = "default",
}: StorefrontPillFilterProps) {
  const fullBleedClassName =
    fullBleedMobileInset === "container"
      ? "-mx-[var(--sf-padding-inner)] overflow-x-auto px-[var(--sf-padding-inner)] [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      : "-mx-[var(--sf-inset-page-mobile)] overflow-x-auto px-[var(--sf-inset-page-mobile)] [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden";
  const fullBleedInset =
    fullBleedMobileInset === "container" ? "var(--sf-padding-inner)" : "var(--sf-inset-page-mobile)";
  const pillRadius = context === "modal" ? "var(--sf-radius-inner)" : "var(--sf-radius-card-inner)";
  const desktopGridClassName =
    layout === "first-full-row" ? "md:grid md:w-full md:min-w-0 md:grid-cols-2" :
      desktopColumns === 2 ? "md:grid md:w-full md:min-w-0 md:grid-cols-2" :
      desktopColumns === 3 ? "md:grid md:w-full md:min-w-0 md:grid-cols-3" :
        "md:flex md:w-auto md:min-w-0 md:flex-wrap";

  return (
    <section className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
      <h2
        className={
          context === "modal"
            ? "sf-text-secondary-strong text-stone-950"
            : "sf-text-h2 font-black text-stone-950"
        }
      >
        {title}
      </h2>

      <div
        className={
          fullBleedMobile
            ? fullBleedClassName
            : ""
        }
        style={fullBleedMobile ? { scrollPaddingInline: fullBleedInset } : undefined}
      >
        <div
          className={`${fullBleedMobile ? "flex w-max min-w-full items-center" : "flex flex-wrap items-center"} ${desktopGridClassName}`}
          style={{ gap: "var(--sf-space-sm)" }}
        >
          {options.map((option, index) => {
            const isActive = value === option.value;
            const isFullRow = desktopColumns === 2 && desktopFullRowValues.includes(option.value);
            const isFirstFullRow = layout === "first-full-row" && index === 0;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`sf-text-button-card shrink-0 whitespace-nowrap transition-colors ${
                  layout === "first-full-row" ? "md:w-full" : desktopColumns ? "md:w-full" : ""
                } ${
                  isFullRow ? "md:col-span-2" : ""
                } ${
                  isFirstFullRow ? "md:col-span-2" : ""
                } ${
                  isActive ? "bg-brand-500 text-white" : "bg-transparent text-stone-500 hover:text-stone-900"
                }`}
                style={{
                  height: "var(--sf-h-button-card)",
                  borderRadius: pillRadius,
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
