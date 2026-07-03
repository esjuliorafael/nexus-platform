"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StorefrontIcon } from './Icon';
import { StorefrontAutonomousCard } from './Card';
import type { ToastAction } from '../../store/toast.store';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  title?: string | null;
  message: string;
  type: ToastType;
  action?: ToastAction | null;
  durationMs?: number;
  onClose: () => void;
}

export function StorefrontToast({
  title,
  message,
  type,
  action,
  durationMs = 4000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  const config = {
    success: { icon: CheckCircle, variant: 'success' as const },
    error: { icon: AlertCircle, variant: 'error' as const },
    info: { icon: Info, variant: 'brand' as const },
  };

  const { icon, variant } = config[type];

  return (
    <StorefrontAutonomousCard
      as={motion.div}
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] // sf-ease-reveal
      }}
      className={cn(
        'fixed bottom-[calc(var(--sf-inset-mobile-chrome-block)+var(--sf-h-mobile-nav)+var(--sf-space-mobile-chrome-before))] left-[var(--sf-inset-mobile-chrome)] right-[var(--sf-inset-mobile-chrome)] z-[120] flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl md:bottom-[var(--sf-space-xl)] md:left-auto md:right-[var(--sf-space-xl)] md:w-[380px]',
        type === 'success'
          ? 'border-emerald-100 bg-emerald-50/95'
          : type === 'error'
            ? 'border-red-100 bg-red-50/95'
            : 'border-stone-100 bg-white/95'
      )}
      density="compact"
      disableTransition
    >
      <StorefrontIcon 
        icon={icon} 
        variant={variant} 
        context="autonomous"
        className={cn(
          "shadow-none",
          type === 'error' ? 'bg-red-50 text-red-500 border-red-100' : ''
        )}
      />
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className="sf-text-label text-stone-850">
            {title}
          </p>
        )}
        <p className="sf-text-secondary font-medium text-stone-600">
          {message}
        </p>
        {action?.href ? (
          <Link
            href={action.href}
            onClick={() => {
              action.onClick?.();
              onClose();
            }}
            className="mt-[var(--sf-space-xs)] inline-flex sf-text-label text-brand-600 transition-colors hover:text-brand-700"
          >
            {action.label}
          </Link>
        ) : action ? (
          <button
            type="button"
            onClick={() => {
              action.onClick?.();
              onClose();
            }}
            className="mt-[var(--sf-space-xs)] inline-flex sf-text-label text-brand-600 transition-colors hover:text-brand-700"
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <button 
        onClick={onClose}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 text-stone-300 hover:text-stone-850 transition-all active:scale-90"
      >
        <X size={18} strokeWidth={2} />
      </button>
    </StorefrontAutonomousCard>
  );
}
