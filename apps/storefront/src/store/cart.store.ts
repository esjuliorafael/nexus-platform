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

export interface CartCoupon {
  code: string;
  name?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  scope: 'ALL' | 'ITEM' | 'BIRD';
  discountTotal: number;
  eligibleSubtotal: number;
}

interface CartState {
  items: CartItem[];
  coupon: CartCoupon | null;
  addItem: (item: CartItem) => AddItemResult;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (coupon: CartCoupon) => void;
  clearCoupon: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getDiscountTotal: () => number;
  getCartTotalAfterDiscount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
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
            coupon: null,
          });
          return 'updated';
        } else {
          set({
            items: [...get().items, { ...item, quantity: item.type === 'bird' ? 1 : item.quantity }],
            coupon: null,
          });
          return 'added';
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId), coupon: null });
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
          coupon: null,
        });
      },
      clearCart: () => set({ items: [], coupon: null }),
      setCoupon: (coupon) => set({ coupon }),
      clearCoupon: () => set({ coupon: null }),
      getTotalItems: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
      getTotalPrice: () => get().items.reduce((acc, i) => acc + i.quantity * i.price, 0),
      getDiscountTotal: () => Math.min(get().coupon?.discountTotal || 0, get().getTotalPrice()),
      getCartTotalAfterDiscount: () => Math.max(0, get().getTotalPrice() - get().getDiscountTotal()),
    }),
    {
      name: 'nexus_cart',
    }
  )
);
