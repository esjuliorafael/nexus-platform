"use client";

import { motion } from 'framer-motion';

export function SectionReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SkeletonBento() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px] animate-pulse">
      <div className="lg:col-span-5 bg-stone-200 rounded-[2.5rem]" />
      <div className="lg:col-span-7 grid grid-cols-2 gap-8">
        <div className="bg-stone-200 rounded-[2rem]" />
        <div className="bg-stone-200 rounded-[2rem]" />
        <div className="bg-stone-200 rounded-[2rem]" />
        <div className="bg-stone-200 rounded-[2rem]" />
      </div>
    </div>
  );
}
