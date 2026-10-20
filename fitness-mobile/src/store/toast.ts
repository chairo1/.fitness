import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  toast: { id: number; message: string; kind: ToastKind } | null;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  clear: () => set({ toast: null }),
}));

export const notify = (message: string, kind: ToastKind = 'success') =>
  useToastStore.setState({ toast: { id: Date.now(), message, kind } });
