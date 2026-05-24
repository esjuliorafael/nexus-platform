"use client";

import { motion } from 'framer-motion';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SmartImage } from '../ui/SmartImage';

interface BentoArrivalsProps {
  products: Product[];
}

export function BentoArrivals({ products }: BentoArrivalsProps) {
  if (!products || products.length === 0) return null;

  const mainProduct = products[0];
  const gridProducts = products.slice(1, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
      
      {/* 1. PRIMARY FEATURED PRODUCT (The Tower) */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="lg:col-span-5 lg:row-span-2 group relative bg-white border border-stone-200/60 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:border-brand-500/20 transition-all duration-700 flex flex-col"
      >
        <div className="relative aspect-[4/5] lg:aspect-auto lg:h-[500px] overflow-hidden bg-stone-50 shrink-0">
          <SmartImage 
            src={mainProduct.thumbnail || 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=800&q=80'} 
            alt={mainProduct.name}
            wrapperClassName="w-full h-full"
            className="group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute top-8 left-8 flex flex-col gap-2 z-10">
            <Badge className="shadow-lg text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-stone-950 text-white rounded-full border-none">
              Nueva Incorporación
            </Badge>
            <Badge variant="outline" className="shadow-lg text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-white/95 backdrop-blur-md text-stone-900 rounded-full border-stone-200">
              {mainProduct.type === 'BIRD' ? 'Ejemplar de Registro' : 'Insumo Oficial'}
            </Badge>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>
        
        <div className="p-10 flex-1 flex flex-col justify-between gap-8 bg-white relative z-10">
          <div className="space-y-4">
            <h3 className="text-3xl sm:text-4xl font-display font-black text-stone-950 tracking-tight uppercase leading-[0.95] group-hover:text-brand-500 transition-colors duration-500">
              {mainProduct.name}
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed font-medium max-w-sm">
              {mainProduct.description || "Un ejemplar de linaje superior, seleccionado por su vigor genético y fenotipo excepcional."}
            </p>
          </div>

          <div className="pt-8 border-t border-stone-100 flex items-center justify-between gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Inversión</span>
              <span className="text-3xl font-black text-stone-950 tracking-tighter">${mainProduct.price.toLocaleString()}</span>
            </div>
            <Button size="lg" className="rounded-full h-14 px-8 bg-stone-950 hover:bg-brand-500 text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all duration-500 hover:-translate-y-1" asChild>
              <Link href={`/store/${mainProduct.id}`}>
                Detalles <ArrowUpRight size={14} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. THE DENSE GRID (2x2) */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 grid-flow-dense">
        {gridProducts.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 * (idx + 1), ease: [0.16, 1, 0.3, 1] }}
            className="group relative bg-white border border-stone-200/60 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-brand-500/20 transition-all duration-700 flex flex-col"
          >
            <div className="relative aspect-video overflow-hidden bg-stone-50">
              <SmartImage 
                src={product.thumbnail || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=500&q=80'} 
                alt={product.name}
                wrapperClassName="w-full h-full"
                className="group-hover:scale-110 transition-transform duration-1000 ease-out"
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-stone-950 shadow-lg">
                  <ShoppingBag size={16} />
                </div>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">
                    {product.type === 'BIRD' ? (product.purpose === 'COMBAT' ? 'Combate' : 'Cría') : 'Accesorio'}
                  </span>
                  <span className="text-sm font-black text-stone-950 tracking-tighter">${product.price.toLocaleString()}</span>
                </div>
                <h4 className="text-xl font-display font-black text-stone-950 tracking-tight uppercase leading-none group-hover:text-brand-500 transition-colors">
                  {product.name}
                </h4>
              </div>
              
              <Link href={`/store/${product.id}`} className="mt-4 text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-950 transition-colors inline-flex items-center gap-1">
                Ver Ficha <ArrowUpRight size={10} />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
