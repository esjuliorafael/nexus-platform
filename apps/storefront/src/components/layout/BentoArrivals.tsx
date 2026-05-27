"use client";

import { motion } from 'framer-motion';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StorefrontCard } from '../ui/Card';
import { StorefrontIcon } from '../ui/Icon';
import { SmartImage } from '../ui/SmartImage';

interface BentoArrivalsProps {
  products: Product[];
}

export function BentoArrivals({ products }: BentoArrivalsProps) {
  if (!products || products.length === 0) return null;

  const mainProduct = products[0];
  const gridProducts = products.slice(1, 5);

  return (
    <div className="grid grid-cols-1 items-stretch lg:grid-cols-12" style={{ gap: 'var(--sf-space-md)' }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="lg:col-span-5 lg:row-span-2"
      >
        <StorefrontCard interactive className="group flex h-full flex-col overflow-hidden p-0">
          <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-stone-50 lg:aspect-auto lg:h-[500px]">
            <SmartImage
              src={mainProduct.thumbnail || 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=800&q=80'}
              alt={mainProduct.name}
              wrapperClassName="w-full h-full"
              className="transition-transform duration-1000 ease-out group-hover:scale-[1.05]"
            />
            <div className="absolute left-8 top-8 z-10 flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
              <Badge className="border-none bg-stone-950 text-white shadow-lg">
                Nueva Incorporacion
              </Badge>
              <Badge variant="outline" className="bg-white/95 text-stone-900 shadow-lg backdrop-blur-md">
                {mainProduct.type === 'BIRD' ? 'Ejemplar de Registro' : 'Insumo Oficial'}
              </Badge>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/20 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-between bg-white" style={{ padding: 'var(--sf-padding-outer)', gap: 'var(--sf-space-lg)' }}>
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <h3 className="sf-text-display text-stone-950 transition-colors duration-500 group-hover:text-brand-500 uppercase">
                {mainProduct.name}
              </h3>
              <p className="sf-text-body max-w-sm text-stone-500">
                {mainProduct.description || 'Un ejemplar de linaje superior, seleccionado por su vigor genetico y fenotipo excepcional.'}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                <span className="sf-text-label text-stone-400">Inversion</span>
                <span className="sf-text-h1 text-stone-950">${Number(mainProduct.price).toLocaleString()}</span>
              </div>
              <Button asChild context="card" variant="secondary">
                <Link href={`/store/${mainProduct.id}`}>
                  Detalles
                  <ArrowUpRight size={14} className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </StorefrontCard>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-7" style={{ gap: 'var(--sf-space-md)' }}>
        {gridProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 * (index + 1), ease: [0.23, 1, 0.32, 1] }}
          >
            <StorefrontCard interactive className="group flex h-full flex-col overflow-hidden p-0">
              <div className="relative aspect-video overflow-hidden bg-stone-50">
                <SmartImage
                  src={product.thumbnail || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=500&q=80'}
                  alt={product.name}
                  wrapperClassName="w-full h-full"
                  className="transition-transform duration-1000 ease-out group-hover:scale-[1.08]"
                />
                <div className="absolute right-4 top-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <StorefrontIcon icon={ShoppingBag} context="card" variant="muted" className="bg-white/90 backdrop-blur-md" />
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between" style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}>
                <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
                  <div className="flex items-center justify-between" style={{ gap: 'var(--sf-space-sm)' }}>
                    <span className="sf-text-label text-brand-500">
                      {product.type === 'BIRD' ? (product.purpose === 'COMBAT' ? 'Combate' : 'Cria') : 'Accesorio'}
                    </span>
                    <span className="sf-text-secondary font-black text-stone-950">${Number(product.price).toLocaleString()}</span>
                  </div>
                  <h4 className="sf-text-h2 text-stone-950 transition-colors group-hover:text-brand-500 uppercase">
                    {product.name}
                  </h4>
                </div>

                <Link
                  href={`/store/${product.id}`}
                  className="inline-flex items-center sf-text-label text-stone-400 transition-colors hover:text-stone-950"
                  style={{ gap: 'var(--sf-space-xs)' }}
                >
                  Ver Ficha
                  <ArrowUpRight size={10} />
                </Link>
              </div>
            </StorefrontCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
