import type { ProgramDay, Workout } from '@/api/types';
import { today } from './format';

// Numbers are kept as strings while editing so "72," or an empty field can be typed freely.
export interface SetRow {
  reps: string;
  weightKg: string;
}
export interface Block {
  key: number;
  exerciseId: string | null;
  sets: SetRow[];
}
export interface WorkoutDraft {
  id?: string;
  date: string;
  title: string;
  notes: string;
  durationMin: string;
  programDayId: string | null;
  blocks: Block[];
}

let seq = 0;
export const block = (exerciseId: string | null = null, sets: SetRow[] = [{ reps: '10', weightKg: '0' }]): Block => ({
  key: ++seq,
  exerciseId,
  sets,
});

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

export const emptyDraft = (): WorkoutDraft => ({
  date: today(),
  title: '',
  notes: '',
  durationMin: '',
  programDayId: null,
  blocks: [block()],
});

/** Consecutive sets of the same exercise are grouped into one block. */
export const draftFromWorkout = (w: Workout): WorkoutDraft => {
  const blocks: Block[] = [];
  for (const s of w.sets) {
    const last = blocks[blocks.length - 1];
    const row = { reps: str(s.reps), weightKg: str(s.weightKg) };
    if (last && last.exerciseId === s.exerciseId) last.sets.push(row);
    else blocks.push(block(s.exerciseId, [row]));
  }
  return {
    id: w.id,
    date: w.date,
    title: w.title,
    notes: w.notes ?? '',
    durationMin: str(w.durationMin),
    programDayId: w.programDayId,
    blocks: blocks.length ? blocks : [block()],
  };
};

export const draftFromProgramDay = (d: ProgramDay): WorkoutDraft => ({
  date: d.date > today() ? today() : d.date,
  title: d.title,
  notes: '',
  durationMin: '',
  programDayId: d.id,
  blocks: d.exercises.map((e) =>
    block(
      e.exerciseId,
      Array.from({ length: e.sets }, () => ({ reps: str(e.reps), weightKg: str(e.targetWeightKg ?? 0) })),
    ),
  ),
});
