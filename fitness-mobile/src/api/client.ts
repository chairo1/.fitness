import { create, isAxiosError } from 'axios';
import { useAuthStore } from '@/store/auth';
import { apiUrl } from '@/store/settings';
import type {
  AuthResponse,
  BodyMetric,
  Dashboard,
  Exercise,
  ExerciseProgressPoint,
  MuscleGroup,
  Program,
  ProgramInput,
  User,
  Workout,
  WorkoutInput,
} from './types';

export const http = create({ timeout: 15000 });

http.interceptors.request.use((config) => {
  // The server address can be changed on the login screen, so resolve it per request.
  config.baseURL = apiUrl();
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (isAxiosError(err) && err.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

export function errorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    const msg = e.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (!e.response) return 'Serverə qoşulmaq mümkün olmadı';
    return e.message;
  }
  return 'Xəta baş verdi';
}

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const api = {
  login: (email: string, password: string) => data(http.post<AuthResponse>('/auth/login', { email, password })),
  register: (name: string, email: string, password: string) =>
    data(http.post<AuthResponse>('/auth/register', { name, email, password })),
  health: (baseURL: string) => http.get('/health', { baseURL, timeout: 5000 }),
  me: () => data(http.get<User>('/users/me')),
  updateMe: (body: Partial<Pick<User, 'name' | 'heightCm' | 'goalWeightKg'>>) => data(http.patch<User>('/users/me', body)),

  dashboard: () => data(http.get<Dashboard>('/stats/dashboard')),
  exerciseProgress: (id: string) => data(http.get<ExerciseProgressPoint[]>(`/stats/exercises/${id}`)),

  exercises: () => data(http.get<Exercise[]>('/exercises')),
  createExercise: (name: string, muscleGroup: MuscleGroup) => data(http.post<Exercise>('/exercises', { name, muscleGroup })),
  deleteExercise: (id: string) => http.delete(`/exercises/${id}`),

  workouts: (from?: string, to?: string) => data(http.get<Workout[]>('/workouts', { params: { from, to } })),
  workout: (id: string) => data(http.get<Workout>(`/workouts/${id}`)),
  saveWorkout: (body: WorkoutInput, id?: string) =>
    data(id ? http.put<Workout>(`/workouts/${id}`, body) : http.post<Workout>('/workouts', body)),
  deleteWorkout: (id: string) => http.delete(`/workouts/${id}`),

  programs: () => data(http.get<Program[]>('/programs')),
  program: (id: string) => data(http.get<Program>(`/programs/${id}`)),
  saveProgram: (body: ProgramInput, id?: string) =>
    data(id ? http.put<Program>(`/programs/${id}`, body) : http.post<Program>('/programs', body)),
  activateProgram: (id: string) => data(http.post<Program>(`/programs/${id}/activate`)),
  deleteProgram: (id: string) => http.delete(`/programs/${id}`),

  metrics: () => data(http.get<BodyMetric[]>('/metrics')),
  addMetric: (body: Omit<BodyMetric, 'id'>) => data(http.post<BodyMetric>('/metrics', body)),
  deleteMetric: (id: string) => http.delete(`/metrics/${id}`),
};
