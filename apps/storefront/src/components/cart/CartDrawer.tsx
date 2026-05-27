import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { StorefrontCard } from '../ui/Card';
import { StorefrontIcon } from '../ui/Icon';

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const { showToast } = useToastStore();
  const router = useRouter();

  const handleRemove = (productId: number, name: string) => {
    removeItem(productId);
    showToast(`${name} eliminado del carrito`, 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm" onClick={onClose} />

      <aside
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300"
        style={{
          borderTopLeftRadius: 'var(--sf-radius-outer)',
          borderBottomLeftRadius: 'var(--sf-radius-outer)',
        }}
      >
        <div
          className="flex items-center justify-between border-b border-stone-100"
          style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}
        >
          <div className="flex items-center min-w-0" style={{ gap: 'var(--sf-space-md)' }}>
            <StorefrontIcon icon={ShoppingBag} context="card" variant="brand" />
            <div className="min-w-0">
              <h2 className="sf-text-h2 text-stone-850 uppercase italic">Mi Carrito</h2>
              <p className="sf-text-label text-stone-400">{items.length} producto(s)</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" context="card" onClick={onClose} aria-label="Cerrar carrito">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--sf-padding-inner)' }}>
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-stone-400" style={{ gap: 'var(--sf-space-md)' }}>
              <StorefrontIcon icon={ShoppingBag} context="section" variant="muted" />
              <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                <p className="sf-text-h2 text-stone-700">Tu carrito esta vacio</p>
                <p className="sf-text-secondary max-w-xs">Agrega productos desde la tienda para iniciar tu pedido.</p>
              </div>
              <Button onClick={onClose} context="card">Ver Productos</Button>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              {items.map((item) => (
                <StorefrontCard key={item.productId} level={3} className="group">
                  <div className="flex" style={{ gap: 'var(--sf-space-md)' }}>
                    <div
                      className="h-20 w-20 shrink-0 overflow-hidden bg-stone-100"
                      style={{ borderRadius: 'var(--sf-radius-nested)' }}
                    >
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-300">
                          <ShoppingBag size={24} strokeWidth={1.2} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
                        <h4 className="sf-text-secondary truncate font-bold text-stone-800">{item.name}</h4>
                        <p className="sf-text-h2 text-brand-500">${formatPrice(item.price)}</p>
                      </div>

                      <div className="mt-3 flex items-center" style={{ gap: 'var(--sf-space-sm)' }}>
                        <div
                          className="flex items-center bg-stone-100"
                          style={{ borderRadius: 'var(--sf-radius-nested)', padding: 'var(--sf-space-xs)' }}
                        >
                          <button
                            className="p-1 text-stone-500 transition-colors hover:text-brand-500"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center sf-text-button-card text-stone-800">{item.quantity}</span>
                          <button
                            className="p-1 text-stone-500 transition-colors hover:text-brand-500"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          className="ml-auto text-stone-300 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={() => handleRemove(item.productId, item.name)}
                          aria-label="Eliminar producto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </StorefrontCard>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div
            className="border-t border-stone-100 bg-stone-50/70"
            style={{
              padding: 'var(--sf-padding-inner)',
              borderBottomLeftRadius: 'var(--sf-radius-outer)',
            }}
          >
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex items-center justify-between">
                <span className="sf-text-label text-stone-400">Total</span>
                <span className="sf-text-h1 text-stone-850">${formatPrice(getTotalPrice())}</span>
              </div>
              <Button
                className="w-full"
                context="section"
                onClick={() => {
                  onClose();
                  router.push('/checkout');
                }}
              >
                Finalizar Pedido
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
