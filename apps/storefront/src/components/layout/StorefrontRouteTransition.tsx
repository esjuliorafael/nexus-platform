"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ROUTE_TRANSITION_SEQUENCE_MS,
  STOREFRONT_EASING,
  toMotionSeconds,
} from "../../lib/motion";
import { useBrandImageReady } from "../ui/BrandLogo";

type TransitionPhase = "idle" | "covering" | "holding" | "revealing";

interface TransitionTarget {
  href: string;
  pathname: string;
  label: string;
}

interface StorefrontRouteTransitionProps {
  logoUrl?: string | null;
  brandName: string;
  destinationReady?: boolean;
  onDestinationReveal?: () => void;
}

const PRIMARY_ROUTES = new Map([
  ["/", "Inicio"],
  ["/store", "Tienda"],
  ["/gallery", "Galería"],
  ["/raffles", "Rifas"],
  ["/contact", "Contacto"],
]);

const isPrimaryRoute = (pathname: string) => PRIMARY_ROUTES.has(pathname);

export function StorefrontRouteTransition({
  logoUrl,
  brandName,
  destinationReady = true,
  onDestinationReveal,
}: StorefrontRouteTransitionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const isLogoReady = useBrandImageReady(logoUrl);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [target, setTarget] = useState<TransitionTarget | null>(null);
  const phaseRef = useRef<TransitionPhase>("idle");
  const identityStartedAtRef = useRef(0);
  const navigateOnCoverRef = useRef(false);
  const hasAttemptedInitialTransitionRef = useRef(false);
  const revealTimerRef = useRef<number | null>(null);
  const contentRevealTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const previousBodyOverflowRef = useRef("");
  const previousRootOverflowRef = useRef("");

  const setTransitionPhase = (nextPhase: TransitionPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const clearTimers = () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (contentRevealTimerRef.current !== null) {
      window.clearTimeout(contentRevealTimerRef.current);
      contentRevealTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const lockViewport = () => {
    previousBodyOverflowRef.current = document.body.style.overflow;
    previousRootOverflowRef.current = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  };

  const finishTransition = () => {
    clearTimers();
    document.body.style.overflow = previousBodyOverflowRef.current;
    document.documentElement.style.overflow = previousRootOverflowRef.current;
    setTarget(null);
    setTransitionPhase("idle");
  };

  const beginDestinationReveal = () => {
    setTransitionPhase("revealing");

    const handoffDelay = reduceMotion
      ? 0
      : Math.max(
          0,
          ROUTE_TRANSITION_SEQUENCE_MS.revealDelayMs -
            ROUTE_TRANSITION_SEQUENCE_MS.handoffPreparationMs,
        );

    contentRevealTimerRef.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => onDestinationReveal?.());
    }, handoffDelay);
  };

  const beginCovering = (
    nextTarget: TransitionTarget,
    navigateToTarget: boolean,
  ) => {
    clearTimers();
    lockViewport();
    navigateOnCoverRef.current = navigateToTarget;
    setTarget(nextTarget);
    setTransitionPhase("covering");
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (hasAttemptedInitialTransitionRef.current || isMobile === null) return;

    if (!isMobile || !logoUrl || !isPrimaryRoute(pathname)) {
      hasAttemptedInitialTransitionRef.current = true;
      return;
    }

    if (!isLogoReady) return;

    hasAttemptedInitialTransitionRef.current = true;
    beginCovering(
      {
        href: pathname,
        pathname,
        label: PRIMARY_ROUTES.get(pathname) || "la sección actual",
      },
      false,
    );
  }, [isLogoReady, isMobile, logoUrl, pathname]);

  useEffect(() => {
    const handlePrimaryNavigation = (event: MouseEvent) => {
      if (isMobile === true && phaseRef.current !== "idle") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        isMobile !== true ||
        !isLogoReady ||
        !isPrimaryRoute(pathname)
      ) {
        return;
      }

      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;

      const anchor = eventTarget.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (!isPrimaryRoute(destination.pathname)) return;
      if (destination.pathname === pathname) return;

      event.preventDefault();
      event.stopPropagation();

      beginCovering(
        {
          href: `${destination.pathname}${destination.search}${destination.hash}`,
          pathname: destination.pathname,
          label:
            PRIMARY_ROUTES.get(destination.pathname) || "la nueva sección",
        },
        true,
      );
    };

    document.addEventListener("click", handlePrimaryNavigation, true);
    return () =>
      document.removeEventListener("click", handlePrimaryNavigation, true);
  }, [isLogoReady, isMobile, pathname, reduceMotion, router]);

  useEffect(() => {
    if (
      phase !== "holding" ||
      phaseRef.current !== "holding" ||
      !target ||
      !destinationReady ||
      pathname !== target.pathname
    ) {
      return;
    }

    const minimumIdentityDuration = reduceMotion
      ? ROUTE_TRANSITION_SEQUENCE_MS.reducedDurationMs
      : ROUTE_TRANSITION_SEQUENCE_MS.identityDurationMs +
        ROUTE_TRANSITION_SEQUENCE_MS.identityHoldMs;
    const elapsed = Date.now() - identityStartedAtRef.current;
    const remainingDelay = Math.max(0, minimumIdentityDuration - elapsed);

    revealTimerRef.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => beginDestinationReveal());
      });
    }, remainingDelay);

    return () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [destinationReady, pathname, phase, reduceMotion, target]);

  useEffect(() => {
    return () => {
      clearTimers();
      document.body.style.overflow = previousBodyOverflowRef.current;
      document.documentElement.style.overflow = previousRootOverflowRef.current;
    };
  }, []);

  if (phase === "idle" || !target) {
    const isPreparingInitialTransition =
      !hasAttemptedInitialTransitionRef.current &&
      isMobile !== false &&
      Boolean(logoUrl) &&
      isPrimaryRoute(pathname);

    if (!isPreparingInitialTransition) return null;

    return (
      <div
        className="pointer-events-auto fixed inset-0 z-[300] bg-stone-950 md:hidden"
        role="status"
        aria-live="polite"
        aria-label="Preparando la sección"
      />
    );
  }

  const panelDuration = reduceMotion
    ? ROUTE_TRANSITION_SEQUENCE_MS.reducedDurationMs
    : phase === "revealing"
      ? ROUTE_TRANSITION_SEQUENCE_MS.revealDurationMs
      : ROUTE_TRANSITION_SEQUENCE_MS.coverDurationMs;
  const panelDelay =
    phase === "revealing" && !reduceMotion
      ? ROUTE_TRANSITION_SEQUENCE_MS.revealDelayMs
      : 0;
  const identityDuration = reduceMotion
    ? ROUTE_TRANSITION_SEQUENCE_MS.reducedDurationMs
    : phase === "revealing"
      ? ROUTE_TRANSITION_SEQUENCE_MS.identityExitDurationMs
      : ROUTE_TRANSITION_SEQUENCE_MS.identityDurationMs;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[300] md:hidden"
      data-transition-phase={phase}
      role="status"
      aria-live="polite"
      aria-label={`Abriendo ${target.label}`}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-stone-950"
        initial={{ scaleY: navigateOnCoverRef.current ? 0 : 1 }}
        animate={{ scaleY: phase === "revealing" ? 0 : 1 }}
        transition={{
          delay: toMotionSeconds(panelDelay),
          duration: toMotionSeconds(panelDuration),
          ease: STOREFRONT_EASING.reveal,
        }}
        style={{
          originY: 0.5,
          willChange: "transform",
        }}
        onAnimationComplete={() => {
          if (phaseRef.current === "covering") {
            identityStartedAtRef.current = Date.now();
            setTransitionPhase("holding");

            if (navigateOnCoverRef.current) {
              router.push(target.href);
            }

            safetyTimerRef.current = window.setTimeout(() => {
              if (phaseRef.current !== "idle") beginDestinationReveal();
            }, ROUTE_TRANSITION_SEQUENCE_MS.maximumRouteWaitMs);
            return;
          }

          if (phaseRef.current === "revealing") {
            finishTransition();
          }
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.img
          src={logoUrl || undefined}
          alt={brandName}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
          animate={
            phase === "covering"
              ? { opacity: 0, scale: reduceMotion ? 1 : 0.94 }
              : phase === "holding"
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: reduceMotion ? 1 : 1.025 }
          }
          transition={{
            duration: toMotionSeconds(identityDuration),
            ease: STOREFRONT_EASING.reveal,
          }}
          className="relative z-10 max-h-[7rem] max-w-[min(42vw,10rem)] object-contain"
          style={{
            willChange: "transform, opacity",
          }}
        />
      </div>

      <span className="sr-only">Cambiando de sección</span>
    </div>
  );
}
