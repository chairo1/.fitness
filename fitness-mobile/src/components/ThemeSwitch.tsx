import { useSettingsStore, type ThemeMode } from '@/store/settings';
import { useTheme } from '@/theme';
import { IconBtn, Segmented, type IconName } from './ui';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const ICONS: Record<ThemeMode, IconName> = { system: 'phone-portrait-outline', light: 'sunny-outline', dark: 'moon-outline' };

/** `compact` cycles system → light → dark with one icon button. */
export function ThemeSwitch({ compact }: { compact?: boolean }) {
  const t = useTheme();
  const { themeMode, setThemeMode } = useSettingsStore();
  if (compact)
    return (
      <IconBtn
        glass
        icon={ICONS[themeMode]}
        color={t.text}
        label="Tema"
        onPress={() => setThemeMode(ORDER[(ORDER.indexOf(themeMode) + 1) % ORDER.length])}
      />
    );
  return (
    <Segmented
      value={themeMode}
      onChange={setThemeMode}
      options={[
        { value: 'system', label: 'Sistem', icon: ICONS.system },
        { value: 'light', label: 'İşıqlı', icon: ICONS.light },
        { value: 'dark', label: 'Qaranlıq', icon: ICONS.dark },
      ]}
    />
  );
}
