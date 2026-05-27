import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Phone, Search, User, type LucideIcon } from 'lucide-react';
import { Raffle } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { StorefrontField } from '../ui/Field';
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

  const allTickets = useMemo(() => {
    const tickets: string[] = [];
    const start = raffle.useZero ? 0 : 1;
    const end = raffle.useZero ? raffle.ticketQuantity - 1 : raffle.ticketQuantity;

    for (let index = start; index <= end; index++) {
      tickets.push(index.toString().padStart(raffle.digits, '0'));
    }

    return tickets;
  }, [raffle]);

  const toggleTicket = (number: string) => {
    if (occupiedTickets.includes(number)) return;

    setSelectedTickets((current) =>
      current.includes(number)
        ? current.filter((ticket) => ticket !== number)
        : [...current, number]
    );
  };

  const handleReserve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedTickets.length === 0 || !customerName || !customerPhone) return;

    await onReserve({
      tickets: selectedTickets,
      customerName,
      customerPhone,
      customerState,
    });
  };

  const filteredTickets = allTickets.filter((ticket) => ticket.includes(search));
  const totalAmount = selectedTickets.length * Number(raffle.ticketPrice);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
      <div className="flex flex-col items-start xl:flex-row" style={{ gap: 'var(--sf-space-lg)' }}>
        <div className="w-full flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: 'var(--sf-space-md)' }}>
            <div>
              <h4 className="sf-text-h2 text-stone-850 uppercase italic">Elige tus numeros</h4>
              <p className="sf-text-label text-stone-400">{selectedTickets.length} seleccionados</p>
            </div>
            <div className="w-full sm:w-64">
              <StorefrontField
                icon={Search}
                type="text"
                placeholder="Buscar numero..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div
            className="mt-6 grid max-h-[500px] grid-cols-5 overflow-y-auto border border-stone-100 bg-stone-50/40 p-4 sm:grid-cols-8 md:grid-cols-10"
            style={{ borderRadius: 'var(--sf-radius-outer)', gap: 'var(--sf-space-sm)' }}
          >
            {filteredTickets.map((number) => {
              const isOccupied = occupiedTickets.includes(number);
              const isSelected = selectedTickets.includes(number);

              return (
                <button
                  key={number}
                  disabled={isOccupied}
                  onClick={() => toggleTicket(number)}
                  className={cn(
                    'aspect-square flex items-center justify-center text-xs font-black transition-all duration-300 active:scale-90 sm:text-sm',
                    isOccupied
                      ? 'cursor-not-allowed bg-stone-200 text-stone-400 opacity-50'
                      : isSelected
                        ? 'scale-105 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                        : 'border border-stone-200 bg-white text-stone-600 hover:border-brand-500 hover:text-brand-500'
                  )}
                  style={{ borderRadius: 'var(--sf-radius-nested)' }}
                >
                  {number}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap sf-text-label text-stone-400" style={{ gap: 'var(--sf-space-md)' }}>
            <LegendItem label="Disponible" className="bg-white border border-stone-200" />
            <LegendItem label="Seleccionado" className="bg-brand-500" />
            <LegendItem label="Ocupado" className="bg-stone-200" />
          </div>
        </div>

        <div className="w-full xl:w-96 xl:sticky xl:top-24">
          <form
            onSubmit={handleReserve}
            className="flex flex-col bg-stone-900 text-white shadow-2xl shadow-stone-900/25"
            style={{ borderRadius: 'var(--sf-radius-outer)', padding: 'var(--sf-padding-outer)', gap: 'var(--sf-space-lg)' }}
          >
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
              <h5 className="sf-text-h1 uppercase italic">Apartar Boletos</h5>
              <p className="sf-text-secondary text-stone-400">Completa tus datos para contactarte y confirmar tu pago.</p>
            </div>

            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <DarkField
                icon={User}
                label="Nombre Completo"
                required
                type="text"
                placeholder="Tu nombre"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <DarkField
                icon={Phone}
                label="WhatsApp / Telefono"
                required
                type="tel"
                placeholder="10 digitos"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
              <DarkField
                icon={MapPin}
                label="Estado"
                type="text"
                placeholder="Ej. Jalisco"
                value={customerState}
                onChange={(event) => setCustomerState(event.target.value)}
              />
            </div>

            <div className="flex flex-col border-t border-stone-800 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex items-center justify-between">
                <span className="sf-text-label text-stone-400">Total</span>
                <span className="sf-text-display text-brand-500">${formatPrice(totalAmount)}</span>
              </div>

              <Button
                type="submit"
                context="section"
                className="w-full"
                disabled={selectedTickets.length === 0 || !customerName || !customerPhone || isReserving}
              >
                {isReserving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Reservar Ahora
                    <CheckCircle2 className="ml-2" size={20} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center" style={{ gap: 'var(--sf-space-sm)' }}>
      <div className={cn('h-3 w-3 rounded-full', className)} />
      {label}
    </div>
  );
}

function DarkField({
  icon: Icon,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon; label: string }) {
  return (
    <label className="group flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      <span className="sf-text-label text-stone-500 group-focus-within:text-brand-500">{label}</span>
      <div className="relative flex h-[var(--sf-h-input)] items-center">
        <Icon className="absolute left-5 text-stone-600 group-focus-within:text-brand-500" size={18} />
        <input
          {...props}
          className="h-full w-full border border-stone-700 bg-stone-800 pl-14 pr-5 text-sm font-bold text-white transition-all placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          style={{ borderRadius: 'var(--sf-radius-card-inner)', transitionTimingFunction: 'var(--sf-ease)' }}
        />
      </div>
    </label>
  );
}
