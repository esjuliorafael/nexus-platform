"use client";

import { MouseEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, PlayCircle, ShoppingCart, Tag } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice, getAssetUrl } from '../../utils/formatters';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StorefrontAutonomousCard } from '../ui/Card';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.showToast);

  const isAvailable = product.saleStatus === 'AVAILABLE';
  const thumbnailUrl = getAssetUrl(
    product.coverPosterUrl || product.coverMediaUrl || product.thumbnail,
  );
  const coverMediaUrl = getAssetUrl(product.coverMediaUrl);
  const isVideo = product.coverMediaType === 'VIDEO';

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      thumbnail: thumbnailUrl,
      type: product.type.toLowerCase() as 'bird' | 'item',
    });

    showToast(`${product.name} anadido al carrito`, 'success');
  };

  const statusConfig = {
    AVAILABLE: { label: 'Disponible', variant: 'success' as const },
    RESERVED: { label: 'Apartado', variant: 'warning' as const },
    SOLD: { label: 'Vendido', variant: 'danger' as const },
  }[product.saleStatus] || { label: product.saleStatus, variant: 'muted' as const };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group flex flex-col"
      style={{ gap: 'var(--sf-space-sm)' }}
    >
      <StorefrontAutonomousCard
        interactive
        density="none"
        className="relative aspect-square overflow-hidden group-hover:shadow-2xl group-hover:shadow-stone-200/50"
      >
        {thumbnailUrl ? (
          isVideo ? (
            <video
              src={coverMediaUrl}
              poster={thumbnailUrl || undefined}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(event) => event.currentTarget.play()}
              onMouseLeave={(event) => {
                event.currentTarget.pause();
                event.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-300">
            <Tag
              style={{
                width: 'var(--sf-size-stage-icon-compact)',
                height: 'var(--sf-size-stage-icon-compact)',
              }}
              strokeWidth={1.5}
            />
          </div>
        )}

        <div
          className="absolute z-10"
          style={{
            top: 'var(--sf-padding-inner)',
            left: 'var(--sf-padding-inner)',
          }}
        >
          <Badge variant={statusConfig.variant} context="card" className="shadow-xl">
            {statusConfig.label}
          </Badge>
        </div>

        {isVideo && (
          <div
            className="pointer-events-none absolute z-10 flex items-center justify-center border border-white/15 bg-stone-950/45 text-white shadow-lg backdrop-blur-md transition-transform group-hover:scale-105"
            style={{
              right: 'var(--sf-padding-inner)',
              bottom: 'var(--sf-padding-inner)',
              width: 'var(--sf-h-button-card)',
              height: 'var(--sf-h-button-card)',
              borderRadius: 'var(--sf-radius-card-nested)',
              transitionTimingFunction: 'var(--sf-ease)',
            }}
          >
            <PlayCircle
              fill="currentColor"
              style={{
                width: 'var(--sf-size-inner-icon-card)',
                height: 'var(--sf-size-inner-icon-card)',
              }}
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/42 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div
          className="absolute inset-x-0 bottom-0 z-20 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          style={{
            padding: 'var(--sf-padding-inner)',
            transitionTimingFunction: 'var(--sf-ease)',
          }}
        >
          <div className="grid grid-cols-2" style={{ gap: 'var(--sf-space-sm)' }}>
            <Button
              asChild
              variant="secondary"
              context="card"
              className="w-full gap-2 border-white/80 bg-white/90 text-stone-900 shadow-lg backdrop-blur-xl hover:bg-white"
            >
              <Link href={`/store/${product.id}`}>
                <Eye size={16} strokeWidth={2.4} />
                Detalles
              </Link>
            </Button>

            {isAvailable ? (
              <Button
                variant="primary"
                context="card"
                icon={ShoppingCart}
                onClick={handleAddToCart}
                className="w-full shadow-xl shadow-brand-500/30"
              >
                Anadir
              </Button>
            ) : (
              <div
                className="sf-text-button-card flex w-full items-center justify-center bg-stone-900/10 text-stone-500 backdrop-blur-md"
                style={{
                  height: 'var(--sf-h-button-card)',
                  borderRadius: 'var(--sf-radius-card-nested)',
                }}
              >
                No Disp.
              </div>
            )}
          </div>
        </div>
      </StorefrontAutonomousCard>

      <div className="flex flex-col px-1" style={{ gap: 'var(--sf-space-xs)' }}>
        <h3 className="sf-text-h2 line-clamp-1 font-black tracking-tight text-stone-850 transition-colors group-hover:text-brand-600">
          {product.name}
        </h3>
        <p className="sf-text-body font-black leading-none tabular-nums text-brand-500">
          ${formatPrice(product.price)}
        </p>
      </div>
    </motion.article>
  );
}
