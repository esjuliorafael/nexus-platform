import { Children, type ReactNode, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import {
  STOREFRONT_CHECKOUT_SEQUENCE_MS,
  STOREFRONT_EASING,
  toMotionSeconds,
} from '../../lib/motion';
import { StorefrontIcon } from './Icon';

interface StorefrontCheckoutSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  motionKey?: string | number;
  motionReady?: boolean;
  motionDelayMs?: number;
}

export function StorefrontCheckoutSection({
  title,
  icon,
  children,
  motionKey = 'static',
  motionReady = true,
  motionDelayMs = STOREFRONT_CHECKOUT_SEQUENCE_MS.stepHeaderDelayMs,
}: StorefrontCheckoutSectionProps) {
  const reduceMotion = useReducedMotion();
  const controls = useAnimationControls();

  useEffect(() => {
    if (reduceMotion) {
      controls.set('visible');
      return;
    }

    if (!motionReady) {
      controls.set('hidden');
      return;
    }

    controls.set('hidden');
    void controls.start('visible');
  }, [controls, motionKey, motionReady, reduceMotion]);

  const itemVariants = {
    hidden: reduceMotion ? {} : { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion
          ? 0
          : toMotionSeconds(STOREFRONT_CHECKOUT_SEQUENCE_MS.stepItemDurationMs),
        ease: STOREFRONT_EASING.reveal,
      },
    },
  };

  return (
    <motion.section
      className="flex flex-col"
      style={{ gap: 'var(--sf-space-md)' }}
      initial={reduceMotion ? false : 'hidden'}
      animate={controls}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: reduceMotion
              ? 0
              : toMotionSeconds(motionDelayMs),
            staggerChildren: reduceMotion
              ? 0
              : toMotionSeconds(STOREFRONT_CHECKOUT_SEQUENCE_MS.stepItemStaggerMs),
          },
        },
      }}
    >
      <motion.div
        variants={itemVariants}
        className="flex items-center"
        style={{ gap: 'var(--sf-space-md)' }}
      >
        <StorefrontIcon icon={icon} context="section" variant="brand" />
        <h2 className="sf-text-h1 text-stone-850">{title}</h2>
      </motion.div>
      {Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.section>
  );
}
