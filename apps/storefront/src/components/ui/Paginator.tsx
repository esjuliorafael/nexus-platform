"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface StorefrontPaginatorProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function StorefrontPaginator({
  page,
  totalPages,
  onPageChange,
  className = "",
}: StorefrontPaginatorProps) {
  if (totalPages <= 1) return null;

  const mobilePages = getPageWindow(page, totalPages, 3);
  const desktopPages = getPageWindow(page, totalPages, 5);
  const goToPage = (nextPage: number) => {
    const safePage = Math.min(totalPages, Math.max(1, nextPage));
    if (safePage !== page) onPageChange(safePage);
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ paddingTop: "var(--sf-space-lg)" }}
    >
      <nav
        className="flex items-center border border-stone-200/90 bg-white shadow-[0_1rem_2rem_rgba(31,24,17,0.06)]"
        aria-label="Paginacion"
        style={{
          gap: "var(--sf-space-sm)",
          padding: "var(--sf-space-sm)",
          borderRadius: "var(--sf-radius-card-inner)",
        }}
      >
        <PageArrowButton
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          ariaLabel="Pagina anterior"
          icon={ChevronLeft}
        />

        <div className="flex items-center md:hidden" style={{ gap: "var(--sf-space-xs)" }}>
          {mobilePages.map((item) => (
            <PageNumberButton
              key={item}
              page={item}
              isActive={item === page}
              onClick={() => goToPage(item)}
            />
          ))}
        </div>

        <div className="hidden items-center md:flex" style={{ gap: "var(--sf-space-xs)" }}>
          {desktopPages.map((item) => (
            <PageNumberButton
              key={item}
              page={item}
              isActive={item === page}
              onClick={() => goToPage(item)}
            />
          ))}
        </div>

        <PageArrowButton
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          ariaLabel="Pagina siguiente"
          icon={ChevronRight}
        />
      </nav>
    </div>
  );
}

function getPageWindow(currentPage: number, totalPages: number, windowSize: number) {
  const safeWindow = Math.min(windowSize, totalPages);
  const halfWindow = Math.floor(safeWindow / 2);
  let start = currentPage - halfWindow;
  let end = start + safeWindow - 1;

  if (start < 1) {
    start = 1;
    end = safeWindow;
  }

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - safeWindow + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function PageNumberButton({
  page,
  isActive,
  onClick,
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`sf-text-button-card flex items-center justify-center tabular-nums transition-all duration-300 active:scale-95 ${
        isActive
          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-950"
      }`}
      style={{
        width: "var(--sf-h-button-card)",
        height: "var(--sf-h-button-card)",
        borderRadius: "var(--sf-radius-card-nested-compact)",
        transitionTimingFunction: "var(--sf-ease)",
      }}
    >
      {page}
    </button>
  );
}

function PageArrowButton({
  icon: Icon,
  disabled,
  onClick,
  ariaLabel,
}: {
  icon: typeof ChevronLeft;
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center justify-center text-stone-500 transition-all duration-300 active:scale-95 hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-40"
      style={{
        width: "var(--sf-h-button-card)",
        height: "var(--sf-h-button-card)",
        borderRadius: "var(--sf-radius-card-nested-compact)",
        transitionTimingFunction: "var(--sf-ease)",
      }}
    >
      <Icon
        aria-hidden="true"
        style={{
          width: "var(--sf-size-inner-icon-card)",
          height: "var(--sf-size-inner-icon-card)",
        }}
        strokeWidth={2.5}
      />
    </button>
  );
}
