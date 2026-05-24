"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Sparkles, Dna } from 'lucide-react';
import { Button } from '../ui/Button';
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
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=2000&auto=format&fit=crop",
    title: "Excelencia Genética Certificada",
    subtitle: "Crianza profesional de aves de combate con linajes probados y resultados garantizados.",
    badge: "Líneas de Élite",
    genetics: "Kelso - Albany F1"
  },
  {
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=2000&auto=format&fit=crop",
    title: "Sementales de Registro",
    subtitle: "Garantizamos la pureza y el vigor de cada ejemplar seleccionado para reproducción.",
    badge: "Genética Probada",
    genetics: "Sweater - Hatch F1"
  }
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!titleRef.current) return;
    
    // Animation for title words on change
    gsap.fromTo(titleRef.current.querySelectorAll('.word'), 
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "power4.out" }
    );
  }, { dependencies: [current], scope: containerRef });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section ref={containerRef} className="relative h-[92vh] w-full bg-stone-950 overflow-hidden flex items-center">
      {/* Background Slides */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.5, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <SmartImage 
              src={HERO_SLIDES[current].image} 
              alt={HERO_SLIDES[current].title}
              className="animate-slow-pan"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/40 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="container-wide relative z-10 px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Content */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-[10px] font-black uppercase tracking-widest"
          >
            <Sparkles size={10} /> {HERO_SLIDES[current].badge}
          </motion.div>

          <h1 
            ref={titleRef}
            className="text-[clamp(2.5rem,7vw,5.5rem)] font-display font-black text-white leading-[0.95] tracking-tight uppercase max-w-4xl"
          >
            {HERO_SLIDES[current].title.split(' ').map((word, i) => (
              <span key={i} className="inline-block word mr-[0.2em]">{word}</span>
            ))}
          </h1>

          <motion.p
            key={`p-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-stone-400 font-medium text-lg max-w-xl leading-relaxed"
          >
            {HERO_SLIDES[current].subtitle}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 pt-4"
          >
            <Button size="lg" className="rounded-full bg-brand-500 hover:bg-brand-600 text-white px-8 h-14 font-bold uppercase tracking-widest text-xs group" asChild>
              <Link href="/store">
                Ver Catálogo <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full border-white/10 text-white hover:bg-white hover:text-stone-950 px-8 h-14 font-bold uppercase tracking-widest text-xs" asChild>
              <Link href="/gallery">Explorar Rancho</Link>
            </Button>
          </motion.div>
        </div>

        {/* Right Content: Floating Pedigree Card */}
        <div className="hidden lg:block lg:col-span-5 relative">
          <motion.div
            key={`card-${current}`}
            initial={{ opacity: 0, rotateY: 20, x: 40 }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full" />
            
            <div className="flex items-center justify-between mb-12">
              <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-black italic">M</div>
              <div className="flex items-center gap-1 text-[10px] font-black text-stone-500 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Registro Activo
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-2">Linaje Destacado</p>
                <h3 className="text-3xl font-serif italic text-white leading-none">
                  {HERO_SLIDES[current].genetics}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Procedencia</p>
                  <p className="text-xs font-bold text-white uppercase">México / Importación</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Certificación</p>
                  <p className="text-xs font-bold text-white uppercase flex items-center gap-1">
                    <Dna size={10} className="text-brand-400" /> Genética F1
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-12 left-6 lg:left-12 flex items-center gap-4 z-10">
        <span className="font-display font-black text-brand-500 text-sm italic">0{current + 1}</span>
        <div className="w-32 h-[1px] bg-white/20 relative">
          <motion.div 
            key={current}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 8, ease: "linear" }}
            className="absolute inset-0 bg-brand-500"
          />
        </div>
        <span className="font-display font-black text-stone-600 text-sm italic">0{HERO_SLIDES.length}</span>
      </div>
    </section>
  );
}
