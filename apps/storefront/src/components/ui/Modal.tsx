"use client";

import React, { useEffect, useRef } from 'react';
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
  eyebrow?: string;
  icon?: LucideIcon;
  variant?: 'brand' | 'danger' | 'success';
  width?: 'compact' | 'standard' | 'wide';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  showDefaultActions?: boolean;
  children?: React.ReactNode;
  dismissible?: boolean;
}

export function StorefrontModal({
  isOpen,
  onClose,
  title,
  description,
  eyebrow,
  icon = AlertCircle,
  variant = 'brand',
  width = 'standard',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  showDefaultActions = true,
  children,
  dismissible = true,
}: StorefrontModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const frame = requestAnimationFrame(() => {
        (dismissible ? closeButtonRef.current : dialogRef.current)?.focus();
      });
      return () => {
        cancelAnimationFrame(frame);
        document.body.style.overflow = previousOverflow;
        previousFocusRef.current?.focus();
      };
    }
  }, [dismissible, isOpen]);

  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismissible, isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissible ? onClose : undefined}
          className="absolute inset-0 backdrop-blur-md"
          style={{ background: 'var(--sf-modal-backdrop)' }}
        />

        {/* Modal Card */}
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="storefront-modal-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 32 }}
          transition={{ 
            duration: 0.5, 
            ease: [0.16, 1, 0.3, 1] // sf-ease-reveal
          }}
          className="relative w-full overflow-hidden bg-white shadow-2xl"
          style={{
            maxWidth:
              width === 'compact'
                ? 'var(--sf-width-modal-compact)'
                : width === 'wide'
                  ? 'var(--sf-width-modal-wide)'
                  : 'var(--sf-width-modal-standard)',
            borderTopLeftRadius: 'var(--sf-radius-outer)',
            borderTopRightRadius: 'var(--sf-radius-outer)',
            borderBottomLeftRadius: 'clamp(0rem, 4vw, var(--sf-radius-outer))',
            borderBottomRightRadius: 'clamp(0rem, 4vw, var(--sf-radius-outer))',
          }}
        >
          {/* Header Area */}
          <div style={{ padding: 'var(--sf-padding-inner)', paddingBottom: 'var(--sf-space-sm)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-6">
                <StorefrontIcon 
                  icon={icon} 
                  variant={variant === 'danger' ? 'warning' : variant} 
                  context="section"
                  className={variant === 'danger' ? 'bg-red-50 text-red-500 border-red-100 shadow-none' : ''}
                />
                <div className="space-y-2">
                  {eyebrow && <p className="sf-text-label uppercase text-brand-600">{eyebrow}</p>}
                  <h2 id="storefront-modal-title" className="sf-text-h1 tracking-tight text-stone-850 leading-none">{title}</h2>
                  {description && (
                    <p className="sf-text-body text-stone-500 font-medium">{description}</p>
                  )}
                </div>
              </div>
              {dismissible && (
                <Button
                  ref={closeButtonRef}
                  type="button"
                  variant="outline"
                  size="icon"
                  context="section"
                  icon={X}
                  isIconOnly
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="shrink-0 border-stone-200 bg-stone-50 text-stone-600 shadow-none hover:bg-stone-100"
                />
              )}
            </div>
          </div>

          {/* Content Area */}
          <div style={{ paddingInline: 'var(--sf-padding-inner)', paddingBlock: 'var(--sf-space-md)' }}>
            {children}
          </div>

          {/* Footer Actions */}
          {showDefaultActions && (
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)', padding: 'var(--sf-padding-inner)', paddingTop: 'var(--sf-space-sm)' }}>
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
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
