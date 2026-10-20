import { createContext, useContext, useMemo, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { useColorScheme, type View } from 'react-native';
import { useSettingsStore } from '@/store/settings';

export type Mode = 'light' | 'dark';
export type ViewRef = ComponentRef<typeof View>;

// Same palette as the web app (fitness-web/src/theme.ts) so both clients feel like one product.
const light = {
  mode: 'light' as Mode,
  bg: '#EEF1FB',
  text: '#1A1D33',
  textSecondary: 'rgba(26, 29, 51, 0.6)',
  textDisabled: 'rgba(26, 29, 51, 0.35)',
  primary: '#4F5BFF',
  primary2: '#8A5CFF',
  secondary: '#E5489B',
  success: '#16A06A',
  warning: '#F5A524',
  error: '#E5384F',
  info: '#0EA5E9',
  glass: 'rgba(255, 255, 255, 0.58)',
  glassStrong: 'rgba(255, 255, 255, 0.92)',
  glassBorder: 'rgba(255, 255, 255, 0.85)',
  sheen: ['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.08)'] as readonly [string, string],
  hover: 'rgba(26, 29, 51, 0.05)',
  input: 'rgba(255, 255, 255, 0.6)',
  inputBorder: 'rgba(26, 29, 51, 0.12)',
  divider: 'rgba(26, 29, 51, 0.08)',
  shadow: '#4C58A0',
  blobs: ['#8C9BFF', '#FFA3D1', '#7FE3D6'],
  blobOpacity: 0.6,
  blurTint: 'light' as 'light' | 'dark',
};

const dark: typeof light = {
  mode: 'dark',
  bg: '#090D1C',
  text: '#ECEEFA',
  textSecondary: 'rgba(236, 238, 250, 0.62)',
  textDisabled: 'rgba(236, 238, 250, 0.32)',
  primary: '#8EA2FF',
  primary2: '#B98CFF',
  secondary: '#FF8AC5',
  success: '#4ADE9E',
  warning: '#F5A524',
  error: '#FF6B81',
  info: '#38BDF8',
  glass: 'rgba(24, 29, 54, 0.55)',
  glassStrong: 'rgba(20, 24, 46, 0.94)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  sheen: ['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)'],
  hover: 'rgba(255, 255, 255, 0.06)',
  input: 'rgba(255, 255, 255, 0.04)',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  divider: 'rgba(255, 255, 255, 0.08)',
  shadow: '#000000',
  blobs: ['#3B3FD8', '#9B3FD8', '#0E8C9C'],
  blobOpacity: 0.5,
  blurTint: 'dark',
};

export type Theme = typeof light;
export type ColorKey = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };

interface Ctx {
  t: Theme;
  /** Root view behind every screen — BlurViews blur it on Android. */
  blurTarget: RefObject<ViewRef | null>;
}

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ blurTarget, children }: { blurTarget: RefObject<ViewRef | null>; children: ReactNode }) {
  const pref = useSettingsStore((s) => s.themeMode);
  const system = useColorScheme();
  const mode: Mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const value = useMemo(() => ({ t: mode === 'dark' ? dark : light, blurTarget }), [mode, blurTarget]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx.t;
}

export function useBlurTarget() {
  return useContext(ThemeContext)!.blurTarget;
}

/** Hex colour with alpha, e.g. alpha('#4F5BFF', 0.2). */
export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
