import { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { ProductDetailsClient } from './ProductDetailsClient';
import { Button } from '../../../components/ui/Button';
import { getAssetUrl } from '../../../utils/formatters';
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProduct(params.id);

  if (!product) {
    return {
      title: 'Producto no encontrado | Nexus Store',
      description: 'El producto solicitado no esta disponible.',
    };
  }

  const title = `${product.name} | Nexus Store`;
  const description = product.description || `Adquiere ${product.name} al mejor precio en Nexus Store.`;
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
  const product = await getProduct(params.id);

  if (!product) {
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

  return <ProductDetailsClient product={product} />;
}
