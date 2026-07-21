import { useEffect, useRef } from 'react';

let lockCount = 0;
let lockedScrollY = 0;
let lockedSourceScrollY = 0;
let previousBodyStyles: Pick<CSSStyleDeclaration, 'position' | 'top' | 'left' | 'right' | 'width' | 'overflow'> | null = null;

export function pinLockedPageToTop() {
  if (typeof window === 'undefined' || lockCount === 0 || !previousBodyStyles) return;

  lockedScrollY = 0;
  document.body.style.top = '0px';
}

export function restoreLockedPagePosition() {
  if (typeof window === 'undefined' || lockCount === 0 || !previousBodyStyles) return;

  lockedScrollY = lockedSourceScrollY;
  document.body.style.top = `-${lockedSourceScrollY}px`;
}

/**
 * Prevents the page behind a modal drawer from scrolling, while leaving the
 * drawer's own scroll container available. The counter keeps nested overlays
 * from unlocking the document prematurely.
 */
interface BodyScrollLockOptions {
  restoreScroll?: boolean;
}

export function useBodyScrollLock(locked: boolean, { restoreScroll = true }: BodyScrollLockOptions = {}) {
  const restoreScrollRef = useRef(restoreScroll);
  restoreScrollRef.current = restoreScroll;

  useEffect(() => {
    if (!locked || typeof window === 'undefined') return;

    const body = document.body;

    if (lockCount === 0) {
      lockedScrollY = window.scrollY;
      lockedSourceScrollY = lockedScrollY;
      previousBodyStyles = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
      };

      body.style.position = 'fixed';
      body.style.top = `-${lockedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0 || !previousBodyStyles) return;

      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;

      // The storefront uses smooth scrolling globally. Restoring a locked
      // page position must be immediate or the document visibly travels from
      // the top back to its previous position when a drawer closes.
      root.style.scrollBehavior = 'auto';
      Object.assign(body.style, previousBodyStyles);
      window.scrollTo({ top: restoreScrollRef.current ? lockedSourceScrollY : lockedScrollY, left: 0, behavior: 'auto' });
      root.style.scrollBehavior = previousScrollBehavior;
      previousBodyStyles = null;
    };
  }, [locked]);
}
