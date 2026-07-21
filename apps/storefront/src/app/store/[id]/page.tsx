import { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { ProductDetailsClient } from './ProductDetailsClient';
import { Button } from '../../../components/ui/Button';
import { getAssetUrl } from '../../../utils/formatters';
import { getClientNameForMetadata, getSiteTitle } from '../../../utils/siteMetadata';
import { productApi } from '../../../api/products';

interface PageProps {
  params: {
    id: string;
  };
}

async function getProduct(id: string) {
  try {
    const productId = parseInt(id);
    if (isNaN(productId)) return null;
    return await productApi.getById(productId);
  } catch (error) {
    console.error(`Error fetching product ${id} in SSR:`, error);
    return null;
  }
}

async function fetchProductReservationHours(): Promise<number | null> {
  const apiUrl = process.env.INTERNAL_API_URL ||
                 process.env.NEXT_PUBLIC_API_URL ||
                 process.env.VITE_API_URL ||
                 'http://localhost:3001/api/v1';

  try {
    const response = await fetch(`${apiUrl}/store/settings`, { cache: 'no-store' });
    if (!response.ok) return null;

    const settings = await response.json() as Record<string, Record<string, string | null>>;
    const values = Object.values(settings).reduce<Record<string, string | null>>(
      (all, group) => ({ ...all, ...group }),
      {},
    );

    if (values.inventory_release_active !== '1') return null;

    const hours = Number(values.inventory_release_hours || 24);
    return Number.isFinite(hours) && hours > 0 ? hours : 24;
  } catch (error) {
    console.error('Error fetching product reservation settings in SSR:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const clientName = await getClientNameForMetadata();
  const product = await getProduct(params.id);

  if (!product) {
    return {
      title: getSiteTitle('Producto no encontrado', clientName),
      description: 'El producto solicitado no está disponible.',
    };
  }

  const title = getSiteTitle(product.name, clientName);
  const description = product.description || `Consulta ${product.name} en ${clientName}.`;
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=1200&q=80';
  const imageUrl = getAssetUrl(
    product.coverPosterUrl || product.coverMediaUrl || product.thumbnail,
  ) || defaultFallbackImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: clientName,
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

export default async function ProductDetailPage({ params }: PageProps) {
  const [product, productReservationHours] = await Promise.all([
    getProduct(params.id),
    fetchProductReservationHours(),
  ]);

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-[var(--sf-inset-page)] text-center">
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
            <ShoppingBag size={36} strokeWidth={1.5} />
          </div>

          <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
            <h1 className="sf-text-h1 uppercase italic text-stone-800">Producto no encontrado</h1>
            <p className="sf-text-secondary mx-auto max-w-xs text-stone-500">
              El producto con ID {params.id} no existe o no esta disponible en este momento.
            </p>
          </div>

          <Button asChild context="section">
            <Link href="/store">Volver a tienda</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ProductDetailsClient
      product={product}
      reservationHours={productReservationHours}
    />
  );
}
