import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NexusButton } from './NexusButton';

interface NexusPaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  context?: 'autonomous' | 'section';
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
export const NexusPaginator = ({
  currentPage,
  totalPages,
  onPageChange,
  context = 'autonomous',
}: NexusPaginatorProps) => {
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
      className={`flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        context === 'section' ? 'border-t border-border-main' : ''
      }`}
      style={{
        marginTop: context === 'section' ? 'var(--space-lg)' : undefined,
        paddingTop: context === 'section' ? 'var(--space-md)' : 'var(--space-lg)',
      }}
    >
      <nav
        className={`flex items-center ${
          context === 'autonomous'
            ? 'border border-border-main bg-bg-card/80 shadow-xl shadow-stone-200/40 backdrop-blur-xl'
            : ''
        }`}
        aria-label="Paginación"
        style={{
          gap: 'var(--space-sm)',
          padding: context === 'autonomous' ? 'var(--space-sm)' : undefined,
          borderRadius:
            context === 'autonomous' ? 'var(--radius-card-rail-inner)' : undefined,
        }}
      >
        <NexusButton
          variant="ghost"
          context={context}
          density={context === 'autonomous' ? 'compact' : 'default'}
          size="icon"
          isIconOnly
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          icon={ChevronLeft}
          aria-label="Página anterior"
        />

        <div className="flex items-center md:hidden" style={{ gap: 'var(--space-sm)' }}>
          {mobilePages.map((pageNum) => (
            <PageNumberButton
              key={pageNum}
              page={pageNum}
              isActive={currentPage === pageNum}
              onClick={() => goToPage(pageNum)}
              context={context}
            />
          ))}
        </div>

        <div className="hidden items-center md:flex" style={{ gap: 'var(--space-sm)' }}>
          {desktopPages.map((pageNum) => (
            <PageNumberButton
              key={pageNum}
              page={pageNum}
              isActive={currentPage === pageNum}
              onClick={() => goToPage(pageNum)}
              context={context}
            />
          ))}
        </div>

        <NexusButton
          variant="ghost"
          context={context}
          density={context === 'autonomous' ? 'compact' : 'default'}
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
  context: 'autonomous' | 'section';
}

function PageNumberButton({
  page,
  isActive,
  onClick,
  context,
}: PageNumberButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center justify-center font-black tabular-nums transition-all duration-300 active:scale-95 ${
        context === 'section' ? 'text-button-section' : 'text-button-card'
      } ${
        isActive
          ? 'z-10 bg-brand-500 text-white shadow-lg shadow-brand-500/20'
          : 'text-text-muted hover:bg-bg-muted hover:text-text-main'
      }`}
      style={{
        width:
          context === 'section'
            ? 'var(--size-button-section)'
            : 'var(--size-button-card)',
        height:
          context === 'section'
            ? 'var(--size-button-section)'
            : 'var(--size-button-card)',
        borderRadius:
          context === 'section'
            ? 'var(--radius-inner-visual)'
            : 'var(--radius-card-nested-compact)',
        transitionTimingFunction: 'var(--ease-emil)',
      }}
    >
      {page}
    </button>
  );
}
