"use client";

import { useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LucideIcon, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  STOREFRONT_EASING,
  STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS,
  toMotionSeconds,
} from '../../lib/motion';
import { Button } from './Button';
import { StorefrontIcon } from './Icon';
import {
  StorefrontTemporarySurfaceHeaderItem,
  StorefrontTemporarySurfaceItem,
} from './TemporarySurfaceMotion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  iconVariant?: 'brand' | 'muted' | 'dark' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  eyebrow,
  icon,
  iconVariant = 'brand',
  children,
  footer,
  dismissible = true,
}: BottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(isOpen);

  const panelVariants = reduceMotion
    ? {
        closed: { opacity: 0 },
        open: {
          opacity: 1,
          transition: {
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs),
          },
        },
        exit: {
          opacity: 0,
          transition: {
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs),
          },
        },
      }
    : {
        closed: { y: '100%' },
        open: {
          y: 0,
          transition: {
            delay: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.panelEnterDelayMs),
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.panelEnterDurationMs),
            ease: STOREFRONT_EASING.reveal,
          },
        },
        exit: {
          y: '100%',
          transition: {
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.panelExitDurationMs),
            ease: STOREFRONT_EASING.standard,
          },
        },
      };
  const backdropVariants = {
    closed: { opacity: 0 },
    open: {
      opacity: 1,
      transition: {
        duration: toMotionSeconds(
          reduceMotion
            ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
            : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.backdropEnterDurationMs,
        ),
        ease: STOREFRONT_EASING.standard,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        delay: reduceMotion
          ? 0
          : toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.backdropExitDelayMs),
        duration: toMotionSeconds(
          reduceMotion
            ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
            : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.backdropExitDurationMs,
        ),
        ease: STOREFRONT_EASING.standard,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="exit"
            onClick={dismissible ? onClose : undefined}
            className="fixed inset-0 z-50 backdrop-blur-sm"
            style={{ background: 'var(--sf-bottom-sheet-backdrop)' }}
          />

          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Panel'}
            tabIndex={-1}
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="exit"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white border-t border-stone-200/80 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-hidden"
            style={{ borderTopLeftRadius: 'var(--sf-radius-outer)', borderTopRightRadius: 'var(--sf-radius-outer)' }}
          >
            <div
              className="flex shrink-0 flex-col items-center border-b border-stone-100"
              style={{
                paddingTop: 'var(--sf-space-md)',
                paddingBottom: 'var(--sf-padding-inner)',
                gap: 'var(--sf-space-sm)',
              }}
            >
              <div className="h-1.5 w-12 rounded-full bg-stone-200" />
              
              <div className="w-full flex items-center justify-between" style={{ paddingInline: 'var(--sf-inset-page-mobile)' }}>
                {title ? (
                  <StorefrontTemporarySurfaceHeaderItem
                    part="identity"
                    className="flex min-w-0 items-center"
                    style={{ gap: 'var(--sf-space-md)' }}
                  >
                    {icon && <StorefrontIcon icon={icon} context="section" variant={iconVariant} />}
                    <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                      {eyebrow && <p className="sf-text-label text-brand-600">{eyebrow}</p>}
                      <h3 className="sf-text-h2 text-stone-950">{title}</h3>
                    </div>
                  </StorefrontTemporarySurfaceHeaderItem>
                ) : (
                  <div />
                )}
                {dismissible && (
                  <StorefrontTemporarySurfaceHeaderItem part="close" className="shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      context="section"
                      icon={X}
                      isIconOnly
                      onClick={onClose}
                      aria-label="Cerrar"
                      className="border-stone-200 bg-stone-50 text-stone-600 shadow-none hover:bg-stone-100"
                    />
                  </StorefrontTemporarySurfaceHeaderItem>
                )}
              </div>
            </div>

            <StorefrontTemporarySurfaceItem
              phase="content"
              className="min-h-0 flex-1 overflow-y-auto"
              style={{
                paddingInline: 'var(--sf-inset-page-mobile)',
                paddingBlock: 'var(--sf-padding-inner)',
                paddingBottom: footer
                  ? 'var(--sf-padding-inner)'
                  : 'var(--sf-inset-mobile-chrome-block)',
              }}
            >
              {children}
            </StorefrontTemporarySurfaceItem>

            {footer && (
              <StorefrontTemporarySurfaceItem
                phase="footer"
                className="shrink-0 border-t border-stone-100"
                style={{
                  paddingInline: 'var(--sf-inset-page-mobile)',
                  paddingTop: 'var(--sf-padding-inner)',
                  paddingBottom: 'var(--sf-inset-mobile-chrome-block)',
                }}
              >
                {footer}
              </StorefrontTemporarySurfaceItem>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
