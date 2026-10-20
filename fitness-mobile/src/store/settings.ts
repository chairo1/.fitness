import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * In development the phone already reaches the PC through Metro's address (e.g. 192.168.0.101:8081
 * when opened via QR in Expo Go), so the API is assumed on the same host, port 3000.
 * Fallback: 10.0.2.2 — how the Android emulator reaches the host machine.
 */
function devHostApiUrl() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000/api` : null;
}

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? devHostApiUrl() ?? 'http://10.0.2.2:3000/api';

interface SettingsState {
  themeMode: ThemeMode;
  /** null = DEFAULT_API_URL */
  apiUrl: string | null;
  setThemeMode: (m: ThemeMode) => void;
  setApiUrl: (url: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      apiUrl: null,
      setThemeMode: (themeMode) => set({ themeMode }),
      setApiUrl: (url) => set({ apiUrl: url?.trim().replace(/\/+$/, '') || null }),
    }),
    { name: 'fitness-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const apiUrl = () => useSettingsStore.getState().apiUrl ?? DEFAULT_API_URL;
