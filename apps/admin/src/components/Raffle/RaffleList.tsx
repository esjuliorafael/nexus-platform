import React, { useMemo } from 'react';
import { 
  Ticket, Eye, Edit3, Trash2, Calendar, 
  Users, CheckCircle2, Clock, AlertCircle,
  Search, ChevronLeft, ChevronRight, PlusCircle
} from 'lucide-react';
import { Raffle } from '../../types';

interface RaffleListProps {
  raffles: Raffle[];
  searchQuery: string;
  onEdit: (raffle: Raffle) => void;
  onDelete: (id: string) => void;
  onViewDetail: (raffle: Raffle) => void;
}

const ITEMS_PER_PAGE = 8;

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
      r.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [raffles, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const getStatusBadge = (status: Raffle['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
            <CheckCircle2 size={12} /> Activa
          </span>
        );
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-[10px] font-black uppercase tracking-wider border border-stone-200">
            <Clock size={12} /> Finalizada
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-wider border border-rose-100">
            <AlertCircle size={12} /> Cancelada
          </span>
        );
    }
  };

  if (filtered.length === 0 && searchQuery) {
    return (
      <div className="py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
          <Search size={40} />
        </div>
        <h3 className="text-xl font-black text-stone-800 tracking-tight">Sin resultados</h3>
        <p className="text-stone-500 font-medium">No encontramos rifas que coincidan con "{searchQuery}"</p>
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <div className="py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
          <Ticket size={40} />
        </div>
        <h3 className="text-xl font-black text-stone-800 tracking-tight">No hay rifas activas</h3>
        <p className="text-stone-500 font-medium mb-8">Comienza creando tu primera rifa de aves o artículos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginated.map((raffle, idx) => (
          <div 
            key={raffle.id}
            className="group bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/5 transition-all flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="aspect-video relative overflow-hidden bg-stone-100">
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
            </div>

            <div className="p-6 flex flex-col flex-1 space-y-6">
              <div>
                <h3 className="text-xl font-black text-stone-800 leading-tight mb-2 line-clamp-1">
                  {raffle.title}
                </h3>
                <p className="text-sm text-stone-500 line-clamp-2 font-medium leading-relaxed">
                  {raffle.description || 'Sin descripción.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-stone-50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                    <Ticket size={12} className="text-brand-500" /> Precio Boleto
                  </span>
                  <p className="font-black text-stone-800">${raffle.ticketPrice.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-1.5">
                    <Users size={12} className="text-brand-500" /> Boletos
                  </span>
                  <p className="font-black text-stone-800">{raffle.ticketQuantity}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button 
                  onClick={() => onViewDetail(raffle)}
                  className="flex-1 bg-stone-900 hover:bg-stone-800 text-white h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> Ver Detalles
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onEdit(raffle)}
                    className="w-12 h-12 bg-white border border-stone-200 text-stone-600 rounded-2xl flex items-center justify-center hover:bg-stone-50 hover:text-brand-600 transition-all active:scale-95"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => onDelete(raffle.id)}
                    className="w-12 h-12 bg-white border border-stone-200 text-stone-400 rounded-2xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center pt-8">
          <div className="flex items-center gap-2 bg-white p-2 rounded-full border border-stone-200 shadow-sm">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-full hover:bg-stone-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-sm font-black text-stone-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full hover:bg-stone-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
