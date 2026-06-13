import { Metadata } from 'next';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { RaffleDetailsClient } from './RaffleDetailsClient';
import { Button } from '../../../components/ui/Button';
import { Raffle } from '../../../types';
import { formatPrice } from '../../../utils/formatters';

interface PageProps {
  params: {
    id: string;
  };
}

async function fetchRaffle(id: string): Promise<Raffle | null> {
  const apiUrl = process.env.INTERNAL_API_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 process.env.VITE_API_URL || 
                 'http://localhost:3001/api/v1';

  try {
    const res = await fetch(`${apiUrl}/raffles/${id}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching raffle in SSR:', error);
    return null;
  }
}

async function fetchOccupiedTickets(id: string): Promise<string[]> {
  const apiUrl = process.env.INTERNAL_API_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 process.env.VITE_API_URL || 
                 'http://localhost:3001/api/v1';

  try {
    const res = await fetch(`${apiUrl}/raffles/${id}/occupied-tickets`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching occupied tickets in SSR:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const raffle = await fetchRaffle(params.id);

  if (!raffle) {
    return {
      title: 'Sorteo no encontrado | Nexus Sorteos',
      description: 'El sorteo solicitado no esta disponible.',
    };
  }

  const title = `Gran Sorteo: ${raffle.title} | Nexus`;
  const description = raffle.description || `Participa y gana en nuestro sorteo. Costo del boleto: $${formatPrice(raffle.ticketPrice)}.`;
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80';
  const imageUrl = raffle.image || defaultFallbackImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function RaffleDetailPage({ params }: PageProps) {
  const raffleId = params.id;

  const [raffle, occupiedTickets] = await Promise.all([
    fetchRaffle(raffleId),
    fetchOccupiedTickets(raffleId),
  ]);

  if (!raffle) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-[var(--sf-padding-outer)] text-center">
        <div
          className="mx-auto flex max-w-lg flex-col items-center justify-center border border-stone-200/60 bg-white text-center shadow-xl shadow-stone-100/50"
          style={{
            borderRadius: 'var(--sf-radius-outer)',
            padding: 'var(--sf-padding-outer)',
            gap: 'var(--sf-space-md)',
          }}
        >
          <div
            className="flex items-center justify-center bg-brand-50 text-brand-500 shadow-inner"
            style={{
              width: 'var(--sf-size-icon-section)',
              height: 'var(--sf-size-icon-section)',
              borderRadius: 'var(--sf-radius-inner)',
            }}
          >
            <Ticket size={36} strokeWidth={1.5} />
          </div>

          <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
            <h1 className="sf-text-h1 uppercase italic text-stone-800">Sorteo no encontrado</h1>
            <p className="sf-text-secondary mx-auto max-w-xs text-stone-500">
              El sorteo solicitado no existe o fue cancelado.
            </p>
          </div>

          <Button asChild context="section">
            <Link href="/raffles">Volver a rifas</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <RaffleDetailsClient raffle={raffle} initialOccupiedTickets={occupiedTickets} />;
}
