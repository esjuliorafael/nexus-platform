import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  STOREFRONT_EASING,
  STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS,
  toMotionSeconds,
} from '../../lib/motion';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface StorefrontDrawerDialogProps {
  open: boolean;
  label: string;
  children: ReactNode;
  onRequestClose: () => void;
  onExitComplete?: () => void;
  closeDisabled?: boolean;
  restoreFocus?: boolean;
  returnFocusSelector?: string;
  busy?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function StorefrontDrawerDialog({
  open,
  label,
  children,
  onRequestClose,
  onExitComplete,
  closeDisabled = false,
  restoreFocus = true,
  returnFocusSelector,
  busy = false,
  className = '',
  style,
}: StorefrontDrawerDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLElement>(null);
  const [focusActive, setFocusActive] = useState(open);

  useLayoutEffect(() => {
    if (open) setFocusActive(true);
  }, [open]);

  useDrawerFocus({
    active: focusActive,
    dialogRef,
    onRequestClose,
    closeDisabled: closeDisabled || !open,
    restoreFocus,
    returnFocusSelector,
  });

  const panelVariants = reduceMotion
    ? {
        closed: { opacity: 0 },
        open: {
          opacity: 1,
          transition: {
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs),
            ease: STOREFRONT_EASING.standard,
          },
        },
        exit: {
          opacity: 0,
          transition: {
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.reducedDurationMs),
            ease: STOREFRONT_EASING.standard,
          },
        },
      }
    : {
        closed: { x: '100%' },
        open: {
          x: 0,
          transition: {
            delay: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.panelEnterDelayMs),
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.panelEnterDurationMs),
            ease: STOREFRONT_EASING.reveal,
          },
        },
        exit: {
          x: '100%',
          transition: {
            duration: toMotionSeconds(STOREFRONT_TEMPORARY_SURFACE_SEQUENCE_MS.panelExitDurationMs),
            ease: STOREFRONT_EASING.exit,
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
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            aria-hidden="true"
            data-testid="storefront-drawer-backdrop"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="exit"
            onClick={() => {
              if (!closeDisabled) onRequestClose();
            }}
            className="fixed inset-0 z-50 cursor-default backdrop-blur-sm"
            style={{ background: 'var(--sf-drawer-backdrop)' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence
        onExitComplete={() => {
          setFocusActive(false);
          onExitComplete?.();
        }}
      >
        {open && (
          <motion.aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            aria-busy={busy || undefined}
            data-testid="storefront-drawer"
            data-reduced-motion={reduceMotion ? 'true' : 'false'}
            tabIndex={-1}
            className={`fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col overflow-hidden bg-white shadow-2xl outline-none sm:max-w-[var(--sf-width-drawer-standard)] sm:rounded-l-[var(--sf-radius-outer)] ${className}`}
            style={style}
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="exit"
          >
            {children}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

interface DrawerFocusOptions {
  active: boolean;
  dialogRef: React.RefObject<HTMLElement>;
  onRequestClose: () => void;
  closeDisabled: boolean;
  restoreFocus: boolean;
  returnFocusSelector?: string;
}

function useDrawerFocus({ active, dialogRef, onRequestClose, closeDisabled, restoreFocus, returnFocusSelector }: DrawerFocusOptions) {
  const openerRef = useRef<HTMLElement | null>(null);
  const openerIdentityRef = useRef<OpenerIdentity | null>(null);
  const onRequestCloseRef = useRef(onRequestClose);
  const closeDisabledRef = useRef(closeDisabled);
  const restoreFocusRef = useRef(restoreFocus);

  onRequestCloseRef.current = onRequestClose;
  closeDisabledRef.current = closeDisabled;
  restoreFocusRef.current = restoreFocus;

  useLayoutEffect(() => {
    if (!active) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const interactionOwner = activeElement?.closest<HTMLElement>('button, a[href], input, select, textarea, [role="button"]');
    openerRef.current = activeElement && activeElement !== document.body && activeElement !== document.documentElement
      ? interactionOwner ?? activeElement
      : null;
    openerIdentityRef.current = getOpenerIdentity(openerRef.current);

    const focusInitialControl = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(dialog);
      (focusable[0] ?? dialog).focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (closeDisabledRef.current) return;
        event.preventDefault();
        onRequestCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

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

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusInitialControl);
      document.removeEventListener('keydown', handleKeyDown);

      const opener = openerRef.current;
      if (restoreFocusRef.current) {
        window.requestAnimationFrame(() => {
          const focusTarget = opener?.isConnected
            ? opener
            : findReplacementOpener(openerIdentityRef.current) ?? findVisibleElement(returnFocusSelector);
          focusTarget?.focus({ preventScroll: true });
        });
      }
    };
  }, [active, dialogRef]);
}

function findVisibleElement(selector?: string) {
  if (!selector) return null;

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => (
    element.getClientRects().length > 0 && !element.hasAttribute('disabled')
  )) ?? null;
}

interface OpenerIdentity {
  id: string | null;
  testId: string | null;
  ariaLabel: string | null;
}

function getOpenerIdentity(opener: HTMLElement | null): OpenerIdentity | null {
  if (!opener) return null;

  return {
    id: opener.id || null,
    testId: opener.getAttribute('data-testid'),
    ariaLabel: opener.getAttribute('aria-label'),
  };
}

function findReplacementOpener(identity: OpenerIdentity | null) {
  if (!identity) return null;
  if (identity.id) return document.getElementById(identity.id);

  const selector = identity.testId
    ? `[data-testid="${CSS.escape(identity.testId)}"]`
    : identity.ariaLabel
      ? `[aria-label="${CSS.escape(identity.ariaLabel)}"]`
      : null;

  if (!selector) return null;

  return findVisibleElement(selector);
}

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    return element.getClientRects().length > 0;
  });
}
