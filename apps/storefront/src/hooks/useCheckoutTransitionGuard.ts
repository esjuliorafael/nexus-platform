import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCheckoutTransitionStore } from '../store/checkout-transition.store';
import { useToastStore } from '../store/toast.store';
import { restoreLockedPagePosition } from './useBodyScrollLock';

const CHECKOUT_TRANSITION_TIMEOUT_MS = 8_000;

interface CheckoutTransitionGuardOptions {
  active: boolean;
  targetPath: string;
  onRecover: () => void;
  onUnexpectedRoute: () => void;
}

export function useCheckoutTransitionGuard({
  active,
  targetPath,
  onRecover,
  onUnexpectedRoute,
}: CheckoutTransitionGuardOptions) {
  const pathname = usePathname();
  const router = useRouter();
  const sourcePath = useCheckoutTransitionStore((state) => state.sourcePath);
  const readyPath = useCheckoutTransitionStore((state) => state.readyPath);
  const finish = useCheckoutTransitionStore((state) => state.finish);
  const showToast = useToastStore((state) => state.showToast);
  const [isRecovering, setIsRecovering] = useState(false);
  const pathnameRef = useRef(pathname);
  const reachedTargetRef = useRef(false);
  const onRecoverRef = useRef(onRecover);
  const onUnexpectedRouteRef = useRef(onUnexpectedRoute);

  pathnameRef.current = pathname;
  onRecoverRef.current = onRecover;
  onUnexpectedRouteRef.current = onUnexpectedRoute;

  const sourceRoute = sourcePath?.split(/[?#]/, 1)[0] ?? null;

  useLayoutEffect(() => {
    if (!active) reachedTargetRef.current = false;
    if (active && pathname === targetPath) reachedTargetRef.current = true;
  }, [active, pathname, targetPath]);

  useEffect(() => {
    if (!active || !sourcePath || !sourceRoute || readyPath === targetPath) return;

    const timeout = window.setTimeout(() => {
      if (pathnameRef.current === targetPath) {
        setIsRecovering(true);
        router.replace(sourcePath, { scroll: false });
        return;
      }

      router.replace(sourcePath, { scroll: false });
      restoreLockedPagePosition();
      onRecoverRef.current();
      finish();
      showToast('No pudimos abrir el checkout. Intenta nuevamente.', {
        type: 'error',
        title: 'Checkout no disponible',
      });
    }, CHECKOUT_TRANSITION_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [active, finish, readyPath, router, showToast, sourcePath, sourceRoute, targetPath]);

  useLayoutEffect(() => {
    if (!active || isRecovering || !sourceRoute || pathname !== sourceRoute || !reachedTargetRef.current) return;

    restoreLockedPagePosition();
    reachedTargetRef.current = false;
    onRecoverRef.current();
    finish();
    showToast('La navegación al checkout fue cancelada.', {
      type: 'info',
      title: 'Regresaste a la pantalla anterior',
    });
  }, [active, finish, isRecovering, pathname, showToast, sourceRoute]);

  useLayoutEffect(() => {
    if (!active || !isRecovering || !sourceRoute || pathname !== sourceRoute) return;

    restoreLockedPagePosition();
    setIsRecovering(false);
    onRecoverRef.current();
    finish();
    showToast('No pudimos abrir el checkout. Intenta nuevamente.', {
      type: 'error',
      title: 'Checkout no disponible',
    });
  }, [active, finish, isRecovering, pathname, showToast, sourceRoute]);

  useLayoutEffect(() => {
    if (!active || isRecovering || !sourceRoute) return;
    if (pathname === sourceRoute || pathname === targetPath) return;

    onUnexpectedRouteRef.current();
    finish();
    showToast('La navegación al checkout fue interrumpida.', {
      type: 'info',
      title: 'Transición cancelada',
    });
  }, [active, finish, isRecovering, pathname, showToast, sourceRoute, targetPath]);
}
