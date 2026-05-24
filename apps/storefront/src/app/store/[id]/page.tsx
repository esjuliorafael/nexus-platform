import { Metadata } from 'next';
import { ProductDetailsClient } from './ProductDetailsClient';
import { Product } from '../../../types';

interface PageProps {
  params: {
    id: string;
  };
}

async function fetchProduct(id: string): Promise<Product | null> {
  const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiUrl}/store/products/${id}`, {
      cache: 'no-store' // Always fetch fresh product details
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching product in SSR:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await fetchProduct(params.id);
  if (!product) {
    return {
      title: 'Producto no encontrado | Nexus Store',
      description: 'El producto solicitado no está disponible.',
    };
  }

  const title = `${product.name} | Nexus Store`;
  const description = product.description || `Adquiere ${product.name} al mejor precio en Nexus Store.`;
  
  // Fallback defensivo si el producto no tiene imagen (thumbnail es null)
  const defaultFallbackImage = 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=1200&q=80'; // Imagen artística y premium por defecto
  const imageUrl = product.thumbnail || defaultFallbackImage;

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
  const product = await fetchProduct(params.id);

  if (!product) {
    return (
      <div className="h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-black text-stone-800">Producto no encontrado</h1>
        <p className="text-stone-500">El producto con ID {params.id} no existe o no está disponible.</p>
      </div>
    );
  }

  return <ProductDetailsClient product={product} />;
}
