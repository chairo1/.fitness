import { useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'fitness-auth' },
  ),
);

/** UI-side permission check; the API enforces the same codes. */
export function useCan() {
  const permissions = useAuthStore((s) => s.user?.permissions);
  return useCallback((code: string) => !!permissions?.includes(code), [permissions]);
}
