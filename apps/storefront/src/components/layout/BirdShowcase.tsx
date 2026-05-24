"use client";

import { motion } from 'framer-motion';
import { Bird, ShieldCheck, Dna, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface BirdShowcaseProps {
  combatBirds: Product[];
  breedingBirds: Product[];
}

export function BirdShowcase({ combatBirds, breedingBirds }: BirdShowcaseProps) {
  return (
    <div className="space-y-40">
      
      {/* 1. COMBAT BIRDS - DARKROOM WARRIOR AESTHETIC */}
      <section className="bg-stone-950 py-32 lg:py-48 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="container-wide relative z-10 space-y-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-white/10 pb-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-brand-400 font-black uppercase text-[10px] tracking-[0.3em]">
                <ShieldCheck size={12} /> Poderío & Carácter
              </div>
              <h2 className="text-5xl md:text-8xl font-display font-black text-white tracking-tighter uppercase italic leading-[0.8]">
                Aves de <span className="text-brand-500">Combate</span>
              </h2>
              <p className="text-stone-400 font-medium text-lg max-w-lg">
                Ejemplares seleccionados por su casta, velocidad y corte. Genética probada en los niveles más exigentes.
              </p>
            </div>
            <Link href="/store?type=BIRD&purpose=COMBAT" className="group text-white font-black uppercase tracking-widest text-xs inline-flex items-center gap-2 shrink-0 hover:text-brand-400 transition-colors">
              Explorar Linajes <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {combatBirds.length > 0 ? (
              combatBirds.map((product) => (
                <div key={product.id} className="dark-card">
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[3rem]">
                <Bird className="mx-auto text-stone-700 mb-4" size={48} />
                <p className="text-stone-500 font-bold uppercase tracking-widest text-sm">Nuevos ejemplares en preparación</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. BREEDING BIRDS - MINIMALIST GENETIC AESTHETIC */}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-stone-200 pb-16">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-brand-500 font-black uppercase text-[10px] tracking-[0.3em]">
              <Dna size={12} /> Pureza & Herencia
            </div>
            <h2 className="text-5xl md:text-8xl font-display font-black text-stone-950 tracking-tighter uppercase leading-[0.8]">
              Aves de <span className="text-brand-500/80">Cría</span>
            </h2>
            <p className="text-stone-500 font-medium text-lg max-w-lg">
              Sementales y reproductoras de registro. El corazón de nuestra excelencia genética para tu propio rancho.
            </p>
          </div>
          <Link href="/store?type=BIRD&purpose=BREEDING" className="group text-stone-950 font-black uppercase tracking-widest text-xs inline-flex items-center gap-2 shrink-0 hover:text-brand-500 transition-colors">
            Ver Reproductoras <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mt-24">
          {breedingBirds.length > 0 ? (
            breedingBirds.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center border border-dashed border-stone-200 rounded-[3rem]">
              <Dna className="mx-auto text-stone-300 mb-4" size={48} />
              <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">Selección de sementales en curso</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
