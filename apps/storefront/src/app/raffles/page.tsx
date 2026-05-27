"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Sparkles, Ticket, type LucideIcon } from 'lucide-react';
import { raffleApi } from '../../api/raffles';
import { Raffle } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { StorefrontCard } from '../../components/ui/Card';
import { StorefrontIcon } from '../../components/ui/Icon';
import { useSettings } from '../../hooks/useSettings';
import { formatPrice } from '../../utils/formatters';

export default function RafflesPage() {
  const { isModuleEnabled } = useSettings();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  const isRaffleEnabled = isModuleEnabled('raffle_enabled') || process.env.NEXT_PUBLIC_RAFFLE_ENABLED === 'true';

  useEffect(() => {
    const loadRaffles = async () => {
      if (!isRaffleEnabled) {
        setLoading(false);
        return;
      }

      try {
        const data = await raffleApi.getAll();
        setRaffles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading raffles:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRaffles();
  }, [isRaffleEnabled]);

  if (!isRaffleEnabled) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex flex-col items-center" style={{ gap: 'var(--sf-space-md)' }}>
            <StorefrontIcon icon={Ticket} context="section" variant="muted" />
            <h1 className="sf-text-display text-stone-850 uppercase italic">Modulo Desactivado</h1>
            <p className="sf-text-body max-w-md text-stone-500">
              El modulo de rifas no esta activo en este momento. Vuelve pronto para participar en nuestros proximos sorteos.
            </p>
            <Button asChild variant="outline" context="section">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center" style={{ gap: 'var(--sf-space-md)' }}>
          <Badge variant="default" className="bg-brand-50 text-brand-500">
            <Sparkles size={12} className="mr-2" />
            Sorteos Exclusivos
          </Badge>
          <h1 className="sf-text-display text-stone-850 uppercase italic">Rifas Activas</h1>
          <p className="sf-text-body text-stone-500">
            Participa en nuestros sorteos especiales y gana ejemplares elite de registro con genetica de campeonato mundial de Granja La Manzana.
          </p>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        ) : raffles.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Sin Sorteos Activos"
            description="Actualmente no tenemos ninguna rifa activa. Suscribete a nuestros canales oficiales de WhatsApp para enterarte de futuros sorteos."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
            {raffles.map((raffle, index) => (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1], delay: index * 0.06 }}
                whileHover={{ y: -6 }}
                className="h-full"
              >
                <StorefrontCard interactive className="group flex h-full flex-col overflow-hidden p-0 md:flex-row">
                  <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-stone-50 md:h-auto md:w-2/5">
                    {raffle.image ? (
                      <img
                        src={raffle.image}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                        alt={raffle.title}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-stone-100/50 text-stone-300">
                        <Ticket size={48} strokeWidth={1} className="mb-2" />
                        <span className="sf-text-label">Sin Imagen</span>
                      </div>
                    )}
                    <div className="absolute left-5 top-5">
                      <Badge className="border-brand-400 bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                        Activa
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between" style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-lg)' }}>
                    <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
                      <h3 className="sf-text-h1 text-stone-850 transition-colors group-hover:text-brand-500 uppercase italic">
                        {raffle.title}
                      </h3>
                      <p className="sf-text-secondary line-clamp-3 text-stone-500">
                        {raffle.description || 'Participa en este sorteo adquiriendo boletos desde la plataforma de forma rapida y segura.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 border-t border-stone-100/60 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
                      <RaffleStat icon={Ticket} label="Costo Boleto" value={`$${formatPrice(raffle.ticketPrice)}`} />
                      <RaffleStat
                        icon={Calendar}
                        label="Fecha Sorteo"
                        value={raffle.drawDate ? new Date(raffle.drawDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Por definir'}
                      />
                    </div>

                    <Button asChild context="card" variant="secondary" className="w-full hover:border-brand-500 hover:bg-brand-500">
                      <Link href={`/raffles/${raffle.id}`}>
                        Comprar Boletos
                        <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={16} />
                      </Link>
                    </Button>
                  </div>
                </StorefrontCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RaffleStat({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center" style={{ gap: 'var(--sf-space-sm)' }}>
      <StorefrontIcon icon={icon} context="card" variant="brand" />
      <div className="min-w-0">
        <p className="sf-text-label text-stone-400">{label}</p>
        <p className="sf-text-secondary truncate font-black text-stone-850">{value}</p>
      </div>
    </div>
  );
}
