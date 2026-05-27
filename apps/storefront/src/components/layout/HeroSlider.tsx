"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Dna, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SmartImage } from '../ui/SmartImage';

interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  badge: string;
  genetics?: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=2000&auto=format&fit=crop',
    title: 'Excelencia Genetica Certificada',
    subtitle: 'Crianza profesional de aves de combate con linajes probados y resultados garantizados.',
    badge: 'Lineas de Elite',
    genetics: 'Kelso - Albany F1',
  },
  {
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=2000&auto=format&fit=crop',
    title: 'Sementales de Registro',
    subtitle: 'Garantizamos la pureza y el vigor de cada ejemplar seleccionado para reproduccion.',
    badge: 'Genetica Probada',
    genetics: 'Sweater - Hatch F1',
  },
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!titleRef.current) return;

    gsap.fromTo(
      titleRef.current.querySelectorAll('.word'),
      { y: 48, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75, stagger: 0.045, ease: 'power4.out' }
    );
  }, { dependencies: [current], scope: containerRef });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[current];

  return (
    <section ref={containerRef} className="relative flex h-[92vh] w-full items-center overflow-hidden bg-stone-950">
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.5, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0"
          >
            <SmartImage src={slide.image} alt={slide.title} className="animate-slow-pan" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/45 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center px-6 lg:grid-cols-12 lg:px-12" style={{ gap: 'var(--sf-space-xl)' }}>
        <div className="flex flex-col lg:col-span-7" style={{ gap: 'var(--sf-space-lg)' }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
            <Badge className="border-brand-500/20 bg-brand-500/10 text-brand-400">
              <Sparkles size={10} className="mr-2" />
              {slide.badge}
            </Badge>
          </motion.div>

          <h1 ref={titleRef} className="sf-text-hero max-w-4xl text-white uppercase">
            {slide.title.split(' ').map((word, index) => (
              <span key={index} className="word mr-[0.2em] inline-block">{word}</span>
            ))}
          </h1>

          <motion.p
            key={`p-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="sf-text-body max-w-xl text-stone-400"
          >
            {slide.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap items-center pt-2"
            style={{ gap: 'var(--sf-space-sm)' }}
          >
            <Button asChild context="section" className="bg-brand-500 hover:bg-brand-600">
              <Link href="/store">
                Ver Catalogo
                <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" context="section" className="border-white/10 text-white hover:bg-white hover:text-stone-950">
              <Link href="/gallery">Explorar Rancho</Link>
            </Button>
          </motion.div>
        </div>

        <div className="relative hidden lg:col-span-5 lg:block">
          <motion.div
            key={`card-${current}`}
            initial={{ opacity: 0, rotateY: 18, x: 36 }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            className="group relative overflow-hidden border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl"
            style={{ borderRadius: 'var(--sf-radius-outer)', padding: 'var(--sf-padding-outer)' }}
          >
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col" style={{ gap: 'var(--sf-space-xl)' }}>
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center justify-center bg-brand-500 text-xl font-black italic text-white"
                  style={{
                    width: 'var(--sf-size-icon-section)',
                    height: 'var(--sf-size-icon-section)',
                    borderRadius: 'var(--sf-radius-inner)',
                  }}
                >
                  M
                </div>
                <div className="flex items-center sf-text-label text-stone-500" style={{ gap: 'var(--sf-space-xs)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Registro Activo
                </div>
              </div>

              <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
                <div>
                  <p className="sf-text-label mb-2 text-brand-400">Linaje Destacado</p>
                  <h3 className="sf-text-h1 text-white italic">{slide.genetics}</h3>
                </div>

                <div className="grid grid-cols-2 border-t border-white/5 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-md)' }}>
                  <PedigreeItem label="Procedencia" value="Mexico / Importacion" />
                  <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                    <p className="sf-text-label text-stone-500">Certificacion</p>
                    <p className="inline-flex items-center sf-text-secondary font-bold uppercase text-white" style={{ gap: 'var(--sf-space-xs)' }}>
                      <Dna size={12} className="text-brand-400" />
                      Genetica F1
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-12 left-6 z-10 flex items-center lg:left-12" style={{ gap: 'var(--sf-space-sm)' }}>
        <span className="sf-text-label text-brand-500">0{current + 1}</span>
        <div className="relative h-px w-32 bg-white/20">
          <motion.div
            key={current}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: 'linear' }}
            className="absolute inset-0 bg-brand-500"
          />
        </div>
        <span className="sf-text-label text-stone-600">0{HERO_SLIDES.length}</span>
      </div>
    </section>
  );
}

function PedigreeItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      <p className="sf-text-label text-stone-500">{label}</p>
      <p className="sf-text-secondary font-bold uppercase text-white">{value}</p>
    </div>
  );
}
