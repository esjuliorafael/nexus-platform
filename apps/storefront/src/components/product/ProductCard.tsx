"use client";

import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ShoppingCart, Eye, Tag, PlayCircle } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import Link from 'next/link';
import { formatPrice, getAssetUrl } from '../../utils/formatters';
import { motion } from 'framer-motion';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.showToast);

  const isAvailable = product.saleStatus === 'AVAILABLE';

  const thumbnailUrl = getAssetUrl(product.thumbnail);
  const isVideo = thumbnailUrl.toLowerCase().match(/\.(mp4|mov|webm)$/);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      thumbnail: thumbnailUrl,
      type: product.type.toLowerCase() as 'bird' | 'item',
    });
    showToast(`${product.name} añadido al carrito`, 'success');
  };

  const statusConfig = {
    AVAILABLE: { label: 'Disponible', variant: 'success' as const },
    RESERVED: { label: 'Apartado', variant: 'warning' as const },
    SOLD: { label: 'Vendido', variant: 'danger' as const },
  }[product.saleStatus] || { label: product.saleStatus, variant: 'muted' as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col group"
      style={{ gap: 'var(--sf-space-sm)' }}
    >
      {/* Level 1: Miniature Container (Autonomous Card Concept) */}
      <div 
        className="relative aspect-square overflow-hidden bg-white border border-stone-200/60 shadow-sm transition-all duration-700 group-hover:shadow-2xl group-hover:shadow-stone-200/50 group-hover:border-brand-500/20"
        style={{ borderRadius: 'var(--sf-radius-outer)' }}
      >
        {/* Media */}
        {thumbnailUrl ? (
          isVideo ? (
            <video
              src={`${thumbnailUrl}#t=0.5`}
              className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.1]"
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.1]"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-stone-50 text-stone-300">
            <Tag size={48} strokeWidth={1} />
          </div>
        )}

        {/* Video Icon Overlay */}
        {isVideo && (
          <div className="absolute bottom-3 right-3 z-10 bg-black/20 backdrop-blur-md p-1.5 rounded-full border border-white/20 text-white shadow-lg pointer-events-none group-hover:scale-110 transition-transform">
            <PlayCircle size={14} fill="currentColor" />
          </div>
        )}

        {/* Top Badge: Global Status (Recursive Position & Radius) */}
        <div 
          className="absolute z-10"
          style={{ 
            top: 'var(--sf-padding-inner)', 
            left: 'var(--sf-padding-inner)' 
          }}
        >
          <Badge 
            variant={statusConfig.variant} 
            className="shadow-xl backdrop-blur-md px-5 py-2 uppercase font-black tracking-widest text-[9px] border-none"
            style={{ borderRadius: 'var(--sf-radius-inner)' }}
          >
            {statusConfig.label}
          </Badge>
        </div>

        {/* Floating Actions (Integrated inside the card with Recursive Geometry) */}
        <div 
          className="absolute inset-x-0 bottom-0 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-emil"
          style={{ padding: 'var(--sf-padding-inner)' }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Button 
              asChild
              variant="secondary" 
              context="card" 
              className="w-full h-12 bg-white/90 backdrop-blur-xl border-none text-stone-900 shadow-lg hover:bg-white transition-all active:scale-95"
              style={{ borderRadius: 'var(--sf-radius-inner)' }}
            >
              <Link href={`/store/${product.id}`}>
                Detalles
              </Link>
            </Button>
            
            {isAvailable ? (
              <Button 
                variant="primary" 
                context="card" 
                onClick={handleAddToCart}
                className="w-full h-12 shadow-xl shadow-brand-500/30 transition-all active:scale-95"
                style={{ borderRadius: 'var(--sf-radius-inner)' }}
              >
                Añadir
              </Button>
            ) : (
              <div 
                className="w-full h-12 bg-stone-900/10 backdrop-blur-md flex items-center justify-center text-[10px] font-black uppercase text-stone-500 tracking-widest"
                style={{ borderRadius: 'var(--sf-radius-inner)' }}
              >
                No Disp.
              </div>
            )}
          </div>
        </div>

        {/* Overlay for action contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      {/* Level 2: Information Area (Relational Space) */}
      <div className="flex flex-col px-1" style={{ gap: 'var(--sf-space-xs)' }}>
        <h3 className="sf-text-h2 text-stone-850 font-black tracking-tight line-clamp-1 group-hover:text-brand-600 transition-colors">
          {product.name}
        </h3>
        <p className="sf-text-body text-brand-500 tabular-nums font-black leading-none">
          ${formatPrice(product.price)}
        </p>
      </div>
    </motion.div>
  );
}
