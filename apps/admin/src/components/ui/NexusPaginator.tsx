import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NexusButton } from './NexusButton';

interface NexusPaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * NexusPaginator: Componente de paginación unificado.
 * Homogeniza el comportamiento entre Store y Orders con Geometría Recursiva.
 */
export const NexusPaginator: React.FC<NexusPaginatorProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 bg-bg-card/80 backdrop-blur-xl p-2 rounded-[2rem] border border-border-main shadow-xl shadow-stone-200/40">
        <NexusButton
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          icon={ChevronLeft}
        />
        
        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-10 h-10 flex items-center justify-center rounded-2xl text-[10px] font-black transition-all duration-300 active:scale-90 ${
                currentPage === pageNum
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-110 z-10'
                  : 'text-stone-400 hover:bg-bg-muted hover:text-text-main'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <NexusButton
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          icon={ChevronRight}
        />
      </div>
    </div>
  );
};
