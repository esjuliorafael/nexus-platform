import React from "react";
import { LucideIcon, Search, SlidersHorizontal } from "lucide-react";
import { iconSizes } from "../../constants";
import { NexusButton } from "./NexusButton";

export interface NexusViewToolbarSegment<T extends string = string> {
  value: T;
  label: string;
}

interface NexusViewToolbarProps<T extends string = string> {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  segments?: NexusViewToolbarSegment<T>[];
  activeSegment?: T;
  onSegmentChange?: (value: T) => void;
  resultLabel?: string;
  filterLabel?: string;
  filterActive?: boolean;
  onFilterClick?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function NexusViewToolbar<T extends string = string>({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  segments = [],
  activeSegment,
  onSegmentChange,
  resultLabel,
  filterLabel = "Filtros",
  filterActive = false,
  onFilterClick,
  icon: SearchIcon = Search,
  className = "",
}: NexusViewToolbarProps<T>) {
  const hasSegments = segments.length > 0 && activeSegment && onSegmentChange;

  return (
    <div
      className={`animate-in fade-in slide-in-from-top-2 flex flex-col duration-300 lg:flex-row lg:items-center lg:justify-between ${className}`}
      style={{ gap: "var(--space-md)" }}
      aria-label="Herramientas de vista"
    >
      {(hasSegments || resultLabel) && (
        <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-sm)" }}>
          {resultLabel && (
            <p className="text-label font-black uppercase text-text-muted">
              {resultLabel}
            </p>
          )}

          {hasSegments && (
            <div
              className="no-scrollbar ml-[calc(50%_-_50vw)] mr-[calc(50%_-_50vw)] w-screen overflow-x-auto pl-[max(var(--space-md),env(safe-area-inset-left))] pr-[max(var(--space-md),env(safe-area-inset-right))] lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0"
              style={{ scrollPaddingInline: "var(--space-md)" }}
            >
              <div
                className="flex w-max items-center"
                role="tablist"
                aria-label="Filtros de vista"
                style={{
                  gap: "var(--space-sm)",
                }}
              >
                {segments.map((segment) => {
                  const isActive = segment.value === activeSegment;

                  return (
                    <button
                      key={segment.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onSegmentChange(segment.value)}
                      className={`flex items-center whitespace-nowrap border text-button-section font-bold transition-all duration-300 ${
                        isActive
                          ? "border-brand-500 bg-brand-600 text-white hover:bg-brand-700"
                          : "border-border-main bg-bg-card text-text-muted hover:text-text-main"
                      }`}
                      style={{
                        height: "var(--size-button-section)",
                        borderRadius: "var(--radius-inner-visual)",
                        paddingInline: "var(--padding-button-inline)",
                        gap: "var(--space-xs)",
                      }}
                    >
                      <span>{segment.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center lg:ml-auto lg:max-w-xl lg:justify-end"
        style={{ gap: "var(--space-sm)" }}
      >
        {onSearchChange && (
          <label
            className="flex h-[var(--h-input)] min-w-0 w-full items-center border border-border-main bg-bg-card transition-all duration-300 focus-within:border-brand-300 sm:flex-1"
            style={{
              borderRadius: "var(--radius-inner-visual)",
              paddingInline: "var(--padding-button-inline)",
              gap: "var(--space-sm)",
            }}
          >
            <SearchIcon
              aria-hidden="true"
              className="shrink-0 text-text-muted"
              size={iconSizes.autonomous}
              strokeWidth={2.4}
            />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-button-section font-semibold text-text-main outline-none placeholder:text-text-muted/60"
            />
          </label>
        )}

        {onFilterClick && (
          <NexusButton
            type="button"
            variant={filterActive ? "brand" : "secondary"}
            context="section"
            icon={SlidersHorizontal}
            onClick={onFilterClick}
          >
            {filterLabel}
          </NexusButton>
        )}
      </div>
    </div>
  );
}
