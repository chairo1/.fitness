export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full_body';

export interface User {
  id: string;
  email: string;
  name: string;
  heightCm: number | null;
  goalWeightKg: number | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleRef[];
  permissions: string[];
}

export interface RoleRef {
  id: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  userId: string | null;
}

export interface WorkoutSet {
  id?: string;
  exerciseId: string;
  exercise?: Exercise;
  reps: number;
  weightKg: number;
}

export interface Workout {
  id: string;
  date: string;
  title: string;
  notes: string | null;
  durationMin: number | null;
  programDayId: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutInput {
  date: string;
  title: string;
  notes?: string | null;
  durationMin?: number | null;
  programDayId?: string | null;
  sets: { exerciseId: string; reps: number; weightKg: number }[];
}

export type ProgramType = 'weekly' | 'monthly';
export type DayStatus = 'done' | 'missed' | 'today' | 'upcoming';

export interface ProgramExercise {
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  targetWeightKg: number | null;
}

export interface ProgramDay {
  id: string;
  week: number;
  dayIndex: number;
  title: string;
  date: string;
  status: DayStatus;
  exercises: ProgramExercise[];
  workouts: { id: string; date: string; title: string }[];
}

export interface ProgramStats {
  totalDays: number;
  completed: number;
  missed: number;
  remaining: number;
  progress: number;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  type: ProgramType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  stats: ProgramStats;
  weekStats: { week: number; planned: number; completed: number }[];
  days?: ProgramDay[];
}

export interface ProgramInput {
  name: string;
  description?: string | null;
  type: ProgramType;
  startDate: string;
  days: {
    week: number;
    dayIndex: number;
    title: string;
    exercises: { exerciseId: string; sets: number; reps: number; targetWeightKg: number | null }[];
  }[];
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  notes: string | null;
}

export interface Dashboard {
  totals: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    minutesThisMonth: number;
    volumeThisWeek: number;
    volumeThisMonth: number;
    weekStreak: number;
  };
  weekly: { week: string; workouts: number; volume: number }[];
  records: { id: string; name: string; muscleGroup: MuscleGroup; maxWeight: number; est1rm: number }[];
  /** Last 30 days; `lastDate` is the most recent workout that hit the group. */
  muscles: { muscleGroup: MuscleGroup; sets: number; lastDate: string }[];
  weekDays: string[];
  weekPlan: { date: string; title: string; status: DayStatus }[];
  recent: { id: string; title: string; date: string; durationMin: number | null; sets: number; volume: number }[];
  body: BodyMetric[];
  activeProgram: (Omit<Program, 'days'> & { nextDay: ProgramDay | null }) | null;
}

export interface ExerciseProgressPoint {
  date: string;
  maxWeight: number;
  est1rm: number;
  volume: number;
  reps: number;
  sets: number;
}
