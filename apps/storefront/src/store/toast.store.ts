import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastState {
  title: string | null;
  message: string | null;
  type: ToastType;
  action: ToastAction | null;
  durationMs: number;
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  title: null,
  message: null,
  type: 'info',
  action: null,
  durationMs: 4000,
  showToast: (message, typeOrOptions = 'info') => {
    const options =
      typeof typeOrOptions === 'string' ? { type: typeOrOptions } : typeOrOptions;

    set({
      title: options.title ?? null,
      message,
      type: options.type ?? 'info',
      action: options.action ?? null,
      durationMs: options.durationMs ?? 4000,
    });
  },
  hideToast: () => set({ title: null, message: null, action: null }),
}));
