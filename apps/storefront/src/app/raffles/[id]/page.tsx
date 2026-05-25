import { Metadata } from 'next';
import { RaffleDetailsClient } from './RaffleDetailsClient';
import { Raffle } from '../../../types';
import { formatPrice } from '../../../utils/formatters';

interface PageProps {
  params: {
    id: string;
  };
}

async function fetchRaffle(id: string): Promise<Raffle | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiUrl}/raffles/${id}`, {
      cache: 'no-store'
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiUrl}/raffles/${id}/occupied-tickets`, {
      cache: 'no-store'
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
      description: 'El sorteo solicitado no está disponible.',
    };
  }

  const title = `Gran Sorteo: ${raffle.title} | Nexus`;
  const description = raffle.description || `Participa y gana en nuestro sorteo. Costo del boleto: $${formatPrice(raffle.ticketPrice)}.`;
  
  // Fallback defensivo si la rifa no tiene imagen (image es null)
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80'; // Imagen premium por defecto para rifas
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
    fetchOccupiedTickets(raffleId)
  ]);

  if (!raffle) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-black text-stone-800">Sorteo no encontrado</h1>
        <p className="text-stone-500">El sorteo solicitado no existe o fue cancelado.</p>
      </div>
    );
  }

  return <RaffleDetailsClient raffle={raffle} initialOccupiedTickets={occupiedTickets} />;
}
