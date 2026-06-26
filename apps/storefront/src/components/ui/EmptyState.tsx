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
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, actionText, onActionClick, compact = false }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center justify-center text-center bg-white border border-stone-200/60 shadow-xl shadow-stone-100/50 max-w-lg mx-auto"
      style={{
        borderRadius: 'var(--sf-radius-outer)',
        padding: compact ? 'var(--sf-padding-inner)' : 'var(--sf-padding-outer)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <div
        className="bg-brand-50 flex items-center justify-center text-brand-500 shadow-inner"
        style={{
          width: compact ? 'var(--sf-size-stage-container-compact)' : 'var(--sf-size-stage-container)',
          height: compact ? 'var(--sf-size-stage-container-compact)' : 'var(--sf-size-stage-container)',
          borderRadius: 'var(--sf-radius-inner)',
        }}
      >
        <Icon
          style={{
            width: compact ? 'var(--sf-size-stage-icon-compact)' : 'var(--sf-size-stage-icon)',
            height: compact ? 'var(--sf-size-stage-icon-compact)' : 'var(--sf-size-stage-icon)',
          }}
          strokeWidth={1.5}
        />
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
