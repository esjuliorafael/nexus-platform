import React, { useMemo, useState, useRef } from 'react';
import { 
  Ticket, Eye, Edit3, Trash2, 
  Users, CheckCircle2, Clock, AlertCircle,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Raffle } from '../../types';
import { NexusCardButton } from '../ui/NexusButton';

interface RaffleListProps {
  raffles: Raffle[];
  searchQuery: string;
  onEdit: (raffle: Raffle) => void;
  onDelete: (id: string) => void;
  onViewDetail: (raffle: Raffle) => void;
}

const ITEMS_PER_PAGE = 8;

/**
 * RaffleCard: Componente refinado con micro-interacciones.
 */
const RaffleCard: React.FC<{
  raffle: Raffle;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  animationDelay?: string;
}> = ({ raffle, onEdit, onDelete, onViewDetail, animationDelay }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [activeSide, setActiveSide] = useState<'none' | 'left' | 'right'>('none');
  
  const touchStart = useRef(0);
  const touchX = useRef(0);
  
  const SWIPE_THRESHOLD = 80;
  const ACTION_WIDTH = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchX.current = touchStart.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart.current;
    
    let finalTranslate = diff;
    if (activeSide === 'left') finalTranslate = ACTION_WIDTH + diff;
    if (activeSide === 'right') finalTranslate = -ACTION_WIDTH + diff;

    setTranslateX(finalTranslate);
    touchX.current = currentX;
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    const diff = touchX.current - touchStart.current;
    
    if (diff > SWIPE_THRESHOLD && activeSide !== 'right') {
      setTranslateX(ACTION_WIDTH);
      setActiveSide('left');
    } else if (diff < -SWIPE_THRESHOLD && activeSide !== 'left') {
      setTranslateX(-ACTION_WIDTH);
      setActiveSide('right');
    } else {
      setTranslateX(0);
      setActiveSide('none');
    }
  };

  const resetSwipe = () => {
    setTranslateX(0);
    setActiveSide('none');
  };

  const getStatusBadge = (status: Raffle['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm dark:shadow-none backdrop-blur-md">
            <CheckCircle2 size={12} /> Activa
          </span>
        );
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-text-muted text-[9px] font-black uppercase tracking-widest border border-border-main shadow-sm dark:shadow-none">
            <Clock size={12} /> Finalizada
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-widest border border-rose-100 shadow-sm dark:shadow-none">
            <AlertCircle size={12} /> Cancelada
          </span>
        );
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-[2.5rem] bg-bg-card border border-border-main hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 animate-card-enter"
      style={{ animationDelay }}
    >
      {/* Mobile Actions (Swipe) */}
      <div className="absolute inset-0 flex sm:hidden">
        <button 
          onClick={() => { onEdit(); resetSwipe(); }}
          className={`absolute inset-y-0 left-0 w-[100px] bg-brand-500 text-white flex flex-col items-center justify-center gap-1 transition-opacity ${translateX > 0 ? 'opacity-100' : 'opacity-0'}`}
        >
          <Edit3 size={20} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
        </button>
        <button 
          onClick={() => { onDelete(); resetSwipe(); }}
          className={`absolute inset-y-0 right-0 w-[100px] bg-rose-500 text-white flex flex-col items-center justify-center gap-1 transition-opacity ${translateX < 0 ? 'opacity-100' : 'opacity-0'}`}
        >
          <Trash2 size={20} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">Eliminar</span>
        </button>
      </div>

      {/* Card Content */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.4s var(--ease-emil)'
        }}
        className="relative z-10 bg-bg-card group flex flex-col h-full"
      >
        <div className="aspect-video relative overflow-hidden bg-stone-100 border-b border-border-main">
          {raffle.image ? (
            <img 
              src={raffle.image} 
              alt={raffle.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <Ticket size={48} strokeWidth={1} />
            </div>
          )}
          <div className="absolute top-4 left-4">
            {getStatusBadge(raffle.status)}
          </div>
          <div className="absolute inset-0 bg-black/5" />
        </div>

        <div className="p-6 flex flex-col flex-1">
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-black text-text-main tracking-tight leading-tight line-clamp-1 group-hover:text-brand-600 transition-colors">
                {raffle.title}
              </h3>
              <p className="text-[11px] text-stone-400 font-bold uppercase tracking-widest mt-1">ID: #{String(raffle.id).split('-')[0]}</p>
            </div>
            
            <p className="text-xs text-text-muted line-clamp-2 font-medium leading-relaxed">
              {raffle.description || 'Sin descripción detallada para esta rifa.'}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-border-main">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                  <Ticket size={10} className="text-brand-500" /> Ticket
                </span>
                <p className="font-black text-text-main tracking-tight">${raffle.ticketPrice.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                  <Users size={10} className="text-brand-500" /> Cantidad
                </span>
                <p className="font-black text-text-main tracking-tight">{raffle.ticketQuantity}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-6">
            <NexusCardButton 
              onClick={onViewDetail}
              className="flex-1"
              icon={Eye}
            >
              Detalles
            </NexusCardButton>
            
            <div className="hidden sm:flex items-center gap-2">
              <NexusCardButton 
                variant="ghost" 
                size="icon"
                onClick={onEdit}
                icon={Edit3}
                className="bg-bg-muted hover:bg-brand-50 hover:text-brand-600"
              />
              <NexusCardButton 
                variant="ghost" 
                size="icon"
                onClick={onDelete}
                icon={Trash2}
                className="bg-bg-muted hover:bg-rose-50 hover:text-rose-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RaffleList: React.FC<RaffleListProps> = ({ 
  raffles, 
  searchQuery, 
  onEdit, 
  onDelete, 
  onViewDetail 
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const filtered = useMemo(() => {
    return raffles.filter(r => 
      (r.title || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    ).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [raffles, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (num: number) => {
    setCurrentPage(num);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (filtered.length === 0 && searchQuery) {
    return (
      <div className="py-24 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-stone-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-stone-300 shadow-inner">
          <Search size={48} />
        </div>
        <h3 className="text-2xl font-black text-text-main tracking-tight mb-2">Sin resultados</h3>
        <p className="text-text-muted font-medium max-w-xs mx-auto">No encontramos rifas que coincidan con tu búsqueda actual.</p>
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="py-24 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-stone-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-stone-300 shadow-inner">
          <Ticket size={48} />
        </div>
        <h3 className="text-2xl font-black text-text-main tracking-tight mb-2">No hay rifas registradas</h3>
        <p className="text-text-muted font-medium max-w-xs mx-auto">Comienza creando tu primera rifa para empezar a vender oportunidades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {paginated.map((raffle, idx) => (
          <RaffleCard 
            key={raffle.id}
            raffle={raffle}
            onEdit={() => onEdit(raffle)}
            onDelete={() => onDelete(raffle.id)}
            onViewDetail={() => onViewDetail(raffle)}
            animationDelay={`${idx * 80}ms`}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 bg-bg-card/80 backdrop-blur-xl p-2 rounded-[2rem] border border-white/60 shadow-xl shadow-stone-200/40">
            <NexusCardButton
              variant="ghost"
              size="icon"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              icon={ChevronLeft}
            />
            
            <div className="flex items-center gap-1.5 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-2xl text-[10px] font-black transition-all duration-300 active:scale-75 ${
                    currentPage === pageNum
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-110 z-10'
                      : 'text-stone-400 hover:bg-bg-muted hover:text-text-main'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <NexusCardButton
              variant="ghost"
              size="icon"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              icon={ChevronRight}
            />
          </div>
        </div>
      )}
    </div>
  );
};
