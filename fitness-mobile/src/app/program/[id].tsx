import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api/client';
import type { ProgramDay } from '@/api/types';
import { Button, Chip, ErrorBox, Glass, Grid2, IconBtn, Loading, ProgressBar, Screen, Segmented, StatCard, Txt } from '@/components/ui';
import { notify } from '@/store/toast';
import { useTheme } from '@/theme';
import { draftFromProgramDay, draftFromWorkout } from '@/utils/draft';
import { fmtDate, fmtDateShort, fmtNum, ordinal, STATUS_META, today, weekdayShort } from '@/utils/format';
import { openWorkout } from '@/utils/navigation';
import { activateProgram, deleteProgram } from '@/utils/programs';
import { useAsync } from '@/utils/useAsync';

export default function ProgramDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: p, loading, refreshing, error, refresh } = useAsync(() => api.program(id), id);
  const [week, setWeek] = useState<number | null>(null);

  if (!p)
    return (
      <Screen back title="Proqram">
        {loading ? <Loading /> : <ErrorBox text={error ?? 'Proqram tapılmadı'} />}
      </Screen>
    );

  const days = p.days ?? [];
  const weeks = p.weekStats.length;
  const byKey = new Map(days.map((d) => [`${d.week}-${d.dayIndex}`, d]));
  // Default to the week containing today.
  const currentWeek = Math.min(weeks, Math.max(1, Math.floor(dayjs(today()).diff(p.startDate, 'day') / 7) + 1));
  const w = week ?? currentWeek;
  const ws = p.weekStats[w - 1];

  const viewResult = async (d: ProgramDay) => {
    try {
      openWorkout(draftFromWorkout(await api.workout(d.workouts[0].id)));
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  return (
    <Screen
      back
      title={p.name}
      subtitle={`${p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} · ${fmtDate(p.startDate)} — ${fmtDate(p.endDate)}`}
      onRefresh={refresh}
      refreshing={refreshing}
      action={
        <IconBtn icon="create-outline" glass label="Redaktə" onPress={() => router.push({ pathname: '/program/edit', params: { id: p.id } })} />
      }
    >
      <View style={{ gap: 14 }}>
        {p.description ? <Txt color="secondary">{p.description}</Txt> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {p.isActive ? (
            <Chip variant="filled" color="primary" icon="checkmark-circle" label="Aktiv proqram" />
          ) : (
            <Button title="Aktiv et" variant="tonal" size="sm" icon="flash-outline" onPress={() => activateProgram(p)} />
          )}
          <View style={{ flex: 1 }} />
          <Button title="Sil" variant="text" color="error" size="sm" icon="trash-outline" onPress={() => deleteProgram(p, () => router.back())} />
        </View>

        <Grid2>
          {[
            <StatCard key="p" icon="trending-up" label="İcra" value={`${p.stats.progress}%`} />,
            <StatCard key="c" icon="checkmark-circle" label="Tamamlanıb" value={p.stats.completed} color="success" />,
            <StatCard key="m" icon="close-circle" label="Buraxılıb" value={p.stats.missed} color="error" />,
            <StatCard key="r" icon="hourglass" label="Qalıb" value={p.stats.remaining} color="warning" />,
          ]}
        </Grid2>

        {weeks > 1 && (
          <Segmented value={w} onChange={setWeek} options={p.weekStats.map((x) => ({ value: x.week, label: ordinal(x.week) }))} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt variant="h3">{weeks > 1 ? `${ordinal(w)} həftə` : 'Həftə planı'}</Txt>
          <View style={{ flex: 1 }}>
            <ProgressBar value={ws?.planned ? (ws.completed / ws.planned) * 100 : 0} color="success" />
          </View>
          <Txt variant="body2" color="secondary">
            {ws?.completed ?? 0}/{ws?.planned ?? 0}
          </Txt>
        </View>

        {Array.from({ length: 7 }, (_, di) => {
          const date = dayjs(p.startDate).add((w - 1) * 7 + di, 'day').format('YYYY-MM-DD');
          const d = byKey.get(`${w}-${di + 1}`);
          const isToday = date === today();
          const meta = d ? STATUS_META[d.status] : null;
          const accent = d ? (d.status === 'done' ? t.success : d.status === 'missed' ? t.error : t.primary) : 'transparent';
          return (
            <Glass
              key={di}
              padding={14}
              style={[{ opacity: d ? 1 : 0.75 }, isToday && { borderColor: t.primary, borderWidth: 1.5 }]}
            >
              <View style={{ position: 'absolute', left: -14, top: -14, bottom: -14, width: 4, backgroundColor: accent }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: d ? 8 : 0 }}>
                <Txt weight="700" style={{ flex: 1 }}>
                  {weekdayShort(date)}, {fmtDateShort(date)}
                </Txt>
                {meta && <Chip small color={meta.color} variant={meta.color ? 'filled' : 'soft'} label={meta.label} />}
              </View>
              {d ? (
                <>
                  <Txt variant="h3" style={{ marginBottom: 4 }}>
                    {d.title}
                  </Txt>
                  <View style={{ gap: 2, marginBottom: 10 }}>
                    {d.exercises.map((e, i) => (
                      <Txt key={i} variant="body2" color="secondary">
                        • {e.exercise?.name} · {e.sets}×{e.reps}
                        {e.targetWeightKg ? ` @${fmtNum(e.targetWeightKg, 1)}kg` : ''}
                      </Txt>
                    ))}
                  </View>
                  {d.status === 'done' ? (
                    <Button title="Nəticəyə bax" icon="eye-outline" variant="tonal" color="success" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => viewResult(d)} />
                  ) : (
                    <Button
                      title="Qeyd et"
                      icon="play"
                      variant={d.status === 'today' ? 'contained' : 'tonal'}
                      size="sm"
                      style={{ alignSelf: 'flex-start' }}
                      onPress={() => openWorkout(draftFromProgramDay(d))}
                    />
                  )}
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons name="bed-outline" size={16} color={t.textSecondary} />
                  <Txt variant="body2" color="secondary">
                    İstirahət
                  </Txt>
                </View>
              )}
            </Glass>
          );
        })}
      </View>
    </Screen>
  );
}
