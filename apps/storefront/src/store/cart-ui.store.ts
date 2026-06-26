import { create } from 'zustand';

interface CartUiState {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
}

export const useCartUiStore = create<CartUiState>((set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  setCartOpen: (isCartOpen) => set({ isCartOpen }),
}));
