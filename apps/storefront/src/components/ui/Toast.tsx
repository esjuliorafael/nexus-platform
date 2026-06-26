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
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle, variant: 'success' as const },
    error: { icon: AlertCircle, variant: 'error' as const },
    info: { icon: Info, variant: 'brand' as const },
  };

  const { icon, variant } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] // sf-ease-reveal
      }}
      className={cn(
        'fixed bottom-8 right-6 left-6 md:left-auto md:w-[380px] z-[120] flex items-center gap-4 border bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl p-4',
        type === 'success'
          ? 'border-emerald-100 bg-emerald-50/95'
          : type === 'error'
            ? 'border-red-100 bg-red-50/95'
            : 'border-stone-100 bg-white/95'
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
        <p className="sf-text-label normal-case tracking-tight text-stone-850 font-black leading-tight">
          {message}
        </p>
      </div>

      <button 
        onClick={onClose}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 text-stone-300 hover:text-stone-850 transition-all active:scale-90"
      >
        <X size={18} strokeWidth={2} />
      </button>
    </motion.div>
  );
}
