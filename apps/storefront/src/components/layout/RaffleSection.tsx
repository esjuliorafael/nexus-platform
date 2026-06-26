"use client";

import { motion } from 'framer-motion';
import { ArrowRight, Clock, Ticket } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StorefrontIcon } from '../ui/Icon';

export function RaffleSection() {
  return (
    <section className="mx-auto max-w-[1440px] px-[var(--sf-inset-page-mobile)] lg:px-12">
      <div
        className="relative overflow-hidden border border-white/5 bg-stone-900 shadow-2xl"
        style={{ borderRadius: 'var(--sf-radius-outer)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(176,137,104,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div
          className="relative z-10 grid grid-cols-1 items-center lg:grid-cols-2"
          style={{ padding: 'clamp(2rem, 7vw, 6rem)', gap: 'var(--sf-space-xl)' }}
        >
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            >
              <Badge className="border-brand-500/30 bg-brand-500/20 text-brand-400">
                <Ticket size={12} className="mr-2" />
                Sorteos Exclusivos
              </Badge>
            </motion.div>

            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <h2 className="sf-text-display text-white uppercase italic">
                Gana Genetica <br />
                <span className="text-brand-500">de Clase Mundial</span>
              </h2>
              <p className="sf-text-body max-w-md text-stone-400">
                Participa en nuestras rifas oficiales y obten la oportunidad de llevarte ejemplares de registro y sementales probados.
              </p>
            </div>

            <div className="flex flex-wrap items-center" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex items-center" style={{ gap: 'var(--sf-space-sm)' }}>
                <StorefrontIcon icon={Clock} context="card" variant="dark" className="border-white/10 bg-white/5 text-brand-400" />
                <div>
                  <p className="sf-text-label text-stone-500">Estado</p>
                  <p className="sf-text-secondary font-bold uppercase text-white">Proximamente</p>
                </div>
              </div>

              <Button asChild context="section" className="bg-brand-500 hover:bg-brand-600">
                <Link href="/raffles">
                  Ver Proximas Rifas
                  <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, rotate: 4, y: 20 }}
              whileInView={{ opacity: 1, rotate: -2, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden border border-white/10 bg-white/5 p-12 text-center"
              style={{ borderRadius: 'var(--sf-radius-outer)', gap: 'var(--sf-space-md)' }}
            >
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
              <Ticket size={80} className="text-brand-500 transition-transform duration-700 group-hover:scale-110" />
              <h3 className="sf-text-h1 text-white uppercase">Sistema de Boletos Digital</h3>
              <p className="sf-text-secondary max-w-[240px] text-stone-500">
                Transparencia total y seleccion automatica de ganadores.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
