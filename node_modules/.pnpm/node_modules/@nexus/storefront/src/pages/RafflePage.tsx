import { useEffect, useState } from 'react';
import { raffleApi } from '../api/raffles';
import { Raffle } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { Ticket, Calendar, Users, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export function RafflePage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    raffleApi.getAll()
      .then(data => {
        setRaffles(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (import.meta.env.VITE_RAFFLE_ENABLED !== 'true') {
    return <div className="h-[60vh] flex items-center justify-center font-bold text-stone-400 uppercase tracking-widest">Módulo de rifas inactivo</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-5xl font-black text-stone-800 tracking-tight uppercase italic lora">Sorteos y Rifas</h1>
        <p className="text-stone-500 font-medium text-lg">Participa y gana ejemplares de élite. Selecciona una rifa activa para ver detalles y comprar boletos.</p>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center"><Spinner className="w-12 h-12" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {raffles.map(raffle => (
            <div key={raffle.id} className="group flex flex-col md:flex-row bg-white rounded-[3rem] border border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden hover:border-brand-500/50 transition-all">
              <div className="w-full md:w-2/5 aspect-[4/5] bg-stone-100 relative">
                {raffle.image && <img src={raffle.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={raffle.title} />}
                <div className="absolute top-6 left-6">
                  <div className="bg-brand-500 text-white px-4 py-2 rounded-2xl font-black text-sm shadow-xl">ACTIVA</div>
                </div>
              </div>
              
              <div className="flex-1 p-8 md:p-10 flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                   <h3 className="text-3xl font-black text-stone-800 leading-tight uppercase italic lora">{raffle.title}</h3>
                   <p className="text-stone-500 line-clamp-3 leading-relaxed">{raffle.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-stone-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Boleto</p>
                      <p className="font-black text-stone-800">${Number(raffle.ticketPrice).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-500">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Sorteo</p>
                      <p className="font-black text-stone-800">{raffle.drawDate ? new Date(raffle.drawDate).toLocaleDateString() : 'Por definir'}</p>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full h-16 text-lg rounded-2xl" asChild>
                  <Link to={`/raffles/${raffle.id}`}>
                    Comprar Boletos <ArrowRight className="ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
