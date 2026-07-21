import { useLayoutEffect } from 'react';
import { useCheckoutTransitionStore } from '../store/checkout-transition.store';
import { pinLockedPageToTop } from './useBodyScrollLock';

export function useCheckoutTransitionReady(path: string, ready: boolean) {
  const targetPath = useCheckoutTransitionStore((state) => state.targetPath);
  const markReady = useCheckoutTransitionStore((state) => state.markReady);

  useLayoutEffect(() => {
    if (targetPath !== path) return;

    pinLockedPageToTop();
  }, [path, targetPath]);

  useLayoutEffect(() => {
    if (targetPath !== path || !ready) return;

    markReady(path);
  }, [markReady, path, ready, targetPath]);
}
