"use client";

import type { ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useCheckoutTransitionStore } from "../../store/checkout-transition.store";
import {
  STOREFRONT_CHECKOUT_SEQUENCE_MS,
  STOREFRONT_EASING,
  toMotionSeconds,
} from "../../lib/motion";

export type StorefrontCheckoutMotionPhase =
  | "chrome"
  | "intro"
  | "content"
  | "summary"
  | "actions";

interface StorefrontCheckoutMotionProps
  extends ComponentPropsWithoutRef<typeof motion.div> {
  phase: StorefrontCheckoutMotionPhase;
  ready: boolean;
}

const phaseDelay = {
  chrome: STOREFRONT_CHECKOUT_SEQUENCE_MS.chromeDelayMs,
  intro: STOREFRONT_CHECKOUT_SEQUENCE_MS.introDelayMs,
  content: STOREFRONT_CHECKOUT_SEQUENCE_MS.contentDelayMs,
  summary: STOREFRONT_CHECKOUT_SEQUENCE_MS.summaryDelayMs,
  actions: STOREFRONT_CHECKOUT_SEQUENCE_MS.actionsDelayMs,
} as const;

const phaseDistance = {
  chrome: -12,
  intro: 8,
  content: 12,
  summary: 12,
  actions: 16,
} as const;

export function useStorefrontCheckoutMotionReady(path: string) {
  const targetPath = useCheckoutTransitionStore((state) => state.targetPath);
  return targetPath !== path;
}

export function StorefrontCheckoutMotion({
  phase,
  ready,
  children,
  ...props
}: StorefrontCheckoutMotionProps) {
  const reduceMotion = useReducedMotion();
  const distance = phaseDistance[phase];

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: distance }}
      animate={
        ready
          ? { opacity: 1, y: 0 }
          : reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: distance }
      }
      transition={{
        delay:
          ready && !reduceMotion ? toMotionSeconds(phaseDelay[phase]) : 0,
        duration: toMotionSeconds(
          reduceMotion
            ? STOREFRONT_CHECKOUT_SEQUENCE_MS.reducedDurationMs
            : STOREFRONT_CHECKOUT_SEQUENCE_MS.durationMs,
        ),
        ease: STOREFRONT_EASING.reveal,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
