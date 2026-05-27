"use client";

import { motion } from 'framer-motion';

export function SectionReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SkeletonBento() {
  return (
    <div className="grid h-[600px] grid-cols-1 animate-pulse lg:grid-cols-12" style={{ gap: 'var(--sf-space-md)' }}>
      <div className="bg-stone-200 lg:col-span-5" style={{ borderRadius: 'var(--sf-radius-outer)' }} />
      <div className="grid grid-cols-2 lg:col-span-7" style={{ gap: 'var(--sf-space-md)' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-stone-200" style={{ borderRadius: 'var(--sf-radius-card-inner)' }} />
        ))}
      </div>
    </div>
  );
}
