import React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import {
  ADMIN_EASING,
  ADMIN_MOTION_MS,
  ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS,
  toMotionSeconds,
} from "../../lib/motion";
import { useModalScrollLock } from "./useModalScrollLock";

type NexusSurfacePhase = "header" | "content" | "footer";
type NexusSurfaceHeaderPart = "identity" | "close";
type NexusSurfacePresentation = "drawer" | "sheet" | "modal";

interface NexusTemporarySurfaceProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  label?: string;
  zIndex?: number;
  desktopPresentation: NexusSurfacePresentation;
  mobilePresentation: NexusSurfacePresentation;
  containerClassName: string;
  panelClassName: string;
  panelStyle?: React.CSSProperties;
  dismissible?: boolean;
  closeDisabled?: boolean;
  busy?: boolean;
  desktopMediaQuery?: string;
  onAfterClose?: () => void;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const NexusTemporarySurfaceContext = React.createContext<{
  isOpen: boolean;
} | null>(null);
const NexusSurfacePhaseContext = React.createContext<NexusSurfacePhase | null>(
  null,
);

export const useNexusTemporarySurfaceContext = () =>
  React.useContext(NexusTemporarySurfaceContext) !== null;

const useNexusTemporarySurfaceState = () =>
  React.useContext(NexusTemporarySurfaceContext);

export const useNexusSurfacePhase = () =>
  React.useContext(NexusSurfacePhaseContext);

export const NexusTemporarySurface: React.FC<NexusTemporarySurfaceProps> = ({
  isOpen,
  onClose,
  children,
  role = "dialog",
  labelledBy,
  label,
  zIndex = 100,
  desktopPresentation,
  mobilePresentation,
  containerClassName,
  panelClassName,
  panelStyle,
  dismissible = true,
  closeDisabled = false,
  busy = false,
  desktopMediaQuery = "(min-width: 640px)",
  onAfterClose,
}) => {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const presentation = isDesktop ? desktopPresentation : mobilePresentation;
  const [hasPresence, setHasPresence] = React.useState(isOpen);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (isOpen) setHasPresence(true);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen || !hasPresence) return;

    const exitTimer = window.setTimeout(
      () => {
        setHasPresence(false);
        onAfterClose?.();
      },
      reduceMotion
        ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
        : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.totalExitDurationMs,
    );
    return () => window.clearTimeout(exitTimer);
  }, [hasPresence, isOpen, onAfterClose, reduceMotion]);

  useModalScrollLock(hasPresence);
  useDialogFocus({
    active: hasPresence,
    dialogRef,
    onClose,
    closeDisabled: closeDisabled || !isOpen,
  });

  if (!hasPresence) return null;

  const panelMotion = getPanelMotion(presentation, reduceMotion);
  const backdropMotion = getBackdropMotion(reduceMotion);

  return createPortal(
    <motion.div
      data-nexus-surface-root="true"
      data-reduced-motion={reduceMotion ? "true" : "false"}
      data-surface-open={isOpen ? "true" : "false"}
      data-exit-duration={
        reduceMotion
          ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
          : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.totalExitDurationMs
      }
      className={`fixed inset-0 min-h-0 overflow-hidden ${containerClassName}`}
      style={{ zIndex }}
      initial={{ opacity: 1 }}
      animate={{
        opacity: isOpen ? 1 : 0.999,
        transition: {
          duration: toMotionSeconds(
            isOpen
              ? 0
              : reduceMotion
                ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
                : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.totalExitDurationMs,
          ),
        },
      }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundColor: "var(--modal-backdrop)" }}
        initial={backdropMotion.initial}
        animate={isOpen ? backdropMotion.animate : backdropMotion.exit}
        onClick={isOpen && dismissible && !closeDisabled ? onClose : undefined}
      />

      <motion.div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        aria-busy={busy || undefined}
        tabIndex={-1}
        className={`nexus-temporary-surface relative outline-none ${panelClassName}`}
        style={panelStyle}
        initial={panelMotion.initial}
        animate={isOpen ? panelMotion.animate : panelMotion.exit}
      >
        <NexusTemporarySurfaceContext.Provider value={{ isOpen }}>
          {children}
        </NexusTemporarySurfaceContext.Provider>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

interface NexusSurfaceItemProps extends HTMLMotionProps<"div"> {
  phase: NexusSurfacePhase;
  spatialMotion?: boolean;
}

const phaseDelay = {
  header: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.headerDelayMs,
  content: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.contentDelayMs,
  footer: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.footerDelayMs,
} as const;

const phaseExitDelay = {
  header: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.headerExitDelayMs,
  content: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.contentExitDelayMs,
  footer: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.footerExitDelayMs,
} as const;

