"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { raffleApi } from '../../../api/raffles';
import { Raffle } from '../../../types';
import { Spinner } from '../../../components/ui/Spinner';
import { ArrowLeft, Ticket, Calendar, Info, CheckCircle2 } from 'lucide-react';
import { TicketSelectionGrid } from '../../../components/raffle/TicketSelectionGrid';
import { formatPrice } from '../../../utils/formatters';

interface RaffleDetailsClientProps {
  raffle: Raffle;
  initialOccupiedTickets: string[];
}

export function RaffleDetailsClient({ raffle, initialOccupiedTickets }: RaffleDetailsClientProps) {
  const router = useRouter();
  const [occupiedTickets, setOccupiedTickets] = useState<string[]>(initialOccupiedTickets);
  const [isReserving, setIsReserving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReserve = async (data: { 
    tickets: string[]; 
    customerName: string; 
    customerPhone: string; 
    customerState?: string; 
  }) => {
    setIsReserving(true);
    try {
      await raffleApi.reserveTickets(raffle.id, data);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      alert('Error al reservar boletos. Por favor intenta de nuevo.');
    } finally {
      setIsReserving(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-brand-500/10">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-stone-800 uppercase italic lora">¡Reserva Exitosa!</h2>
          <p className="text-stone-500 text-lg font-medium leading-relaxed">
            Tus boletos han sido apartados. En breve nos pondremos en contacto contigo vía WhatsApp para confirmar tu pago y enviarte tu comprobante.
          </p>
        </div>
        <button 
          onClick={() => router.push('/raffles')}
          className="bg-stone-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl hover:bg-stone-800 transition-all active:scale-95"
        >
          Volver a Sorteos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 animate-in fade-in duration-500">
      <button 
        onClick={() => router.push('/raffles')}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors font-bold uppercase tracking-widest text-[10px]"
      >
        <ArrowLeft size={14} /> Volver a Sorteos
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Raffle Image & Basic Info */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="aspect-[4/5] bg-stone-100 rounded-[3rem] overflow-hidden shadow-2xl border border-stone-200">
            {raffle.image ? (
              <img src={raffle.image} className="w-full h-full object-cover" alt={raffle.title} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                <Ticket size={80} />
              </div>
            )}
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-xl space-y-4">
            <h2 className="text-2xl font-black text-stone-800 uppercase italic lora">{raffle.title}</h2>
            <div className="flex items-center justify-between py-4 border-t border-stone-50">
               <span className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Costo por Boleto</span>
               <span className="text-2xl font-black text-brand-600">${formatPrice(raffle.ticketPrice)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Selection Area */}
        <div className="flex-1 space-y-8">
          <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-stone-100 shadow-xl space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-stone-800 tracking-tight uppercase italic lora">Selecciona tus boletos</h3>
              <p className="text-stone-500 font-medium leading-relaxed">{raffle.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center gap-4 bg-stone-50 p-6 rounded-3xl border border-stone-100">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-500 shadow-sm">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Fecha del Sorteo</p>
                    <p className="font-black text-stone-800" suppressHydrationWarning>{raffle.drawDate ? new Date(raffle.drawDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Por definir'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 bg-stone-50 p-6 rounded-3xl border border-stone-100">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-stone-500 shadow-sm">
                    <Info size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Oportunidades</p>
                    <p className="font-black text-stone-800">{raffle.opportunities} por boleto</p>
                  </div>
               </div>
            </div>

            <TicketSelectionGrid 
              raffle={raffle}
              occupiedTickets={occupiedTickets}
              onReserve={handleReserve}
              isReserving={isReserving}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
