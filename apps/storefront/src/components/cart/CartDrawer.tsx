import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-bottom flex items-center justify-between">
          <h2 className="text-xl font-black text-stone-800 flex items-center gap-2">
            <ShoppingBag /> Mi Carrito
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-4">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="font-medium text-lg">Tu carrito está vacío</p>
              <Button onClick={onClose}>Ver Productos</Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-4 group">
                <div className="w-20 h-20 bg-stone-100 rounded-2xl overflow-hidden shrink-0">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-800 truncate">{item.name}</h4>
                  <p className="text-brand-500 font-black mb-2">${item.price.toLocaleString()}</p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-stone-100 rounded-lg p-1">
                      <button 
                        className="p-1 hover:text-brand-500 transition-colors"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button 
                        className="p-1 hover:text-brand-500 transition-colors"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button 
                      className="text-stone-300 hover:text-red-500 transition-colors ml-auto opacity-0 group-hover:opacity-100"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-stone-100 bg-stone-50/50 space-y-4">
            <div className="flex items-center justify-between text-lg font-black text-stone-800">
              <span>Total</span>
              <span>${getTotalPrice().toLocaleString()}</span>
            </div>
            <Button 
              className="w-full h-14 text-lg" 
              onClick={() => {
                onClose();
                navigate('/checkout');
              }}
            >
              Finalizar Pedido
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
