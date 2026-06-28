import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NexusButton } from './NexusButton';

interface NexusPaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const getPageWindow = (currentPage: number, totalPages: number, windowSize: number) => {
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
};

/**
 * NexusPaginator: paginación compacta y tokenizada.
 * Móvil muestra 3 páginas; escritorio muestra 5 páginas.
 */
export const NexusPaginator: React.FC<NexusPaginatorProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const mobilePages = useMemo(
    () => getPageWindow(currentPage, totalPages, 3),
    [currentPage, totalPages],
  );
  const desktopPages = useMemo(
    () => getPageWindow(currentPage, totalPages, 5),
    [currentPage, totalPages],
  );

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    if (nextPage !== currentPage) onPageChange(nextPage);
  };

  return (
    <div
      className="flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ paddingTop: 'var(--space-lg)' }}
    >
      <nav
        className="flex items-center border border-border-main bg-bg-card/80 shadow-xl shadow-stone-200/40 backdrop-blur-xl"
        aria-label="Paginación"
        style={{
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm)',
          borderRadius: 'var(--radius-card-rail-inner)',
        }}
      >
        <NexusButton
          variant="ghost"
          context="autonomous"
          density="compact"
          size="icon"
          isIconOnly
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          icon={ChevronLeft}
          aria-label="Página anterior"
        />

        <div className="flex items-center md:hidden" style={{ gap: 'var(--space-xs)' }}>
          {mobilePages.map((pageNum) => (
            <PageNumberButton
              key={pageNum}
              page={pageNum}
              isActive={currentPage === pageNum}
              onClick={() => goToPage(pageNum)}
            />
          ))}
        </div>

        <div className="hidden items-center md:flex" style={{ gap: 'var(--space-xs)' }}>
          {desktopPages.map((pageNum) => (
            <PageNumberButton
              key={pageNum}
              page={pageNum}
              isActive={currentPage === pageNum}
              onClick={() => goToPage(pageNum)}
            />
          ))}
        </div>

        <NexusButton
          variant="ghost"
          context="autonomous"
          density="compact"
          size="icon"
          isIconOnly
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          icon={ChevronRight}
          aria-label="Página siguiente"
        />
      </nav>
    </div>
  );
};

interface PageNumberButtonProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
}

function PageNumberButton({ page, isActive, onClick }: PageNumberButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center justify-center text-button-card font-black tabular-nums transition-all duration-300 active:scale-95 ${
        isActive
          ? 'z-10 bg-brand-500 text-white shadow-lg shadow-brand-500/20'
          : 'text-text-muted hover:bg-bg-muted hover:text-text-main'
      }`}
      style={{
        width: 'var(--size-button-card)',
        height: 'var(--size-button-card)',
        borderRadius: 'var(--radius-card-nested-compact)',
        transitionTimingFunction: 'var(--ease-emil)',
      }}
    >
      {page}
    </button>
  );
}
