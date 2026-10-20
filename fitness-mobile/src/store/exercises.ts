import { create } from 'zustand';
import { api } from '@/api/client';
import type { Exercise, MuscleGroup } from '@/api/types';

interface ExercisesState {
  items: Exercise[];
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
  add: (name: string, muscleGroup: MuscleGroup) => Promise<Exercise>;
  remove: (id: string) => Promise<void>;
}

export const useExercisesStore = create<ExercisesState>((set, get) => ({
  items: [],
  loaded: false,
  load: async (force) => {
    if (get().loaded && !force) return;
    set({ items: await api.exercises(), loaded: true });
  },
  add: async (name, muscleGroup) => {
    const ex = await api.createExercise(name.trim(), muscleGroup);
    set({ items: [...get().items, ex].sort((a, b) => a.name.localeCompare(b.name)) });
    return ex;
  },
  remove: async (id) => {
    await api.deleteExercise(id);
    set({ items: get().items.filter((e) => e.id !== id) });
  },
}));
