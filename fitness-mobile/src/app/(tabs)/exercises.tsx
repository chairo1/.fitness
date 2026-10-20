import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import type { Exercise, MuscleGroup } from '@/api/types';
import { Button, Card, Chip, confirm, EmptyState, Glass, IconBtn, InfoBox, Input, Loading, Screen, Sheet, tap, Txt } from '@/components/ui';
import { useExercisesStore } from '@/store/exercises';
import { notify } from '@/store/toast';
import { radius, useTheme } from '@/theme';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@/utils/format';
import { musclePart } from '@/utils/muscles';

/** Mounted only while open, so it starts from the currently browsed group each time. */
function AddExerciseSheet({ onClose, initialGroup }: { onClose: () => void; initialGroup: MuscleGroup }) {
  const add = useExercisesStore((s) => s.add);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>(initialGroup);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await add(name, group);
      notify('Hərəkət əlavə olundu');
      setName('');
      onClose();
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Yeni hərəkət">
      <View style={{ padding: 16, gap: 14 }}>
        <Input label="Ad" placeholder="məs. Smith Machine Squat" value={name} onChangeText={setName} autoFocus onSubmitEditing={submit} />
        <View>
          <Txt variant="caption" color="secondary" weight="600" style={{ marginBottom: 8 }}>
            Əzələ qrupu
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MUSCLE_GROUPS.map((g) => (
              <Chip key={g} label={MUSCLE_LABELS[g]} selected={group === g} onPress={() => setGroup(g)} />
            ))}
          </View>
        </View>
        <Button title="Əlavə et" icon="add" disabled={!name.trim()} loading={busy} onPress={submit} />
      </View>
    </Sheet>
  );
}

export default function ExercisesScreen() {
  const t = useTheme();
  const { items, loaded, load, remove } = useExercisesStore();
  // The body map deep-links here with ?muscle=<group>&focus=<muscle>.
  // The filter lives in the route params, like the web app's URL.
  const params = useLocalSearchParams<{ muscle?: string; focus?: string }>();
  const muscle = params.muscle as MuscleGroup | undefined;
  const filter: MuscleGroup | 'all' = muscle && MUSCLE_GROUPS.includes(muscle) ? muscle : 'all';
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    load(true).catch((e) => notify(errorMessage(e), 'error'));
  }, [load]);

  const focus = musclePart(params.focus);
  const choose = (g: MuscleGroup | 'all') => router.setParams({ muscle: g === 'all' ? undefined : g, focus: undefined });

  const del = (ex: Exercise) =>
    confirm('Hərəkəti sil', `"${ex.name}" silinsin?`, 'Sil', async () => {
      try {
        await remove(ex.id);
        notify('Silindi');
      } catch (e) {
        notify(errorMessage(e), 'error');
      }
    });

  const visible = MUSCLE_GROUPS.filter((g) => filter === 'all' || g === filter)
    .map((g) => ({ g, list: items.filter((e) => e.muscleGroup === g) }))
    .filter((x) => x.list.length);

  return (
    <Screen
      title="Hərəkətlər"
      subtitle="Kataloq və irəliləyiş qrafikləri"
      tabs
      onRefresh={refresh}
      refreshing={refreshing}
      action={<IconBtn icon="add" glass color={t.primary} label="Yeni hərəkət" onPress={() => setAdding(true)} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 14, marginHorizontal: -16 }}>
        <View style={{ width: 10 }} />
        <Chip label="Hamısı" selected={filter === 'all'} onPress={() => choose('all')} />
        {MUSCLE_GROUPS.map((g) => (
          <Chip key={g} label={MUSCLE_LABELS[g]} selected={filter === g} onPress={() => choose(g)} />
        ))}
        <View style={{ width: 10 }} />
      </ScrollView>

      {focus && filter === focus.group && (
        <View style={{ marginBottom: 14 }}>
          <InfoBox icon="body-outline" text={`${focus.name} (${focus.latin}) — ${MUSCLE_LABELS[focus.group]} qrupunun hərəkətləri`} />
        </View>
      )}

      {!loaded ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Glass>
          <EmptyState
            text="Bu qrup üçün hələ hərəkət yoxdur"
            action={<Button title="Öz hərəkətini əlavə et" variant="outlined" size="sm" onPress={() => setAdding(true)} />}
          />
        </Glass>
      ) : (
        <View style={{ gap: 12 }}>
          {visible.map(({ g, list }) => (
            <Card key={g} title={MUSCLE_LABELS[g]} action={<Chip small label={String(list.length)} />} padding={12}>
              {list.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    tap();
                    router.push({ pathname: '/exercise/[id]', params: { id: ex.id } });
                  }}
                  onLongPress={ex.userId ? () => del(ex) : undefined}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 11,
                    paddingHorizontal: 8,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? t.hover : 'transparent',
                  })}
                >
                  <Txt style={{ flex: 1 }}>{ex.name}</Txt>
                  {ex.userId && <Chip small variant="outlined" label="Mənim" />}
                  {ex.userId && <IconBtn icon="trash-outline" size={16} color={t.textSecondary} label="Sil" onPress={() => del(ex)} />}
                  <Ionicons name="stats-chart" size={16} color={t.primary} />
                </Pressable>
              ))}
            </Card>
          ))}
        </View>
      )}

      {adding && <AddExerciseSheet onClose={() => setAdding(false)} initialGroup={filter === 'all' ? 'chest' : filter} />}
    </Screen>
  );
}
