import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, CheckCircle2, XCircle, 
  Clock, Phone, User, MapPin, MoreVertical,
  Loader2, Trash2, Check, X
} from 'lucide-react';
import { Raffle, TicketSale } from '../../types';
import { apiRaffles } from '../../api';

interface TicketGridProps {
  raffle: Raffle;
  tickets: TicketSale[];
  isLoading: boolean;
  onUpdate: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

export const TicketGrid: React.FC<TicketGridProps> = ({ 
  raffle, 
  tickets, 
  isLoading, 
  onUpdate,
  showToast,
  setConfirmDialog
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'CANCELLED'>('ALL');

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = t.ticketNumber.includes(search) || 
                           t.customerName.toLowerCase().includes(search.toLowerCase()) ||
                           t.customerPhone.includes(search);
      const matchesStatus = statusFilter === 'ALL' || t.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const handleUpdateStatus = async (id: string, status: 'PENDING' | 'PAID' | 'CANCELLED') => {
    try {
      await apiRaffles.updateTicketStatus(id, status);
      showToast('Estado del boleto actualizado');
      onUpdate();
    } catch (error) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const confirmCancel = (ticket: TicketSale) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Liberar boleto?',
      message: `El número ${ticket.ticketNumber} volverá a estar disponible para venta.`,
      confirmLabel: 'Sí, Liberar',
      variant: 'danger',
      onConfirm: async () => {
        await handleUpdateStatus(ticket.id, 'CANCELLED');
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const confirmPaid = (ticket: TicketSale) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Confirmar Pago?',
      message: `Marcar el boleto ${ticket.ticketNumber} como pagado.`,
      confirmLabel: 'Confirmar Pago',
      variant: 'warning',
      onConfirm: async () => {
        await handleUpdateStatus(ticket.id, 'PAID');
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      
      {/* Toolbar */}
      <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-stone-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar boleto, nombre, tel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white pl-12 pr-4 h-12 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 text-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
           {(['ALL', 'PENDING', 'PAID', 'CANCELLED'] as const).map(f => (
             <button
               key={f}
               onClick={() => setStatusFilter(f)}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === f ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'}`}
             >
               {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Apartados' : f === 'PAID' ? 'Pagados' : 'Cancelados'}
             </button>
           ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto max-h-[700px]">
        {isLoading ? (
           <div className="h-full flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
              <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Consultando base de datos...</p>
           </div>
        ) : filteredTickets.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-300">
                 <Filter size={32} />
              </div>
              <div>
                 <h4 className="text-lg font-black text-stone-800 tracking-tight">Sin registros</h4>
                 <p className="text-stone-400 text-sm font-medium">No se encontraron boletos con estos criterios.</p>
              </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col gap-4 group ${
                  ticket.paymentStatus === 'PAID' ? 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50' :
                  ticket.paymentStatus === 'PENDING' ? 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/50' :
                  'bg-stone-50/50 border-stone-100 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                         ticket.paymentStatus === 'PAID' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                         ticket.paymentStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                         'bg-stone-200 text-stone-500'
                      }`}>
                         {ticket.ticketNumber}
                      </div>
                      <div>
                         <p className="text-xs font-black text-stone-800 uppercase tracking-tight truncate max-w-[150px]">
                           {ticket.customerName}
                         </p>
                         <p className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
                           <Phone size={10} /> {ticket.customerPhone}
                         </p>
                      </div>
                   </div>
                   
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {ticket.paymentStatus === 'PENDING' && (
                         <button 
                           onClick={() => confirmPaid(ticket)}
                           className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-all active:scale-90 shadow-md shadow-emerald-500/10"
                           title="Confirmar Pago"
                         >
                           <Check size={14} />
                         </button>
                      )}
                      {ticket.paymentStatus !== 'CANCELLED' && (
                         <button 
                           onClick={() => confirmCancel(ticket)}
                           className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center hover:bg-rose-600 transition-all active:scale-90 shadow-md shadow-rose-500/10"
                           title="Liberar Boleto"
                         >
                           <Trash2 size={14} />
                         </button>
                      )}
                   </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5 mt-auto">
                   <div className="flex items-center gap-2">
                      <MapPin size={10} className="text-stone-400" />
                      <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">{ticket.customerState || 'Sin Estado'}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      {ticket.paymentStatus === 'PAID' ? (
                         <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : ticket.paymentStatus === 'PENDING' ? (
                         <Clock size={12} className="text-amber-500" />
                      ) : (
                         <XCircle size={12} className="text-stone-400" />
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                         ticket.paymentStatus === 'PAID' ? 'text-emerald-600' :
                         ticket.paymentStatus === 'PENDING' ? 'text-amber-600' :
                         'text-stone-500'
                      }`}>
                         {ticket.paymentStatus === 'PAID' ? 'Pagado' : 
                          ticket.paymentStatus === 'PENDING' ? 'Apartado' : 'Cancelado'}
                      </span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
