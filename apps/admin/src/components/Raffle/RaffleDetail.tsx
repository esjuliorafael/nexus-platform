import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Ticket, Settings, 
  RefreshCw
} from 'lucide-react';
import { Raffle, TicketSale } from '../../types';
import { apiRaffles } from '../../api';
import { TicketGrid } from './TicketGrid';
import { RaffleForm } from './RaffleForm';
import { NexusButton, NexusSectionButton } from '../ui/NexusButton';

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
    sold: tickets.filter(t => t.status === 'PAID').length,
    reserved: tickets.filter(t => t.status === 'PENDING').length,
    available: raffle.ticketQuantity - tickets.filter(t => t.status !== 'CANCELLED').length
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'FINISHED': return 'bg-stone-100 text-text-muted border-border-main';
      case 'CANCELLED': return 'bg-rose-50 text-rose-500 border-rose-100';
      default: return 'bg-bg-muted text-stone-400 border-border-main';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-bg-card p-8 rounded-[2.5rem] border border-border-main shadow-sm dark:shadow-none">
        <div className="flex items-center gap-6">
          <NexusButton 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            icon={ArrowLeft}
            className="bg-bg-muted hover:bg-stone-100 text-stone-400 h-14 w-14 rounded-[1.5rem]"
          />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
               <h2 className="text-2xl font-black text-text-main tracking-tight uppercase italic">{raffle.title}</h2>
               <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(raffle.status)} shadow-sm dark:shadow-none`}>
                 {raffle.status}
               </span>
            </div>
            <p className="text-stone-400 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              ID: {raffle.id.split('-')[0]} <span className="w-1 h-1 bg-stone-200 rounded-full" /> 
              {new Date(raffle.createdAt).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-stone-100/50 p-2 rounded-[1.5rem] border border-border-main self-start lg:self-center">
           <button 
             onClick={() => setActiveTab('tickets')}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 active:scale-90 ${activeTab === 'tickets' ? 'bg-bg-card text-brand-600 shadow-md shadow-brand-500/5' : 'text-stone-400 hover:text-stone-600'}`}
             style={{ transitionTimingFunction: 'var(--ease-emil)' }}
           >
             <Ticket size={14} /> Boletos
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 active:scale-90 ${activeTab === 'settings' ? 'bg-bg-card text-brand-600 shadow-md shadow-brand-500/5' : 'text-stone-400 hover:text-stone-600'}`}
             style={{ transitionTimingFunction: 'var(--ease-emil)' }}
           >
             <Settings size={14} /> Ajustes
           </button>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <div className="space-y-10">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="bg-bg-card p-8 rounded-[2rem] border border-border-main shadow-sm dark:shadow-none space-y-2 group hover:border-brand-300 transition-colors">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest block">Total Universo</span>
                <p className="text-3xl font-black text-text-main tracking-tighter">{stats.total.toLocaleString()}</p>
             </div>
             <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100 shadow-sm dark:shadow-none space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block">Liquidados</span>
                <p className="text-3xl font-black text-emerald-700 tracking-tighter">{stats.sold.toLocaleString()}</p>
             </div>
             <div className="bg-amber-50/50 p-8 rounded-[2rem] border border-amber-100 shadow-sm dark:shadow-none space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest block">Apartados</span>
                <p className="text-3xl font-black text-amber-700 tracking-tighter">{stats.reserved.toLocaleString()}</p>
             </div>
             <div className="bg-bg-muted/50 p-8 rounded-[2rem] border border-border-main shadow-sm dark:shadow-none space-y-2">
                <span className="text-[10px] font-black uppercase text-text-muted tracking-widest block">Disponibles</span>
                <p className="text-3xl font-black text-stone-700 tracking-tighter">{stats.available.toLocaleString()}</p>
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shadow-sm dark:shadow-none">
                    <Settings size={20} />
                 </div>
                 <h3 className="text-xl font-black text-text-main tracking-tight">Configuración</h3>
              </div>
              <NexusSectionButton 
                type="submit" 
                form="raffle-form"
                disabled={!isSettingsFormValid}
                icon={RefreshCw}
              >
                Guardar Cambios
              </NexusSectionButton>
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
