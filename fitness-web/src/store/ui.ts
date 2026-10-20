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

/**
 * One "log a workout" dialog for the whole app (opened from the app bar, the dashboard, a program day…).
 * `version` bumps after every save so pages can refetch.
 */
interface ComposerState {
  draft: import('../components/WorkoutDialog').WorkoutDraft | null;
  isOpen: boolean;
  version: number;
  openComposer: (draft?: import('../components/WorkoutDialog').WorkoutDraft) => void;
  closeComposer: () => void;
  markSaved: () => void;
}

export const useComposer = create<ComposerState>((set) => ({
  draft: null,
  isOpen: false,
  version: 0,
  openComposer: (draft) => set({ isOpen: true, draft: draft ?? null }),
  closeComposer: () => set({ isOpen: false }),
  markSaved: () => set((s) => ({ isOpen: false, version: s.version + 1 })),
}));

/** Data version to put in `useAsync` deps on pages that show workouts. */
export const useDataVersion = () => useComposer((s) => s.version);
