import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/api/client';
import type { Exercise, MuscleGroup } from '@/api/types';
import { useExercisesStore } from '@/store/exercises';
import { notify } from '@/store/toast';
import { radius, useTheme } from '@/theme';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@/utils/format';
import { Button, Chip, Input, Sheet, tap, Txt } from './ui';

/** Field that shows the chosen exercise and opens a searchable picker sheet. */
export function ExerciseField({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const t = useTheme();
  const { items, load } = useExercisesStore();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  const ex = items.find((e) => e.id === value);
  return (
    <>
      <Pressable
        onPress={() => {
          tap();
          setOpen(true);
        }}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 46,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          borderWidth: 1.2,
          borderColor: value ? t.inputBorder : t.primary,
          backgroundColor: t.input,
        }}
      >
        <Ionicons name="barbell-outline" size={18} color={t.primary} />
        <View style={{ flex: 1 }}>
          <Txt weight={ex ? '600' : '400'} color={ex ? 'text' : 'disabled'} numberOfLines={1}>
            {ex?.name ?? 'Hərəkət seçin'}
          </Txt>
          {ex && (
            <Txt variant="caption" color="secondary">
              {MUSCLE_LABELS[ex.muscleGroup]}
            </Txt>
          )}
        </View>
        <Ionicons name="chevron-down" size={18} color={t.textSecondary} />
      </Pressable>
      <ExercisePicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(e) => {
          onChange(e.id);
          setOpen(false);
        }}
        selectedId={value}
      />
    </>
  );
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  selectedId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (e: Exercise) => void;
  selectedId?: string | null;
}) {
  const t = useTheme();
  const { items, add } = useExercisesStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('az');
    return items.filter(
      (e) => (group === 'all' || e.muscleGroup === group) && (!s || e.name.toLocaleLowerCase('az').includes(s)),
    );
  }, [items, q, group]);

  const create = async () => {
    setAdding(true);
    try {
      const ex = await add(q, group === 'all' ? 'full_body' : group);
      notify('Hərəkət əlavə olundu');
      setQ('');
      onPick(ex);
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Hərəkət seçin" height={0.85}>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Input placeholder="Axtar..." value={q} onChangeText={setQ} autoCorrect={false} returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
          <Chip label="Hamısı" selected={group === 'all'} onPress={() => setGroup('all')} />
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g} label={MUSCLE_LABELS[g]} selected={group === g} onPress={() => setGroup(g)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 24, gap: 12 }}>
            <Txt color="secondary" center>
              {q.trim() ? `"${q.trim()}" tapılmadı` : 'Bu qrupda hərəkət yoxdur'}
            </Txt>
          </View>
        }
        ListFooterComponent={
          q.trim() ? (
            <Button
              title={`"${q.trim()}" — yeni hərəkət${group !== 'all' ? ` (${MUSCLE_LABELS[group]})` : ''}`}
              icon="add"
              variant="tonal"
              loading={adding}
              onPress={create}
              style={{ marginTop: 8 }}
            />
          ) : undefined
        }
        renderItem={({ item }) => {
          const on = item.id === selectedId;
          return (
            <Pressable
              onPress={() => {
                tap();
                onPick(item);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                backgroundColor: on ? t.hover : pressed ? t.hover : 'transparent',
              })}
            >
              <View style={{ flex: 1 }}>
                <Txt weight={on ? '700' : '500'} color={on ? 'primary' : 'text'}>
                  {item.name}
                </Txt>
                <Txt variant="caption" color="secondary">
                  {MUSCLE_LABELS[item.muscleGroup]}
                  {item.userId ? ' · Mənim' : ''}
                </Txt>
              </View>
              {on && <Ionicons name="checkmark-circle" size={20} color={t.primary} />}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}
