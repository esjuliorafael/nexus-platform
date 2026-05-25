"use client";

import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ShoppingCart, Heart, ShieldCheck, Tag } from 'lucide-react';
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

  // Human-readable translations for the UI
  const ageLabel = product.age === 'COCK' ? 'Gallo' 
                 : product.age === 'STAG' ? 'Pollo'
                 : product.age === 'HEN' ? 'Gallina'
                 : product.age === 'PULLET' ? 'Pollona'
                 : product.age;

  const purposeLabel = product.purpose === 'COMBAT' ? 'Combate'
                     : product.purpose === 'BREEDING' ? 'Cría'
                     : product.purpose;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="group h-full"
    >
      <Link 
        href={`/store/${product.id}`} 
        className="flex flex-col h-full bg-white rounded-[2.5rem] border border-stone-200/60 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-500/20 transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        {/* Thumbnail area */}
        <div className="relative aspect-square overflow-hidden bg-stone-50 select-none">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-100/50">
              <Tag size={36} strokeWidth={1} className="mb-2" />
              <span className="text-xs font-semibold uppercase tracking-wider">Sin Imagen</span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-5 left-5 flex flex-col gap-2 z-10">
            <Badge variant={isBird ? 'default' : 'outline'} className="shadow-md backdrop-blur-md">
              {isBird ? 'Ave de Registro' : 'Accesorio'}
            </Badge>
            {!isAvailable && (
              <Badge 
                variant={product.saleStatus === 'SOLD' ? 'danger' : 'warning'} 
                className="shadow-md animate-pulse"
              >
                {product.saleStatus === 'SOLD' ? 'Vendido' : 'Reservado'}
              </Badge>
            )}
          </div>

          {/* Quality Badge Overlay for birds */}
          {isBird && isAvailable && (
            <div className="absolute top-5 right-5 z-10 bg-stone-900/40 backdrop-blur-md p-2 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ShieldCheck size={16} className="text-brand-400" />
            </div>
          )}

          {/* Decorative Gradient Shadow */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Info area */}
        <div className="p-6 flex flex-col flex-1 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-black text-stone-850 tracking-tight line-clamp-1 group-hover:text-brand-500 transition-colors uppercase italic lora">
              {product.name}
            </h3>
            
            {/* Meta information tags */}
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {isBird 
                ? `${ageLabel} (Propósito: ${purposeLabel})` 
                : `Disponibles: ${product.stock} pzas`
              }
            </p>
          </div>

          {isReserved && product.expiresAt && (
            <div className="bg-brand-50/50 border border-brand-100/50 p-3 rounded-2xl">
              <Countdown expiresAt={product.expiresAt} />
            </div>
          )}

          {/* Price & Cart Actions */}
          <div className="mt-auto pt-4 border-t border-stone-100/60 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Precio</span>
              <span className="text-xl md:text-2xl font-black text-brand-500 tracking-tight">
                ${formatPrice(product.price)}
              </span>
            </div>
            
            {isAvailable && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="icon"
                  className="rounded-2xl w-12 h-12 bg-stone-900 hover:bg-brand-500 text-white shadow-lg hover:shadow-brand-500/20 transition-all duration-300"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={18} />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
