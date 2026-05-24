"use client";

import { motion } from 'framer-motion';
import { Ticket, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/Button';

export function RaffleSection() {
  return (
    <section className="max-w-[1440px] mx-auto px-6 lg:px-12">
      <div className="relative bg-stone-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(176,137,104,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center p-12 lg:p-24">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 border border-brand-500/30 rounded-full text-brand-400 text-[10px] font-black uppercase tracking-widest"
            >
              <Ticket size={12} /> Sorteos Exclusivos
            </motion.div>

            <div className="space-y-4">
              <h2 className="text-4xl md:text-7xl font-display font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                Gana Genética <br /> <span className="text-brand-500">de Clase Mundial</span>
              </h2>
              <p className="text-stone-400 font-medium text-lg max-w-md">
                Participa en nuestras rifas oficiales y obtén la oportunidad de llevarte ejemplares de registro y sementales probados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-brand-400 border border-white/10">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Estado</p>
                  <p className="text-sm font-bold text-white uppercase">Próximamente</p>
                </div>
              </div>
              
              <Button size="lg" className="rounded-full bg-brand-500 hover:bg-brand-600 text-white px-10 h-16 font-bold uppercase tracking-widest text-xs shadow-xl shadow-brand-500/20 group" asChild>
                <Link href="/raffles">
                  Ver Próximas Rifas <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, rotate: 5, y: 20 }}
              whileInView={{ opacity: 1, rotate: -2, y: 0 }}
              viewport={{ once: true }}
              className="relative aspect-square bg-white/5 border border-white/10 rounded-[3rem] p-12 flex flex-col justify-center items-center text-center space-y-6 overflow-hidden group"
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl" />
              <Ticket size={80} className="text-brand-500 mb-4 group-hover:scale-110 transition-transform duration-700" />
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">Sistema de Boletos Digital</h3>
              <p className="text-stone-500 text-sm font-medium max-w-[240px]">
                Transparencia total y selección automática de ganadores.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
