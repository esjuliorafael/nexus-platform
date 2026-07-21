import { useEffect, useLayoutEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { StorefrontIcon } from '../ui/Icon';
import { StorefrontPurchaseBar } from '../ui/PurchaseBar';
import { CouponRedemption } from './CouponRedemption';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useCheckoutTransitionStore } from '../../store/checkout-transition.store';
import { useCheckoutTransitionGuard } from '../../hooks/useCheckoutTransitionGuard';
import { StorefrontDrawerDialog } from '../ui/DrawerDialog';
import { StorefrontDrawerHeader } from '../ui/DrawerHeader';
import {
  StorefrontTemporarySurfaceChrome,
  StorefrontTemporarySurfaceHeaderItem,
  StorefrontTemporarySurfaceItem,
} from '../ui/TemporarySurfaceMotion';

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, getDiscountTotal, getCartTotalAfterDiscount } = useCartStore();
  const { showToast } = useToastStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shouldLockPage, setShouldLockPage] = useState(isOpen);
  const [restoreScrollOnUnlock, setRestoreScrollOnUnlock] = useState(true);
  const readyPath = useCheckoutTransitionStore((state) => state.readyPath);
  const beginCheckoutTransition = useCheckoutTransitionStore((state) => state.begin);
  const finishCheckoutTransition = useCheckoutTransitionStore((state) => state.finish);

  useBodyScrollLock(shouldLockPage, { restoreScroll: restoreScrollOnUnlock });

  useEffect(() => {
    if (isOpen) {
      setRestoreScrollOnUnlock(true);
      setShouldLockPage(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isCheckingOut) onClose();
  };

  useCheckoutTransitionGuard({
    active: isCheckingOut,
    targetPath: '/checkout',
    onRecover: () => setIsCheckingOut(false),
    onUnexpectedRoute: onClose,
  });

  useLayoutEffect(() => {
    if (!isCheckingOut || pathname !== '/checkout' || readyPath !== '/checkout') return;

    const frame = window.requestAnimationFrame(onClose);

    return () => window.cancelAnimationFrame(frame);
  }, [isCheckingOut, onClose, pathname, readyPath]);

  const handleRemove = (productId: number, name: string) => {
    removeItem(productId);
    showToast(`${name} eliminado del carrito`, 'info');
  };

  const handleCheckout = () => {
    if (typeof window !== 'undefined') {
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.sessionStorage.setItem('nexus_checkout_return_path', returnPath);
    }
    const sourcePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    beginCheckoutTransition('/checkout', sourcePath);
    setRestoreScrollOnUnlock(false);
    setIsCheckingOut(true);
    router.push('/checkout', { scroll: false });
  };

  return (
    <StorefrontDrawerDialog
      open={isOpen}
      label="Mi carrito"
      onRequestClose={handleClose}
      closeDisabled={isCheckingOut}
      restoreFocus={!isCheckingOut}
      returnFocusSelector='[aria-label="Abrir carrito"], [aria-label="Carrito"]'
      busy={isCheckingOut}
      onExitComplete={() => {
        setShouldLockPage(false);
        if (isCheckingOut) {
          setIsCheckingOut(false);
          finishCheckoutTransition();
        }
      }}
    >
        <div className="shrink-0">
          <CartDrawerMobileTopBar itemCount={items.length} onClose={handleClose} />

          <StorefrontDrawerHeader
            icon={ShoppingBag}
            title="Mi carrito"
            subtitle={`${items.length} producto${items.length === 1 ? '' : 's'}`}
            closeLabel="Cerrar carrito"
            onClose={handleClose}
            className="hidden sm:flex"
          />
        </div>

        <StorefrontTemporarySurfaceItem
          phase="content"
          className="flex-1 overflow-y-auto px-[var(--sf-inset-page-mobile)] pb-[var(--sf-space-md)] pt-[calc(var(--sf-inset-mobile-chrome-block)+var(--sf-h-mobile-nav)+var(--sf-space-mobile-chrome-after))] sm:p-[var(--sf-padding-inner)]"
        >
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-stone-400" style={{ gap: 'var(--sf-space-md)' }}>
              <StorefrontIcon icon={ShoppingBag} context="section" variant="muted" />
              <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                <p className="sf-text-h2 text-stone-700">Tu carrito está vacío</p>
                <p className="sf-text-secondary max-w-xs">Agrega productos desde la tienda para iniciar tu pedido.</p>
              </div>
              <Button onClick={onClose} context="card">Ver productos</Button>
            </div>
          ) : (
            <div className="flex flex-col">
              {items.map((item, index) => (
                <div
                  key={item.productId}
                  className="group"
                  style={{
                    paddingTop: index === 0 ? 0 : 'var(--sf-space-md)',
                    paddingBottom: index === items.length - 1 ? 0 : 'var(--sf-space-md)',
                    borderBottom: index === items.length - 1 ? '0' : '1px solid rgba(231, 229, 228, 0.8)',
                  }}
                >
                  <div className="flex items-center" style={{ gap: 'var(--sf-space-md)' }}>
                    <div
                      className="h-20 w-20 shrink-0 overflow-hidden bg-stone-100"
                      style={{ borderRadius: 'var(--sf-radius-card-inner)' }}
                    >
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-300">
                          <ShoppingBag size={24} strokeWidth={1.2} />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-between" style={{ gap: 'var(--sf-space-sm)' }}>
                      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                        <h4 className="sf-text-secondary truncate font-bold text-stone-800">{item.name}</h4>
                        <p className="sf-text-h2 text-brand-500">${formatPrice(item.price)}</p>
                      </div>

                      <div className="flex shrink-0 items-center" style={{ gap: 'var(--sf-space-sm)' }}>
                        <div
                          className="flex w-fit items-center bg-stone-100"
                          style={{ borderRadius: 'var(--sf-radius-card-inner)', padding: 'var(--sf-space-xs)' }}
                        >
                          <button
                            className="flex h-7 w-7 items-center justify-center text-stone-500 transition-colors hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
                            style={{ borderRadius: 'var(--sf-radius-card-nested-compact)' }}
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center sf-text-button-card text-stone-800">{item.quantity}</span>
                          <button
                            className="flex h-7 w-7 items-center justify-center text-stone-500 transition-colors hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
                            style={{ borderRadius: 'var(--sf-radius-card-nested-compact)' }}
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-stone-300 opacity-100 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 sm:opacity-0 sm:group-hover:opacity-100"
                          style={{ borderRadius: 'var(--sf-radius-card-inner)' }}
                          onClick={() => handleRemove(item.productId, item.name)}
                          aria-label="Eliminar producto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StorefrontTemporarySurfaceItem>

        {items.length > 0 && (
          <StorefrontTemporarySurfaceItem
            phase="footer"
            className="shrink-0 border-t border-stone-100 bg-white/95 sm:hidden"
            style={{
              paddingInline: 'var(--sf-inset-page-mobile)',
              paddingTop: 'var(--sf-space-md)',
              paddingBottom: 'var(--sf-mobile-chrome-content-padding-bottom)',
            }}
          >
            <CouponRedemption />
          </StorefrontTemporarySurfaceItem>
        )}

        {items.length > 0 && (
          <StorefrontTemporarySurfaceItem
            phase="footer"
            className="hidden border-t border-stone-100 bg-stone-50/70 sm:block"
            style={{
              padding: 'var(--sf-padding-inner)',
            }}
          >
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <CouponRedemption />
              <div className="flex items-center justify-between">
                <span className="sf-text-label text-stone-400">Total</span>
                <span className="sf-text-h1 text-stone-850">${formatPrice(getCartTotalAfterDiscount())}</span>
              </div>
              {getDiscountTotal() > 0 && (
                <div className="flex items-center justify-between">
                  <span className="sf-text-label text-stone-400">Descuento</span>
                  <span className="sf-text-secondary font-bold text-emerald-600">-${formatPrice(getDiscountTotal())}</span>
                </div>
              )}
              <Button
                className="w-full"
                context="section"
                icon={ShoppingBag}
                isLoading={isCheckingOut}
                onClick={handleCheckout}
              >
                Finalizar pedido
              </Button>
            </div>
          </StorefrontTemporarySurfaceItem>
        )}

        {items.length > 0 && (
          <StorefrontPurchaseBar
            total={getCartTotalAfterDiscount()}
            buttonLabel="Finalizar pedido"
            buttonIcon={ShoppingBag}
            loading={isCheckingOut}
            onAction={handleCheckout}
            entrance="temporary"
          />
        )}
    </StorefrontDrawerDialog>
  );
}

function CartDrawerMobileTopBar({
  itemCount,
  onClose,
}: {
  itemCount: number;
  onClose: () => void;
}) {
  return (
    <StorefrontTemporarySurfaceChrome
      edge="top"
      className="absolute z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center sm:hidden"
      style={{
        top: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 'var(--sf-h-mobile-nav)',
          height: 'var(--sf-h-mobile-nav)',
        }}
      />

      <StorefrontTemporarySurfaceHeaderItem
        part="identity"
        className="pointer-events-none flex min-w-0 items-center justify-center overflow-hidden border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          paddingInline: 'var(--sf-space-md)',
        }}
      >
        <div className="min-w-0 text-center">
          <p className="truncate sf-text-secondary font-medium text-stone-700">Mi carrito</p>
          <p className="sf-text-caption text-stone-400">{itemCount} producto{itemCount === 1 ? '' : 's'}</p>
        </div>
      </StorefrontTemporarySurfaceHeaderItem>

      <StorefrontTemporarySurfaceHeaderItem
        part="close"
        className="flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          padding: 'var(--sf-space-sm)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="group flex shrink-0 items-center justify-center border border-transparent text-stone-500 transition-all duration-300 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          style={{
            width: 'var(--sf-size-mobile-nav-item)',
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            transitionTimingFunction: 'var(--sf-ease)',
          }}
          aria-label="Cerrar carrito"
        >
          <X
            style={{ width: 'var(--sf-size-mobile-nav-icon)', height: 'var(--sf-size-mobile-nav-icon)' }}
            strokeWidth={2.35}
          />
        </button>
      </StorefrontTemporarySurfaceHeaderItem>
    </StorefrontTemporarySurfaceChrome>
  );
}
