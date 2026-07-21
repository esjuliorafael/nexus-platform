"use client";

import type { ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS,
  toMotionSeconds,
} from "../../lib/motion";

type TemporarySurfacePhase = "header" | "content" | "footer";
type TemporarySurfaceHeaderPart = "identity" | "close";
type TemporarySurfaceChromeEdge = "top" | "bottom";

interface StorefrontTemporarySurfaceItemProps
  extends ComponentPropsWithoutRef<typeof motion.div> {
  phase: TemporarySurfacePhase;
}

const phaseDelay = {
  header: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerDelayMs,
  content: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.contentDelayMs,
  footer: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.footerDelayMs,
} as const;

const phaseExitDelay = {
  header: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerExitDelayMs,
  content: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.contentExitDelayMs,
  footer: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.footerExitDelayMs,
} as const;

const headerPartDelay = {
  identity: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerDelayMs,
  close: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerCloseDelayMs,
} as const;

const headerPartExitDelay = {
  identity: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerExitDelayMs,
  close: STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerCloseExitDelayMs,
} as const;

export function StorefrontTemporarySurfaceItem({
  phase,
  children,
  ...props
}: StorefrontTemporarySurfaceItemProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: {
          delay: reduceMotion ? 0 : toMotionSeconds(phaseExitDelay[phase]),
          duration: toMotionSeconds(
            reduceMotion
              ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
              : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.internalExitDurationMs,
          ),
          ease: STOREFRONT_EASING.exit,
        },
      }}
      transition={{
        delay: reduceMotion ? 0 : toMotionSeconds(phaseDelay[phase]),
        duration: reduceMotion
          ? toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs)
          : toMotionSeconds(
              phase === "content"
                ? STOREFRONT_MOTION_MS.duration.deliberate
                : STOREFRONT_MOTION_MS.duration.standard,
            ),
        ease: STOREFRONT_EASING.reveal,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StorefrontTemporarySurfaceHeaderItemProps
  extends ComponentPropsWithoutRef<typeof motion.div> {
  part: TemporarySurfaceHeaderPart;
}

export function StorefrontTemporarySurfaceHeaderItem({
  part,
  children,
  ...props
}: StorefrontTemporarySurfaceHeaderItemProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: {
          delay: reduceMotion ? 0 : toMotionSeconds(headerPartExitDelay[part]),
          duration: toMotionSeconds(
            reduceMotion
              ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
              : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.internalExitDurationMs,
          ),
          ease: STOREFRONT_EASING.exit,
        },
      }}
      transition={{
        delay: reduceMotion ? 0 : toMotionSeconds(headerPartDelay[part]),
        duration: toMotionSeconds(
          reduceMotion
            ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
            : STOREFRONT_MOTION_MS.duration.standard,
        ),
        ease: STOREFRONT_EASING.reveal,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StorefrontTemporarySurfaceChromeProps
  extends ComponentPropsWithoutRef<typeof motion.div> {
  edge: TemporarySurfaceChromeEdge;
}

export function StorefrontTemporarySurfaceChrome({
  edge,
  children,
  ...props
}: StorefrontTemporarySurfaceChromeProps) {
  const reduceMotion = useReducedMotion();
  const delayMs =
    edge === "top"
      ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerDelayMs
      : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.footerDelayMs;

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: edge === "top" ? -12 : 16 }
      }
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        y: reduceMotion ? 0 : edge === "top" ? -12 : 16,
        transition: {
          delay: reduceMotion
            ? 0
            : toMotionSeconds(
                edge === "top"
                  ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.headerExitDelayMs
                  : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.footerExitDelayMs,
              ),
          duration: toMotionSeconds(
            reduceMotion
              ? STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
              : STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.chromeExitDurationMs,
          ),
          ease: STOREFRONT_EASING.exit,
        },
      }}
      transition={{
        delay: reduceMotion ? 0 : toMotionSeconds(delayMs),
        duration: reduceMotion
          ? toMotionSeconds(
              STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs,
            )
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        ease: STOREFRONT_EASING.reveal,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
