import { useState, useMemo } from 'react';
import { Raffle } from '../../types';
import { cn } from '../../utils/cn';
import { User, Phone, MapPin, CheckCircle2, Loader2, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatPrice } from '../../utils/formatters';

interface TicketSelectionGridProps {
  raffle: Raffle;
  occupiedTickets: string[];
  onReserve: (data: { 
    tickets: string[]; 
    customerName: string; 
    customerPhone: string; 
    customerState?: string; 
  }) => Promise<void>;
  isReserving: boolean;
}

export function TicketSelectionGrid({ raffle, occupiedTickets, onReserve, isReserving }: TicketSelectionGridProps) {
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [search, setSearch] = useState('');

  // Generate all ticket numbers
  const allTickets = useMemo(() => {
    const tickets = [];
    const start = raffle.useZero ? 0 : 1;
    const end = raffle.useZero ? raffle.ticketQuantity - 1 : raffle.ticketQuantity;
    
    for (let i = start; i <= end; i++) {
      tickets.push(i.toString().padStart(raffle.digits, '0'));
    }
    return tickets;
  }, [raffle]);

  const toggleTicket = (number: string) => {
    if (occupiedTickets.includes(number)) return;
    
    setSelectedTickets(prev => 
      prev.includes(number) 
        ? prev.filter(t => t !== number) 
        : [...prev, number]
    );
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTickets.length === 0 || !customerName || !customerPhone) return;
    
    await onReserve({
      tickets: selectedTickets,
      customerName,
      customerPhone,
      customerState
    });
  };

  const filteredTickets = allTickets.filter(t => t.includes(search));

  const totalAmount = selectedTickets.length * Number(raffle.ticketPrice);

  return (
    <div className="space-y-12">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Selection Area */}
        <div className="flex-1 space-y-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h4 className="text-xl font-black text-stone-800 uppercase tracking-tight lora">
              Elige tus números <span className="text-stone-400">({selectedTickets.length} seleccionados)</span>
            </h4>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-stone-50 pl-12 pr-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[500px] overflow-y-auto p-4 no-scrollbar border border-stone-100 rounded-[2.5rem] bg-stone-50/30">
            {filteredTickets.map(number => {
              const isOccupied = occupiedTickets.includes(number);
              const isSelected = selectedTickets.includes(number);
              
              return (
                <button
                  key={number}
                  disabled={isOccupied}
                  onClick={() => toggleTicket(number)}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center font-black text-xs sm:text-sm transition-all active:scale-90",
                    isOccupied 
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed opacity-50"
                      : isSelected
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-105"
                        : "bg-white text-stone-600 border border-stone-200 hover:border-brand-500 hover:text-brand-500"
                  )}
                >
                  {number}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-stone-200" /> Disponible
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-500" /> Seleccionado
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-stone-200" /> Ocupado
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="w-full xl:w-96 sticky top-24">
          <form onSubmit={handleReserve} className="bg-stone-900 text-white p-8 sm:p-10 rounded-[3rem] shadow-2xl space-y-8">
            <div className="space-y-4">
               <h5 className="text-2xl font-black italic lora tracking-tight">Apartar Boletos</h5>
               <p className="text-stone-400 text-sm font-medium leading-relaxed">Completa tus datos para que podamos contactarte y confirmar tu pago.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-4">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-600" size={18} />
                  <input 
                    required
                    type="text"
                    placeholder="Tu nombre"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-stone-800 pl-14 pr-6 py-5 rounded-2xl border border-stone-700 focus:outline-none focus:border-brand-500 transition-all text-sm font-bold placeholder:text-stone-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-4">WhatsApp / Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-600" size={18} />
                  <input 
                    required
                    type="tel"
                    placeholder="10 dígitos"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-stone-800 pl-14 pr-6 py-5 rounded-2xl border border-stone-700 focus:outline-none focus:border-brand-500 transition-all text-sm font-bold placeholder:text-stone-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-4">Estado</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-600" size={18} />
                  <input 
                    type="text"
                    placeholder="Ej. Jalisco"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    className="w-full bg-stone-800 pl-14 pr-6 py-5 rounded-2xl border border-stone-700 focus:outline-none focus:border-brand-500 transition-all text-sm font-bold placeholder:text-stone-600"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-800 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-stone-400 text-sm font-bold uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black text-brand-500">${formatPrice(totalAmount)}</span>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-18 text-lg rounded-2xl" 
                disabled={selectedTickets.length === 0 || !customerName || !customerPhone || isReserving}
              >
                {isReserving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>Reservar Ahora <CheckCircle2 className="ml-2" size={20} /></>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
