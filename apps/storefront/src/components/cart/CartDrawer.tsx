import { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { StorefrontIcon } from '../ui/Icon';
import { StorefrontPurchaseBar } from '../ui/PurchaseBar';
import { CouponRedemption } from './CouponRedemption';

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, getDiscountTotal, getCartTotalAfterDiscount } = useCartStore();
  const { showToast } = useToastStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (!isCheckingOut || pathname !== '/checkout') return;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        onClose();
        setIsCheckingOut(false);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isCheckingOut, onClose, pathname]);

  const handleRemove = (productId: number, name: string) => {
    removeItem(productId);
    showToast(`${name} eliminado del carrito`, 'info');
  };

  const handleCheckout = () => {
    if (typeof window !== 'undefined') {
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.sessionStorage.setItem('nexus_checkout_return_path', returnPath);
    }
    setIsCheckingOut(true);
    router.push('/checkout');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'var(--sf-modal-backdrop)' }}
        onClick={onClose}
      />

      <aside
        className="relative flex h-full w-full flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:max-w-md sm:rounded-l-[var(--sf-radius-outer)]"
      >
        <CartDrawerMobileTopBar itemCount={items.length} onClose={onClose} />

        <div
          className="hidden items-center justify-between border-b border-stone-100 sm:flex"
          style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}
        >
          <div className="flex items-center min-w-0" style={{ gap: 'var(--sf-space-md)' }}>
            <StorefrontIcon icon={ShoppingBag} context="autonomous" variant="brand" />
            <div className="min-w-0">
              <h2 className="sf-text-h2 text-stone-850">Mi carrito</h2>
              <p className="sf-text-label text-stone-400">{items.length} producto(s)</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            context="card"
            icon={X}
            isIconOnly
            onClick={onClose}
            aria-label="Cerrar carrito"
          />
        </div>

        <div
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
                    paddingBlock: 'var(--sf-space-md)',
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
        </div>

        {items.length > 0 && (
          <div
            className="shrink-0 border-t border-stone-100 bg-white/95 sm:hidden"
            style={{
              paddingInline: 'var(--sf-inset-page-mobile)',
              paddingTop: 'var(--sf-space-md)',
              paddingBottom: 'var(--sf-mobile-chrome-content-padding-bottom)',
            }}
          >
            <CouponRedemption />
          </div>
        )}

        {items.length > 0 && (
          <div
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
          </div>
        )}

        {items.length > 0 && (
          <StorefrontPurchaseBar
            total={getCartTotalAfterDiscount()}
            buttonLabel="Continuar"
            buttonIcon={ShoppingBag}
            loading={isCheckingOut}
            onAction={handleCheckout}
          />
        )}
      </aside>
    </div>
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
    <div
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

      <div
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
      </div>

      <div
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
      </div>
    </div>
  );
}
