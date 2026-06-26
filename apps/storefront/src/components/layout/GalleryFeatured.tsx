"use client";

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { Media } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SmartImage } from '../ui/SmartImage';

interface GalleryFeaturedProps {
  items: Media[];
}

function GalleryMediaVisual({ item }: { item: Media }) {
  if (item.mediaType === 'VIDEO' && !item.posterUrl) {
    return (
      <video
        src={item.mediaUrl}
        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.08]"
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <SmartImage
      src={item.posterUrl || item.mediaUrl || item.filePath}
      alt={item.title}
      wrapperClassName="w-full h-full"
      className="transition-transform duration-1000 group-hover:scale-[1.08]"
    />
  );
}

function FloatingCard({ item, index }: { item: Media; index: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [7, -7]);
  const rotateY = useTransform(x, [-100, 100], [-7, 7]);
  const yOffsets = [0, 40, -40, 20];

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - (rect.left + rect.width / 2));
    y.set(event.clientY - (rect.top + rect.height / 2));
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        y: yOffsets[index % yOffsets.length],
        transformStyle: 'preserve-3d',
        borderRadius: 'var(--sf-radius-card-inner)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      className="perspective-1000 group relative aspect-[3/4] cursor-pointer overflow-hidden border border-white/5 bg-stone-900 shadow-2xl"
    >
      <GalleryMediaVisual item={item} />

      <div
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100"
        style={{ padding: 'var(--sf-padding-inner)' }}
      >
        <div style={{ transform: 'translateZ(20px)' }} className="flex flex-col" >
          <Badge variant="overlayBrand" context="card" icon={ImageIcon} className="w-fit">
            Rancho
          </Badge>
          <h4 className="sf-text-h2 text-white uppercase italic">{item.title}</h4>
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryFeatured({ items }: GalleryFeaturedProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-stone-950" style={{ paddingBlock: 'clamp(5rem, 12vw, 12rem)' }}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-[var(--sf-inset-page-mobile)] lg:px-12">
        <div className="flex flex-col" style={{ gap: 'var(--sf-space-xl)' }}>
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center" style={{ gap: 'var(--sf-space-md)' }}>
            <Badge variant="brand" context="section" icon={ImageIcon}>
              Archivo Visual
            </Badge>
            <h2 className="sf-text-display text-white uppercase italic">
              Vida en <span className="text-brand-500">Nuestra Granja</span>
            </h2>
            <p className="sf-text-body text-stone-500">
              Testimonios visuales de nuestra dedicacion, linajes y el entorno donde forjamos campeones.
            </p>
          </div>

          <div className="hidden grid-cols-4 px-12 lg:grid" style={{ gap: 'var(--sf-space-md)' }}>
            {items.slice(0, 4).map((item, index) => (
              <FloatingCard key={item.id} item={item} index={index} />
            ))}
          </div>

          <div className="flex snap-x snap-mandatory overflow-x-auto px-[var(--sf-inset-page-mobile)] pb-8 scrollbar-hide lg:hidden" style={{ gap: 'var(--sf-space-md)' }}>
            {items.map((item) => (
              <div
                key={item.id}
                className="relative aspect-[3/4] min-w-[80vw] snap-center overflow-hidden border border-white/5 bg-stone-900 shadow-2xl"
                style={{ borderRadius: 'var(--sf-radius-card-inner)' }}
              >
                <GalleryMediaVisual item={item} />
                <div
                  className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent text-white"
                  style={{ padding: 'var(--sf-padding-inner)' }}
                >
                  <Badge variant="overlayBrand" context="card" icon={ImageIcon} className="mb-[var(--sf-space-sm)] w-fit">
                    Rancho
                  </Badge>
                  <h4 className="sf-text-h2 uppercase italic">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button asChild variant="outline" context="section" className="border-white/10 text-white hover:bg-white hover:text-stone-950">
              <Link href="/gallery">
                Ver Galeria Completa
                <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
