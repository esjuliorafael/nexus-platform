"use client";

import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StorefrontCard } from '../ui/Card';
import { ShoppingCart, ShieldCheck, Tag } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import Link from 'next/link';
import { formatPrice } from '../../utils/formatters';
import { Countdown } from '../ui/Countdown';
import { motion } from 'framer-motion';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  const isBird = product.type === 'BIRD';
  const isAvailable = product.saleStatus === 'AVAILABLE';
  const isReserved = product.saleStatus === 'RESERVED';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      thumbnail: product.thumbnail,
      type: product.type.toLowerCase() as 'bird' | 'item',
    });
  };

  const ageLabel = product.age === 'COCK' ? 'Gallo'
    : product.age === 'STAG' ? 'Pollo'
      : product.age === 'HEN' ? 'Gallina'
        : product.age === 'PULLET' ? 'Pollona'
          : product.age;

  const purposeLabel = product.purpose === 'COMBAT' ? 'Combate'
    : product.purpose === 'BREEDING' ? 'Cria'
      : product.purpose;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      className="group h-full"
    >
      <Link
        href={`/store/${product.id}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
        style={{ borderRadius: 'var(--sf-radius-outer)' }}
      >
        <StorefrontCard
          interactive
          className="flex h-full flex-col overflow-hidden p-0"
          style={{ borderRadius: 'var(--sf-radius-outer)' }}
        >
          <div className="relative aspect-square overflow-hidden bg-stone-50 select-none">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-stone-100/50 text-stone-300">
                <Tag size={36} strokeWidth={1} className="mb-2" />
                <span className="sf-text-label">Sin Imagen</span>
              </div>
            )}

            <div className="absolute left-5 top-5 z-10 flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
              <Badge variant={isBird ? 'default' : 'outline'} className="shadow-md backdrop-blur-md">
                {isBird ? 'Ave de Registro' : 'Accesorio'}
              </Badge>
              {!isAvailable && (
                <Badge
                  variant={product.saleStatus === 'SOLD' ? 'danger' : 'warning'}
                  className="shadow-md"
                >
                  {product.saleStatus === 'SOLD' ? 'Vendido' : 'Reservado'}
                </Badge>
              )}
            </div>

            {isBird && isAvailable && (
              <div
                className="absolute right-5 top-5 z-10 bg-stone-900/40 p-2 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100"
                style={{ borderRadius: 'var(--sf-radius-nested)' }}
              >
                <ShieldCheck size={16} className="text-brand-400" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>

          <div className="flex flex-1 flex-col" style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}>
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
              <h3 className="sf-text-h2 line-clamp-1 text-stone-850 transition-colors group-hover:text-brand-500 uppercase italic">
                {product.name}
              </h3>
              <p className="sf-text-label text-stone-400">
                {isBird
                  ? `${ageLabel} (Proposito: ${purposeLabel})`
                  : `Disponibles: ${product.stock} pzas`
                }
              </p>
            </div>

            {isReserved && product.expiresAt && (
              <div
                className="border border-brand-100/50 bg-brand-50/50"
                style={{ borderRadius: 'var(--sf-radius-nested)', padding: 'var(--sf-space-md)' }}
              >
                <Countdown expiresAt={product.expiresAt} />
              </div>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-stone-100/60 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                <span className="sf-text-label text-stone-400">Precio</span>
                <span className="sf-text-h1 text-brand-500">
                  ${formatPrice(product.price)}
                </span>
              </div>

              {isAvailable && (
                <Button
                  size="icon"
                  variant="secondary"
                  context="card"
                  onClick={handleAddToCart}
                  aria-label={`Agregar ${product.name} al carrito`}
                  className="hover:bg-brand-500 hover:border-brand-500 hover:shadow-brand-500/20"
                >
                  <ShoppingCart size={18} />
                </Button>
              )}
            </div>
          </div>
        </StorefrontCard>
      </Link>
    </motion.div>
  );
}
