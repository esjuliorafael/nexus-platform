"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StorefrontCard } from '../../../components/ui/Card';
import { StorefrontIcon } from '../../../components/ui/Icon';
import { useCartStore } from '../../../store/cart.store';
import { ChevronLeft, CheckCircle2, ShieldCheck, ShoppingCart, Tag, Truck, PlayCircle, Film } from 'lucide-react';
import { formatBirdAge, formatBirdPurpose, formatPrice, formatSaleStatus, getAssetUrl } from '../../../utils/formatters';

interface ProductDetailsClientProps {
  product: Product;
}

const trustItems = [
  { icon: ShieldCheck, label: 'Compra Segura' },
  { icon: Truck, label: 'Envios a todo el pais' },
  { icon: CheckCircle2, label: 'Garantia de Calidad' },
];

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const [activeMedia, setActiveMedia] = useState<{ url: string; type: 'PHOTO' | 'VIDEO' } | null>(
    product.thumbnail 
      ? { 
          url: getAssetUrl(product.thumbnail), 
          type: product.thumbnail.toLowerCase().match(/\.(mp4|mov|webm)$/) ? 'VIDEO' : 'PHOTO' 
        } 
      : null
  );
  const addItem = useCartStore((state) => state.addItem);

  const isAvailable = product.saleStatus === 'AVAILABLE';
  const galleryItems = [
    ...(product.thumbnail ? [{ 
      id: 'thumbnail', 
      filePath: getAssetUrl(product.thumbnail), 
      fileType: (product.thumbnail.toLowerCase().match(/\.(mp4|mov|webm)$/) ? 'VIDEO' : 'PHOTO') as 'PHOTO' | 'VIDEO'
    }] : []),
    ...(product.gallery ?? []).map((item) => ({ 
      id: item.id.toString(), 
      filePath: getAssetUrl(item.filePath), 
      fileType: item.fileType 
    })),
  ];

  // Si la galería tiene un video en la primera posición real (no el thumbnail), lo priorizamos
  // Esto es para el nuevo flujo donde la portada (video) se guarda en la galería[0]
  useEffect(() => {
    const firstVideo = product.gallery?.find((item, idx) => idx === 0 && item.fileType === 'VIDEO');
    if (firstVideo) {
      setActiveMedia({ url: getAssetUrl(firstVideo.filePath), type: 'VIDEO' });
    }
  }, [product.gallery]);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      thumbnail: getAssetUrl(product.thumbnail),
      type: product.type.toLowerCase() as 'bird' | 'item',
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <Link
          href="/store"
          className="inline-flex w-fit items-center text-stone-500 transition-colors hover:text-brand-500 sf-text-label"
          style={{ gap: 'var(--sf-space-sm)' }}
        >
          <ChevronLeft size={18} />
          Volver al catalogo
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--sf-space-xl)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
            <StorefrontCard className="aspect-square overflow-hidden p-0 shadow-xl shadow-stone-200/50">
              {activeMedia ? (
                activeMedia.type === 'VIDEO' ? (
                  <video 
                    src={activeMedia.url} 
                    className="h-full w-full object-cover" 
                    controls 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img src={activeMedia.url} className="h-full w-full object-cover animate-in fade-in duration-500" alt={product.name} />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-stone-100/50 text-stone-300" style={{ gap: 'var(--sf-space-sm)' }}>
                  <Tag size={40} strokeWidth={1.2} />
                  <span className="sf-text-label">Sin imagen</span>
                </div>
              )}
            </StorefrontCard>

            {galleryItems.length > 1 && (
              <div className="grid grid-cols-4" style={{ gap: 'var(--sf-space-sm)' }}>
                {galleryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMedia({ url: item.filePath, type: item.fileType })}
                    className={`relative aspect-square overflow-hidden border-2 transition-all duration-300 ${
                      activeMedia?.url === item.filePath
                        ? 'border-brand-500 opacity-100 shadow-lg shadow-brand-500/10'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      borderRadius: 'var(--sf-radius-nested)',
                      transitionTimingFunction: 'var(--sf-ease)',
                    }}
                    aria-label="Cambiar imagen del producto"
                  >
                    {item.fileType === 'VIDEO' ? (
                      <div className="relative h-full w-full">
                        <video 
                          src={`${item.filePath}#t=0.5`} 
                          className="h-full w-full object-cover" 
                          preload="metadata" 
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <PlayCircle className="text-white drop-shadow-md" size={24} fill="currentColor" />
                        </div>
                      </div>
                    ) : (
                      <img src={item.filePath} className="h-full w-full object-cover" alt="Imagen del producto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col py-2" style={{ gap: 'var(--sf-space-lg)' }}>
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex flex-wrap items-center" style={{ gap: 'var(--sf-space-sm)' }}>
                <Badge variant={product.type === 'BIRD' ? 'default' : 'outline'}>
                  {product.type === 'BIRD' ? 'Ave' : 'Articulo'}
                </Badge>
                <Badge variant={isAvailable ? 'success' : 'warning'}>
                  {formatSaleStatus(product.saleStatus)}
                </Badge>
              </div>

              <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
                <h1 className="sf-text-hero text-stone-850 uppercase italic">
                  {product.name}
                </h1>
                <p className="sf-text-display text-brand-500">
                  ${formatPrice(product.price)}
                </p>
              </div>
            </div>

            <p className="sf-text-body max-w-xl text-stone-500">
              {product.description || 'Sin descripcion disponible.'}
            </p>

            {product.type === 'BIRD' && (
              <div
                className="grid grid-cols-1 border border-stone-200/60 bg-stone-50 sm:grid-cols-3"
                style={{
                  borderRadius: 'var(--sf-radius-outer)',
                  padding: 'var(--sf-padding-inner)',
                  gap: 'var(--sf-space-md)',
                }}
              >
                <ProductStat label="No. Anillo" value={product.ringNumber || 'N/A'} />
                <ProductStat label="Edad / Etapa" value={formatBirdAge(product.age)} />
                <ProductStat label="Proposito" value={formatBirdPurpose(product.purpose)} />
              </div>
            )}

            <div>
              {isAvailable ? (
                <Button
                  size="lg"
                  context="section"
                  className="w-full"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2" size={22} />
                  Agregar al Carrito
                </Button>
              ) : (
                <Button size="lg" context="section" className="w-full" disabled>
                  No disponible
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 border-t border-stone-100 pt-[var(--sf-space-md)] md:grid-cols-3" style={{ gap: 'var(--sf-space-md)' }}>
              {trustItems.map((item) => (
                <div key={item.label} className="flex items-center text-stone-500" style={{ gap: 'var(--sf-space-sm)' }}>
                  <StorefrontIcon icon={item.icon} context="card" variant="brand" />
                  <span className="sf-text-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductStat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      <span className="sf-text-label text-stone-400">{label}</span>
      <p className="sf-text-secondary font-bold text-stone-700">{value || 'N/A'}</p>
    </div>
  );
}
