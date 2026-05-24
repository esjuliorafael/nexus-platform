"use client";

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Image as ImageIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Media } from '../../types';
import { Button } from '../ui/Button';
import { SmartImage } from '../ui/SmartImage';

interface GalleryFeaturedProps {
  items: Media[];
}

function FloatingCard({ item, index }: { item: Media; index: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Subtle 3D rotation based on mouse position
  const rotateX = useTransform(y, [-100, 100], [7, -7]);
  const rotateY = useTransform(x, [-100, 100], [-7, 7]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  // Staggered vertical offset for floating effect
  const yOffsets = [0, 40, -40, 20];
  const yPos = yOffsets[index % yOffsets.length];

  return (
    <motion.div
      style={{ rotateX, rotateY, y: yPos, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.15 }}
      className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-stone-900 border border-white/5 shadow-2xl group cursor-pointer perspective-1000"
    >
      <SmartImage 
        src={item.filePath} 
        alt={item.title}
        wrapperClassName="w-full h-full"
        className="transition-transform duration-1000 group-hover:scale-110"
      />
      
      {/* Premium Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end">
        <div style={{ transform: "translateZ(20px)" }} className="space-y-1">
          <span className="text-[9px] font-black text-brand-400 uppercase tracking-widest">Captura del Rancho</span>
          <h4 className="text-xl font-serif italic font-bold text-white uppercase leading-none">{item.title}</h4>
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryFeatured({ items }: GalleryFeaturedProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-stone-950 py-32 lg:py-48 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none" />

      <div className="container-wide relative z-10 space-y-24">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-[10px] font-black uppercase tracking-widest"
          >
            <ImageIcon size={12} /> Archivo Visual
          </motion.div>
          <h2 className="text-5xl md:text-7xl font-display font-black text-white tracking-tight uppercase italic leading-none">
            Vida en <span className="text-brand-500">La Manzana</span>
          </h2>
          <p className="text-stone-500 font-medium text-lg max-w-xl mx-auto">
            Testimonios visuales de nuestra dedicación, linajes y el entorno donde forjamos campeones.
          </p>
        </div>

        {/* Gallery Grid (Desktop Staggered) */}
        <div className="hidden lg:grid grid-cols-4 gap-8 px-12">
          {items.slice(0, 4).map((item, idx) => (
            <FloatingCard key={item.id} item={item} index={idx} />
          ))}
        </div>

        {/* Mobile Horizontal Carousel */}
        <div className="lg:hidden flex gap-6 overflow-x-auto px-6 pb-8 scrollbar-hide snap-x snap-mandatory">
          {items.map((item) => (
            <div key={item.id} className="min-w-[80vw] snap-center aspect-[3/4] rounded-[2rem] overflow-hidden bg-stone-900 relative shadow-2xl border border-white/5">
              <SmartImage 
                src={item.filePath} 
                alt={item.title}
                wrapperClassName="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                <h4 className="text-lg font-serif italic font-bold text-white uppercase">{item.title}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <Button variant="outline" size="lg" className="rounded-full border-white/10 text-white hover:bg-white hover:text-stone-950 px-10 h-16 font-bold uppercase tracking-widest text-xs group" asChild>
            <Link href="/gallery">
              Ver Galería Completa <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
