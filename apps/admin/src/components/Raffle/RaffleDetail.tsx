import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Ticket, Settings, 
  Users, DollarSign, Calendar, Hash,
  ChevronRight, Layout, RefreshCw, Loader2
} from 'lucide-react';
import { Raffle, TicketSale } from '../../types';
import { apiRaffles } from '../../api';
import { TicketGrid } from './TicketGrid';
import { RaffleForm } from './RaffleForm';

interface RaffleDetailProps {
  raffle: Raffle;
  onBack: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onUpdate: () => void;
}

export const RaffleDetail: React.FC<RaffleDetailProps> = ({ 
  raffle, 
  onBack, 
  showToast, 
  setConfirmDialog,
  onUpdate 
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'settings'>('tickets');
  const [tickets, setTickets] = useState<TicketSale[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isSettingsFormValid, setIsSettingsFormValid] = useState(false);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const data = await apiRaffles.getTickets(raffle.id);
      setTickets(data);
    } catch (error) {
      showToast('Error al cargar boletos', 'error');
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab, raffle.id]);

  const stats = {
    total: raffle.ticketQuantity,
    sold: tickets.filter(t => t.paymentStatus === 'PAID').length,
    reserved: tickets.filter(t => t.paymentStatus === 'PENDING').length,
    available: raffle.ticketQuantity - tickets.filter(t => t.paymentStatus !== 'CANCELLED').length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-12 h-12 bg-stone-50 hover:bg-stone-100 text-stone-400 hover:text-stone-600 rounded-2xl flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-black text-stone-800 tracking-tight uppercase italic lora">{raffle.title}</h2>
               <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-wider border border-brand-100">
                 {raffle.status}
               </span>
            </div>
            <p className="text-stone-400 text-sm font-medium flex items-center gap-2">
              ID: {raffle.id} <span className="opacity-30">|</span> 
              Creada el {new Date(raffle.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-stone-50 p-2 rounded-2xl border border-stone-100">
           <button 
             onClick={() => setActiveTab('tickets')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'tickets' ? 'bg-white text-brand-600 shadow-sm shadow-brand-500/5' : 'text-stone-400 hover:text-stone-600'}`}
           >
             <Ticket size={14} /> Boletos
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-brand-600 shadow-sm shadow-brand-500/5' : 'text-stone-400 hover:text-stone-600'}`}
           >
             <Settings size={14} /> Ajustes
           </button>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Total</span>
                <p className="text-2xl font-black text-stone-800">{stats.total}</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Pagados</span>
                <p className="text-2xl font-black text-emerald-600">{stats.sold}</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Apartados</span>
                <p className="text-2xl font-black text-amber-600">{stats.reserved}</p>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-1">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Libres</span>
                <p className="text-2xl font-black text-stone-700">{stats.available}</p>
             </div>
          </div>

          <TicketGrid 
            raffle={raffle}
            tickets={tickets}
            isLoading={isLoadingTickets}
            onUpdate={loadTickets}
            showToast={showToast}
            setConfirmDialog={setConfirmDialog}
          />
        </div>
      ) : (
        <div className="space-y-8">
           <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                 <Settings className="text-brand-500" size={24} /> Configuración de la Rifa
              </h3>
              <button 
                type="submit" 
                form="raffle-form"
                disabled={!isSettingsFormValid}
                className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <RefreshCw size={16} /> Guardar Cambios
              </button>
           </div>
           
           <RaffleForm 
             initialData={raffle}
             onCancel={() => setActiveTab('tickets')}
             onSave={() => {
                onUpdate();
                setActiveTab('tickets');
             }}
             showToast={showToast}
             onValidationChange={setIsSettingsFormValid}
           />
        </div>
      )}
    </div>
  );
};
