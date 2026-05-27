"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { StorefrontIcon } from './Icon';

interface StorefrontModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: 'brand' | 'danger' | 'success';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  children?: React.ReactNode;
}

export function StorefrontModal({
  isOpen,
  onClose,
  title,
  description,
  icon = AlertCircle,
  variant = 'brand',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  children
}: StorefrontModalProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/40 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 32 }}
          transition={{ 
            duration: 0.5, 
            ease: [0.16, 1, 0.3, 1] // sf-ease-reveal
          }}
          className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl"
          style={{ borderRadius: 'var(--sf-radius-outer)' }}
        >
          {/* Header Area */}
          <div className="p-8 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-6">
                <StorefrontIcon 
                  icon={icon} 
                  variant={variant === 'danger' ? 'warning' : variant} 
                  context="section"
                  className={variant === 'danger' ? 'bg-red-50 text-red-500 border-red-100 shadow-none' : ''}
                />
                <div className="space-y-2">
                  <h2 className="sf-text-h1 uppercase tracking-tight text-stone-850 leading-none">{title}</h2>
                  {description && (
                    <p className="sf-text-body text-stone-500 font-medium">{description}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="px-8 py-4">
            {children}
          </div>

          {/* Footer Actions */}
          <div className="p-8 pt-4 flex flex-col gap-3">
            {onConfirm && (
              <Button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                variant={variant === 'danger' ? 'danger' : 'primary'}
                context="section"
                className="w-full h-16"
              >
                {confirmLabel}
              </Button>
            )}
            <Button 
              onClick={onClose}
              variant="outline"
              context="section"
              className="w-full h-16 border-stone-100 text-stone-400 hover:bg-stone-50"
            >
              {cancelLabel}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
