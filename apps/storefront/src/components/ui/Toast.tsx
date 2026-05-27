"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StorefrontIcon } from './Icon';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function StorefrontToast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle, variant: 'success' as const },
    error: { icon: AlertCircle, variant: 'warning' as const }, // Usamos warning para rojo en Icon.tsx
    info: { icon: Info, variant: 'brand' as const },
  };

  const { icon, variant } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.16, 1, 0.3, 1] // sf-ease-reveal
      }}
      className={cn(
        'fixed bottom-10 left-1/2 z-[120] -translate-x-1/2 flex min-w-[340px] max-w-[90vw] items-center gap-4 border bg-white/90 p-3 pr-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-500',
        type === 'error' ? 'border-red-100' : 'border-stone-100'
      )}
      style={{ 
        borderRadius: 'var(--sf-radius-inner)',
      }}
    >
      <StorefrontIcon 
        icon={icon} 
        variant={variant} 
        context="card"
        className={cn(
          "shadow-none",
          type === 'error' ? 'bg-red-50 text-red-500 border-red-100' : ''
        )}
      />
      
      <div className="flex-1 min-w-0">
        <p className="sf-text-label normal-case tracking-normal text-stone-850 font-black leading-tight">
          {message}
        </p>
      </div>

      <button 
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-300 hover:text-stone-500 transition-colors"
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      {/* Progress Bar Decorator */}
      <motion.div 
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: "linear" }}
        className={cn(
          "absolute bottom-0 left-6 right-6 h-[2px] origin-left rounded-full opacity-20",
          type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-brand-500'
        )}
      />
    </motion.div>
  );
}
