"use client";

import { motion } from 'framer-motion';
import { ArrowUpRight, ShoppingCart, Eye, Tag } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatPrice } from '../../utils/formatters';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';

interface BentoArrivalsProps {
  products: Product[];
}

export function BentoArrivals({ products }: BentoArrivalsProps) {
  if (!products || products.length === 0) return null;

  const mainProduct = products[0];
  const gridProducts = products.slice(1, 5);

  return (
    <div className="grid grid-cols-1 items-stretch lg:grid-cols-12 gap-4 md:gap-6">
      {/* Main Big Card */}
      <div className="lg:col-span-5 lg:row-span-2">
        <ImmersiveProductCard product={mainProduct} priority />
      </div>

      {/* Grid of smaller cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-7 gap-4 md:gap-6">
        {gridProducts.map((product) => (
          <ImmersiveProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function ImmersiveProductCard({ product, priority = false }: { product: Product, priority?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.showToast);

  const isAvailable = product.saleStatus === 'AVAILABLE';

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
      className="group relative h-full overflow-hidden bg-white border border-stone-200/60 shadow-sm transition-all duration-700 hover:shadow-2xl hover:shadow-stone-200/50 hover:border-brand-500/20"
      style={{ 
        borderRadius: 'var(--sf-radius-outer)',
        aspectRatio: priority ? 'unset' : '1/1',
        minHeight: priority ? '500px' : 'auto'
      }}
    >
      {/* Background Image (Full blood) */}
      <div className="absolute inset-0 z-0 select-none">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.1]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-stone-50 text-stone-300">
            <Tag size={64} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Top Badge: Global Status (Recursive Position & Radius) */}
      <div 
        className="absolute z-20"
        style={{ top: 'var(--sf-padding-inner)', left: 'var(--sf-padding-inner)' }}
      >
        <Badge 
          variant={statusConfig.variant} 
          className="shadow-xl backdrop-blur-md px-5 py-2 uppercase font-black tracking-widest text-[9px] border-none"
          style={{ borderRadius: 'var(--sf-radius-inner)' }}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Information Overlay (Integrated with accurate spacing) */}
      <div 
        className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent transition-all duration-500"
        style={{ padding: 'var(--sf-padding-inner)' }}
      >
        <div className="space-y-4">
          {/* Always Visible: Title and Price */}
          <div className="space-y-1">
             <h3 className="sf-text-h2 font-black tracking-tight line-clamp-2 leading-none text-white group-hover:text-brand-400 transition-colors">
               {product.name}
             </h3>
             <p className="sf-text-body font-black tabular-nums text-brand-400 leading-none">
               ${formatPrice(product.price)}
             </p>
          </div>

          {/* Hover Visible: Extra Info and Actions */}
          <div className="overflow-hidden">
            <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-emil">
              {product.description && (
                <p className="sf-text-secondary text-white/60 line-clamp-2 mb-6 font-medium leading-relaxed">
                  {product.description}
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  asChild
                  variant="secondary" 
                  context="card" 
                  className="w-full h-12 bg-white/10 backdrop-blur-xl border border-white/10 text-white shadow-lg hover:bg-white/20 transition-all active:scale-95"
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
                    <ShoppingCart size={18} className="mr-2" /> Añadir
                  </Button>
                ) : (
                  <div 
                    className="w-full h-12 bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center text-[10px] font-black uppercase text-white/30 tracking-widest"
                    style={{ borderRadius: 'var(--sf-radius-inner)' }}
                  >
                    No Disp.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
