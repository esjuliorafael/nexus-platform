import { useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

let lockCount = 0;
let lockedScrollY = 0;
let lockedSourceScrollY = 0;
let previousBodyStyles: Pick<CSSStyleDeclaration, 'position' | 'top' | 'left' | 'right' | 'width' | 'overflow' | 'paddingRight'> | null = null;

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

  useIsomorphicLayoutEffect(() => {
    if (!locked || typeof window === 'undefined') return;

    const body = document.body;

    if (lockCount === 0) {
      const root = document.documentElement;
      const widthBeforeLock = root.clientWidth;
      const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      lockedScrollY = window.scrollY;
      lockedSourceScrollY = lockedScrollY;
      previousBodyStyles = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      };

      body.style.position = 'fixed';
      body.style.top = `-${lockedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';

      // CSS preserves the gutter in modern browsers. Compensate only when
      // locking still changes the layout viewport.
      const releasedScrollbarWidth = root.clientWidth - widthBeforeLock;
      if (releasedScrollbarWidth > 0) {
        body.style.paddingRight = `${computedPaddingRight + releasedScrollbarWidth}px`;
      }
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
