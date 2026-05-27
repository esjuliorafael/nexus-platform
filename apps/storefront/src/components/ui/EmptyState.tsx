"use client";

import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionText, onActionClick }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center justify-center text-center bg-white border border-stone-200/60 shadow-xl shadow-stone-100/50 max-w-lg mx-auto"
      style={{
        borderRadius: 'var(--sf-radius-outer)',
        padding: 'var(--sf-padding-outer)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <div
        className="bg-brand-50 flex items-center justify-center text-brand-500 shadow-inner"
        style={{
          width: 'var(--sf-size-icon-section)',
          height: 'var(--sf-size-icon-section)',
          borderRadius: 'var(--sf-radius-inner)',
        }}
      >
        <Icon size={36} strokeWidth={1.5} />
      </div>
      
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
        <h3 className="sf-text-h1 text-stone-800 uppercase italic">
          {title}
        </h3>
        <p className="sf-text-secondary text-stone-500 max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {actionText && onActionClick && (
        <div style={{ marginTop: 'var(--sf-space-sm)' }}>
          <Button onClick={onActionClick} context="card">
            {actionText}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
