import { BlurTargetView } from 'expo-blur';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { GlassBackground, ToastHost } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { ThemeProvider, useTheme, type ViewRef } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Waits until the persisted token and settings are read from storage. */
function useHydrated() {
  const [ready, setReady] = useState(
    () => useAuthStore.persist.hasHydrated() && useSettingsStore.persist.hasHydrated(),
  );
  useEffect(() => {
    const check = () => setReady(useAuthStore.persist.hasHydrated() && useSettingsStore.persist.hasHydrated());
    const unsubs = [useAuthStore.persist.onFinishHydration(check), useSettingsStore.persist.onFinishHydration(check)];
    check();
    return () => unsubs.forEach((u) => u());
  }, []);
  return ready;
}

function RootNavigator() {
  const t = useTheme();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Refresh the profile for a remembered session (a 401 logs out via the API interceptor).
  useEffect(() => {
    if (token && !user) api.me().then(setUser).catch(() => {});
  }, [token, user, setUser]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  const navTheme = useMemo(() => {
    const base = t.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: t.primary, background: 'transparent', card: t.glassStrong, text: t.text, border: t.divider },
    };
  }, [t]);

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'fade_from_bottom' }}>
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="program/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="program/edit" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="exercise/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const blurTarget = useRef<ViewRef | null>(null);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider blurTarget={blurTarget}>
        <View style={{ flex: 1 }}>
          {/* Everything glass blurs is this background; BlurViews reference it on Android. */}
          <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
            <GlassBackground />
          </BlurTargetView>
          <RootNavigator />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
