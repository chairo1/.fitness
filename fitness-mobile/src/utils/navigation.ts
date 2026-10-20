import { router } from 'expo-router';
import { useDataStore } from '@/store/data';
import type { WorkoutDraft } from './draft';

/** Opens the workout editor prefilled with `draft`. */
export const openWorkout = (draft: WorkoutDraft) => {
  useDataStore.getState().setDraft(draft);
  router.push('/workout');
};
