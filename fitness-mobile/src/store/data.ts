import { create } from 'zustand';
import type { WorkoutDraft } from '@/utils/draft';

/**
 * `version` is bumped after every write so screens the navigator keeps alive
 * (dashboard, lists) reload when the user returns to them.
 */
interface DataState {
  version: number;
  bump: () => void;
  /** Draft handed to the workout editor screen. */
  draft: WorkoutDraft | null;
  setDraft: (d: WorkoutDraft | null) => void;
}

export const useDataStore = create<DataState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
  draft: null,
  setDraft: (draft) => set({ draft }),
}));

export const bumpData = () => useDataStore.getState().bump();
