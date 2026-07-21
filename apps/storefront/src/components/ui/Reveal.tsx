"use client";

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  STOREFRONT_EASING,
  STOREFRONT_REVEAL_CADENCE,
  type StorefrontRevealCadence,
  toMotionSeconds,
} from "../../lib/motion";

type StorefrontRevealProps = {
  children: ReactNode;
  className?: string;
  cadence?: StorefrontRevealCadence;
  delayMs?: number;
  durationMs?: number;
  distance?: number;
  amount?: number;
};

type StorefrontRevealGroupProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  cadence?: StorefrontRevealCadence;
  delayMs?: number;
  staggerMs?: number;
  amount?: number;
};

type StorefrontRevealItemProps = {
  children: ReactNode;
  className?: string;
  cadence?: StorefrontRevealCadence;
  distance?: number;
  durationMs?: number;
};

const StorefrontRevealCadenceContext =
  createContext<StorefrontRevealCadence>("standard");

export function StorefrontReveal({
  children,
  className,
  cadence,
  delayMs,
  durationMs,
  distance,
  amount,
}: StorefrontRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const inheritedCadence = useContext(StorefrontRevealCadenceContext);
  const resolvedCadence = cadence ?? inheritedCadence;
  const preset = STOREFRONT_REVEAL_CADENCE[resolvedCadence];
  const resolvedDelayMs = delayMs ?? preset.delayMs;
  const resolvedDurationMs = durationMs ?? preset.durationMs;
  const resolvedDistance = distance ?? preset.distance;
  const resolvedAmount = amount ?? preset.amount;

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: resolvedDistance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: resolvedAmount }}
      transition={{
        duration: prefersReducedMotion ? 0 : toMotionSeconds(resolvedDurationMs),
        delay: prefersReducedMotion ? 0 : toMotionSeconds(resolvedDelayMs),
        ease: STOREFRONT_EASING.reveal,
      }}
    >
      <StorefrontRevealCadenceContext.Provider value={resolvedCadence}>
        {children}
      </StorefrontRevealCadenceContext.Provider>
    </motion.div>
  );
}

export function StorefrontRevealGroup({
  children,
  className,
  style,
  cadence,
  delayMs,
  staggerMs,
  amount,
}: StorefrontRevealGroupProps) {
  const prefersReducedMotion = useReducedMotion();
  const inheritedCadence = useContext(StorefrontRevealCadenceContext);
  const resolvedCadence = cadence ?? inheritedCadence;
  const preset = STOREFRONT_REVEAL_CADENCE[resolvedCadence];
  const resolvedDelayMs = delayMs ?? preset.delayMs;
  const resolvedStaggerMs = staggerMs ?? preset.staggerMs;
  const resolvedAmount = amount ?? preset.amount;

  return (
    <motion.div
      className={className}
      style={style}
      initial={prefersReducedMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: resolvedAmount }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: prefersReducedMotion ? 0 : toMotionSeconds(resolvedDelayMs),
            staggerChildren: prefersReducedMotion ? 0 : toMotionSeconds(resolvedStaggerMs),
          },
        },
      }}
    >
      <StorefrontRevealCadenceContext.Provider value={resolvedCadence}>
        {children}
      </StorefrontRevealCadenceContext.Provider>
    </motion.div>
  );
}

export function StorefrontRevealItem({
  children,
  className,
  cadence,
  distance,
  durationMs,
}: StorefrontRevealItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const inheritedCadence = useContext(StorefrontRevealCadenceContext);
  const resolvedCadence = cadence ?? inheritedCadence;
  const preset = STOREFRONT_REVEAL_CADENCE[resolvedCadence];
  const resolvedDistance = distance ?? preset.distance;
  const resolvedDurationMs = durationMs ?? preset.durationMs;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: prefersReducedMotion ? {} : { opacity: 0, y: resolvedDistance },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: prefersReducedMotion
              ? 0
              : toMotionSeconds(resolvedDurationMs),
            ease: STOREFRONT_EASING.reveal,
          },
        },
      }}
    >
      <StorefrontRevealCadenceContext.Provider value={resolvedCadence}>
        {children}
      </StorefrontRevealCadenceContext.Provider>
    </motion.div>
  );
}
