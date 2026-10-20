import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass, tap, type IconName } from '@/components/ui';
import { alpha, useTheme } from '@/theme';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Əsas', icon: 'home-outline', iconActive: 'home' },
  { name: 'workouts', title: 'Məşqlər', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'programs', title: 'Proqramlar', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'exercises', title: 'Hərəkətlər', icon: 'list-outline', iconActive: 'list' },
  { name: 'profile', title: 'Profil', icon: 'person-outline', iconActive: 'person' },
];

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Floating frosted-glass tab bar. */
function GlassTabBar({ state, navigateToTab }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 10 }}>
      <Glass blur radius={26} padding={6} contentStyle={{ flexDirection: 'row' }}>
        {state.routes.map((route, i) => {
          const tab = TABS.find((x) => x.name === route.name);
          if (!tab) return null;
          const on = state.index === i;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!on) tap();
                navigateToTab(route.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: on ? alpha(t.primary, t.mode === 'dark' ? 0.2 : 0.13) : 'transparent',
              }}
            >
              <Ionicons name={on ? tab.iconActive : tab.icon} size={22} color={on ? t.primary : t.textSecondary} />
              <Text
                style={{ fontSize: 10.5, marginTop: 2, fontWeight: on ? '700' : '500', color: on ? t.primary : t.textSecondary }}
                numberOfLines={1}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' }, animation: 'shift' }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
