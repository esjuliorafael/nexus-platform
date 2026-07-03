import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  thumbnail: string | null;
  type: 'bird' | 'item';
}

export type AddItemResult = 'added' | 'updated' | 'already-in-cart';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => AddItemResult;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          if (existing.type === 'bird' || item.type === 'bird') {
            return 'already-in-cart';
          }

          set({
            items: get().items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
          return 'updated';
        } else {
          set({ items: [...get().items, { ...item, quantity: item.type === 'bird' ? 1 : item.quantity }] });
          return 'added';
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const currentItem = get().items.find((i) => i.productId === productId);
        const nextQuantity = currentItem?.type === 'bird' ? 1 : quantity;

        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity: nextQuantity } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      getTotalPrice: () => get().items.reduce((acc, i) => acc + i.quantity * i.price, 0),
    }),
    {
      name: 'nexus_cart',
    }
  )
);
