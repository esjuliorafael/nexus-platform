import { create } from 'zustand';

interface CheckoutTransitionState {
  targetPath: string | null;
  sourcePath: string | null;
  readyPath: string | null;
  begin: (targetPath: string, sourcePath: string) => void;
  markReady: (path: string) => void;
  finish: () => void;
}

export const useCheckoutTransitionStore = create<CheckoutTransitionState>((set, get) => ({
  targetPath: null,
  sourcePath: null,
  readyPath: null,
  begin: (targetPath, sourcePath) => set({ targetPath, sourcePath, readyPath: null }),
  markReady: (path) => {
    if (get().targetPath === path) set({ readyPath: path });
  },
  finish: () => set({ targetPath: null, sourcePath: null, readyPath: null }),
}));
