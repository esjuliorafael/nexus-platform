"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Package } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface ArticleShelfProps {
  products: Product[];
}

export function ArticleShelf({ products }: ArticleShelfProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-6 lg:px-12">
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col justify-between border-b border-stone-200 pb-[var(--sf-space-md)] md:flex-row md:items-end"
          style={{ gap: 'var(--sf-space-md)' }}
        >
          <div className="flex max-w-2xl flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
            <div className="inline-flex items-center sf-text-label text-brand-500" style={{ gap: 'var(--sf-space-sm)' }}>
              <Package size={12} />
              Equipamiento & Nutricion
            </div>
            <h2 className="sf-text-display text-stone-950 uppercase">Articulos e Insumos</h2>
            <p className="sf-text-body max-w-md text-stone-500">
              Alimentos formulados, suplementos y accesorios oficiales para el cuidado de tus ejemplares.
            </p>
          </div>
          <Link
            href="/store?type=ITEM"
            className="group inline-flex shrink-0 items-center sf-text-label text-stone-950 transition-colors hover:text-brand-500"
            style={{ gap: 'var(--sf-space-sm)' }}
          >
            Ver todos los articulos
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div 
          className="flex snap-x snap-mandatory overflow-x-auto pb-12 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-x-visible" 
          style={{ gap: 'var(--sf-space-md)', paddingInline: 'var(--sf-space-xs)' }}
        >
          {products.map((product) => (
            <div key={product.id} className="w-[300px] min-w-[300px] shrink-0 snap-center sm:w-[340px] sm:min-w-[340px] lg:w-full lg:min-w-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
