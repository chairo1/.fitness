import type { AlertColor } from '@mui/material';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Mode = 'light' | 'dark';

const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

interface UiState {
  mode: Mode;
  toggleMode: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mode: prefersDark ? 'dark' : 'light',
      toggleMode: () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'fitness-ui' },
  ),
);

interface Toast {
  id: number;
  message: string;
  severity: AlertColor;
}

interface ToastState {
  toast: Toast | null;
  notify: (message: string, severity?: AlertColor) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  notify: (message, severity = 'success') => set({ toast: { id: Date.now(), message, severity } }),
  clear: () => set({ toast: null }),
}));

export const notify = (message: string, severity?: AlertColor) => useToastStore.getState().notify(message, severity);
