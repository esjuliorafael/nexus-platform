"use client";

import { useEffect, useState } from 'react';
import { raffleApi } from '../../api/raffles';
import { Raffle } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Ticket, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import { formatPrice } from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { Badge } from '../../components/ui/Badge';
import { useSettings } from '../../hooks/useSettings';

export default function RafflesPage() {
  const { isModuleEnabled } = useSettings();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isRaffleEnabled = isModuleEnabled('raffle_enabled') || process.env.NEXT_PUBLIC_RAFFLE_ENABLED === 'true';

  useEffect(() => {
    if (isRaffleEnabled) {
      raffleApi.getAll()
        .then(data => {
          setRaffles(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error("Error loading raffles:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isRaffleEnabled]);

  if (!isRaffleEnabled) {
    return (
      <main className="pt-32 pb-20 px-6 min-h-[60vh] flex items-center justify-center">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
            <Ticket size={40} />
          </div>
          <h1 className="text-4xl font-display font-black text-stone-900 uppercase">Módulo Desactivado</h1>
          <p className="text-stone-500 max-w-md mx-auto">El módulo de rifas no está activo en este momento. Vuelve pronto para participar en nuestros próximos sorteos.</p>
          <Button asChild variant="outline" className="rounded-full px-8 border-stone-200">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 pt-32">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-[10px] font-black uppercase tracking-widest">
          <Sparkles size={12} /> Sorteos Exclusivos
        </div>
        <h1 className="text-5xl font-black text-stone-850 tracking-tight uppercase italic lora leading-none">Rifas Activas</h1>
        <p className="text-stone-500 font-semibold text-sm md:text-base leading-relaxed">
          Participa en nuestros sorteos especiales y gana ejemplares élite de registro con genética de campeonato mundial de Granja La Manzana.
        </p>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Spinner className="w-12 h-12" />
        </div>
      ) : raffles.length === 0 ? (
        <EmptyState 
          icon={Ticket} 
          title="Sin Sorteos Activos" 
          description="Actualmente no tenemos ninguna rifa de aves activa. Suscríbete a nuestros canales oficiales de WhatsApp para enterarte de futuros sorteos." 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {raffles.map((raffle, idx) => (
            <motion.div
              key={raffle.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className="group flex flex-col md:flex-row bg-white rounded-[2.5rem] border border-stone-200/60 shadow-sm hover:shadow-2xl hover:border-brand-500/20 transition-all duration-500 overflow-hidden"
            >
              {/* Cover Image */}
              <div className="w-full md:w-2/5 aspect-[4/5] md:aspect-auto md:h-full bg-stone-50 relative overflow-hidden select-none shrink-0">
                {raffle.image ? (
                  <img 
                    src={raffle.image} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                    alt={raffle.title} 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-100/50">
                    <Ticket size={48} strokeWidth={1} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Sin Imagen</span>
                  </div>
                )}
                <div className="absolute top-5 left-5">
                  <Badge className="bg-brand-500 text-white font-black text-[10px] px-3.5 py-1.5 rounded-full shadow-lg shadow-brand-500/20 uppercase tracking-widest border border-brand-400">
                    Activa
                  </Badge>
                </div>
              </div>
              
              {/* Content Info */}
              <div className="flex-1 p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-stone-850 tracking-tight leading-tight uppercase italic lora group-hover:text-brand-500 transition-colors">
                    {raffle.title}
                  </h3>
                  <p className="text-stone-500 text-xs font-semibold leading-relaxed line-clamp-3">
                    {raffle.description || "Participa en este gran sorteo adquiriendo boletos desde la plataforma de forma rápida y segura."}
                  </p>
                </div>

                {/* Draw stats grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Ticket size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Costo Boleto</p>
                      <p className="font-black text-stone-850 text-base">${formatPrice(raffle.ticketPrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-50 text-stone-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Fecha Sorteo</p>
                      <p className="font-black text-stone-850 text-xs leading-none">
                        {raffle.drawDate ? new Date(raffle.drawDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full h-14 rounded-2xl bg-stone-900 hover:bg-brand-500 text-white font-black text-sm shadow-xl hover:shadow-brand-500/20 transition-all duration-300" asChild>
                  <Link href={`/raffles/${raffle.id}`}>
                    Comprar Boletos <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
