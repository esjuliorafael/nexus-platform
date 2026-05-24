"use client";

import { motion } from 'framer-motion';
import { Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface ArticleShelfProps {
  products: Product[];
}

export function ArticleShelf({ products }: ArticleShelfProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-16">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 pb-10"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-brand-500 font-black uppercase text-[10px] tracking-[0.2em]">
            <Package size={12} /> Equipamiento & Nutrición
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-black text-stone-950 tracking-tight uppercase leading-[0.9]">
            Artículos e Insumos
          </h2>
          <p className="text-stone-500 font-medium text-lg max-w-md">
            Alimentos formulados, suplementos y accesorios oficiales para el cuidado de tus ejemplares.
          </p>
        </div>
        <Link href="/store?type=ITEM" className="group text-stone-950 font-black uppercase tracking-widest text-xs inline-flex items-center gap-2 shrink-0 hover:text-brand-500 transition-colors">
          Ver todos los artículos <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>

      {/* Horizontal Scroll Shelf with custom styling */}
      <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide snap-x snap-mandatory px-2">
        {products.map((product) => (
          <div key={product.id} className="min-w-[300px] w-[300px] sm:min-w-[340px] sm:w-[340px] snap-center shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