export const NexusSurfaceItem: React.FC<NexusSurfaceItemProps> = ({
  phase,
  spatialMotion = true,
  children,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const surfaceState = useNexusTemporarySurfaceState();
  const isOpen = surfaceState?.isOpen ?? true;

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: spatialMotion ? (phase === "footer" ? 8 : 6) : 0,
            }
      }
      animate={
        isOpen
          ? {
              opacity: 1,
              y: 0,
              transition: {
                delay: reduceMotion ? 0 : toMotionSeconds(phaseDelay[phase]),
                duration: toMotionSeconds(
                  reduceMotion
                    ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
                    : ADMIN_MOTION_MS.duration.standard,
                ),
                ease: ADMIN_EASING.reveal,
              },
            }
          : {
              opacity: 0,
              y:
                reduceMotion || !spatialMotion
                  ? 0
                  : phase === "footer"
                    ? 6
                    : 4,
              transition: {
                delay: reduceMotion
                  ? 0
                  : toMotionSeconds(phaseExitDelay[phase]),
                duration: toMotionSeconds(
                  reduceMotion
                    ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
                    : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.internalExitDurationMs,
                ),
                ease: ADMIN_EASING.exit,
              },
            }
      }
      {...props}
    >
      <NexusSurfacePhaseContext.Provider value={phase}>
        {children}
      </NexusSurfacePhaseContext.Provider>
    </motion.div>
  );
};

interface NexusSurfaceHeaderItemProps extends HTMLMotionProps<"div"> {
  part: NexusSurfaceHeaderPart;
}

const headerDelay = {
  identity: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.headerDelayMs,
  close: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.headerCloseDelayMs,
} as const;

const headerExitDelay = {
  identity: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.headerExitDelayMs,
  close: ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.headerCloseExitDelayMs,
} as const;

export const NexusSurfaceHeaderItem: React.FC<NexusSurfaceHeaderItemProps> = ({
  part,
  children,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const surfaceState = useNexusTemporarySurfaceState();
  const isOpen = surfaceState?.isOpen ?? true;

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              x: part === "identity" ? -8 : 0,
              scale: part === "close" ? 0.96 : 1,
            }
      }
      animate={
        isOpen
          ? {
              opacity: 1,
              x: 0,
              scale: 1,
              transition: {
                delay: reduceMotion ? 0 : toMotionSeconds(headerDelay[part]),
                duration: toMotionSeconds(
                  reduceMotion
                    ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
                    : ADMIN_MOTION_MS.duration.standard,
                ),
                ease: ADMIN_EASING.reveal,
              },
            }
          : {
              opacity: 0,
              x: reduceMotion || part === "close" ? 0 : -6,
              scale: reduceMotion || part === "identity" ? 1 : 0.96,
              transition: {
                delay: reduceMotion
                  ? 0
                  : toMotionSeconds(headerExitDelay[part]),
                duration: toMotionSeconds(
                  reduceMotion
                    ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
                    : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.internalExitDurationMs,
                ),
                ease: ADMIN_EASING.exit,
              },
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};

function getPanelMotion(
  presentation: NexusSurfacePresentation,
  reduceMotion: boolean | null,
) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          duration: toMotionSeconds(
            ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs,
          ),
        },
      },
      exit: {
        opacity: 0,
        transition: {
          duration: toMotionSeconds(
            ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs,
          ),
        },
      },
    };
  }

  const spatialInitial =
    presentation === "drawer"
      ? { x: "100%" }
      : presentation === "sheet"
        ? { y: "100%" }
        : { y: 12, scale: 0.97, opacity: 0 };
  const spatialExit =
    presentation === "drawer"
      ? { x: "100%" }
      : presentation === "sheet"
        ? { y: "100%" }
        : { y: 8, scale: 0.98, opacity: 0 };

  return {
    initial: spatialInitial,
    animate: {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      transition: {
        delay: toMotionSeconds(
          ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.panelEnterDelayMs,
        ),
        duration: toMotionSeconds(
          ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.panelEnterDurationMs,
        ),
        ease: ADMIN_EASING.reveal,
      },
    },
    exit: {
      ...spatialExit,
      transition: {
        delay: toMotionSeconds(
          ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.panelExitDelayMs,
        ),
        duration: toMotionSeconds(
          ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.panelExitDurationMs,
        ),
        ease: ADMIN_EASING.exit,
      },
    },
  };
}

function getBackdropMotion(reduceMotion: boolean | null) {
  return {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: toMotionSeconds(
          reduceMotion
            ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
            : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.backdropEnterDurationMs,
        ),
        ease: ADMIN_EASING.standard,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        delay: reduceMotion
          ? 0
          : toMotionSeconds(
              ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.backdropExitDelayMs,
            ),
        duration: toMotionSeconds(
          reduceMotion
            ? ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs
            : ADMIN_TEMPORARY_SURFACE_SEQUENCE_MS.backdropExitDurationMs,
        ),
        ease: ADMIN_EASING.standard,
      },
    },
  };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);
    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);
    return () => mediaQuery.removeEventListener("change", updateMatches);
  }, [query]);

  return matches;
}

function useDialogFocus({
  active,
  dialogRef,
  onClose,
  closeDisabled,
}: {
  active: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  closeDisabled: boolean;
}) {
  const openerRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  const closeDisabledRef = React.useRef(closeDisabled);

  onCloseRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  React.useLayoutEffect(() => {
    if (!active) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    openerRef.current =
      activeElement &&
      activeElement !== document.body &&
      activeElement !== document.documentElement
        ? activeElement
        : null;

    const focusFrame = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(dialog);
      (focusable[0] ?? dialog).focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (closeDisabledRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (!dialog.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      const opener = openerRef.current;
      window.requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      });
    };
  }, [active, dialogRef]);
}

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}
