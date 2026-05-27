"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CheckCircle2, Info, Ticket, type LucideIcon } from 'lucide-react';
import { raffleApi } from '../../../api/raffles';
import { Raffle } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { StorefrontCard } from '../../../components/ui/Card';
import { StorefrontIcon } from '../../../components/ui/Icon';
import { TicketSelectionGrid } from '../../../components/raffle/TicketSelectionGrid';
import { formatPrice } from '../../../utils/formatters';

interface RaffleDetailsClientProps {
  raffle: Raffle;
  initialOccupiedTickets: string[];
}

export function RaffleDetailsClient({ raffle, initialOccupiedTickets }: RaffleDetailsClientProps) {
  const router = useRouter();
  const [occupiedTickets] = useState<string[]>(initialOccupiedTickets);
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
      <div className="mx-auto max-w-3xl px-6 text-center animate-in zoom-in-95 duration-500" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
        <div className="flex flex-col items-center" style={{ gap: 'var(--sf-space-lg)' }}>
          <StorefrontIcon icon={CheckCircle2} context="section" variant="success" />
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
            <h2 className="sf-text-display text-stone-850 uppercase italic">Reserva Exitosa</h2>
            <p className="sf-text-body text-stone-500">
              Tus boletos han sido apartados. En breve nos pondremos en contacto contigo via WhatsApp para confirmar tu pago y enviarte tu comprobante.
            </p>
          </div>
          <Button context="section" variant="secondary" onClick={() => router.push('/raffles')}>
            Volver a Sorteos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 animate-in fade-in duration-500" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <button
          onClick={() => router.push('/raffles')}
          className="flex w-fit items-center text-stone-500 transition-colors hover:text-stone-850 sf-text-label"
          style={{ gap: 'var(--sf-space-sm)' }}
        >
          <ArrowLeft size={14} />
          Volver a Sorteos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'var(--sf-space-xl)' }}>
          <aside className="lg:col-span-4">
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <StorefrontCard className="aspect-[4/5] overflow-hidden p-0 shadow-2xl shadow-stone-200/50">
                {raffle.image ? (
                  <img src={raffle.image} className="h-full w-full object-cover" alt={raffle.title} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-100/50 text-stone-300">
                    <Ticket size={80} strokeWidth={1.2} />
                  </div>
                )}
              </StorefrontCard>

              <StorefrontCard>
                <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
                  <h2 className="sf-text-h1 text-stone-850 uppercase italic">{raffle.title}</h2>
                  <div className="flex items-center justify-between border-t border-stone-100 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
                    <span className="sf-text-label text-stone-400">Costo por Boleto</span>
                    <span className="sf-text-h1 text-brand-500">${formatPrice(raffle.ticketPrice)}</span>
                  </div>
                </div>
              </StorefrontCard>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <StorefrontCard className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
                <h1 className="sf-text-display text-stone-850 uppercase italic">Selecciona tus boletos</h1>
                <p className="sf-text-body text-stone-500">
                  {raffle.description || 'Elige tus numeros, deja tus datos y confirma la reserva por WhatsApp.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
                <RaffleInfoCard
                  icon={Calendar}
                  label="Fecha del Sorteo"
                  value={raffle.drawDate ? new Date(raffle.drawDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Por definir'}
                />
                <RaffleInfoCard
                  icon={Info}
                  label="Oportunidades"
                  value={`${raffle.opportunities} por boleto`}
                />
              </div>

              <TicketSelectionGrid
                raffle={raffle}
                occupiedTickets={occupiedTickets}
                onReserve={handleReserve}
                isReserving={isReserving}
              />
            </StorefrontCard>
          </section>
        </div>
      </div>
    </div>
  );
}

function RaffleInfoCard({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div
      className="flex items-center border border-stone-100 bg-stone-50/70"
      style={{ borderRadius: 'var(--sf-radius-card-inner)', padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}
    >
      <StorefrontIcon icon={icon} context="card" variant="brand" />
      <div>
        <p className="sf-text-label text-stone-400">{label}</p>
        <p className="sf-text-secondary font-black text-stone-850" suppressHydrationWarning>{value}</p>
      </div>
    </div>
  );
}
