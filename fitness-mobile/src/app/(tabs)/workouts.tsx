import dayjs from 'dayjs';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api/client';
import type { Workout } from '@/api/types';
import { Button, Chip, confirm, EmptyState, ErrorBox, Glass, IconBtn, Loading, Screen, Txt } from '@/components/ui';
import { bumpData } from '@/store/data';
import { notify } from '@/store/toast';
import { radius, useTheme } from '@/theme';
import { draftFromWorkout, emptyDraft } from '@/utils/draft';
import { fmtMonth, fmtNum, fmtVolume, weekdayShort } from '@/utils/format';
import { openWorkout } from '@/utils/navigation';
import { useAsync } from '@/utils/useAsync';

const volumeOf = (w: Workout) => w.sets.reduce((s, x) => s + x.reps * x.weightKg, 0);

/** Groups consecutive sets per exercise for a compact summary. */
function summary(w: Workout) {
  const out: { name: string; sets: number; best: number }[] = [];
  for (const s of w.sets) {
    const last = out[out.length - 1];
    if (last && last.name === s.exercise?.name) {
      last.sets++;
      last.best = Math.max(last.best, s.weightKg);
    } else out.push({ name: s.exercise?.name ?? '?', sets: 1, best: s.weightKg });
  }
  return out;
}

function WorkoutCard({ w }: { w: Workout }) {
  const t = useTheme();
  const remove = () =>
    confirm('Məşqi sil', `"${w.title}" məşqi silinsin?`, 'Sil', async () => {
      try {
        await api.deleteWorkout(w.id);
        notify('Məşq silindi');
        bumpData();
      } catch (e) {
        notify(errorMessage(e), 'error');
      }
    });
  return (
    <Glass padding={14} onPress={() => openWorkout(draftFromWorkout(w))} onLongPress={remove}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 52, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, backgroundColor: t.hover, alignSelf: 'flex-start' }}>
          <Txt variant="caption" color="secondary">
            {weekdayShort(w.date)}
          </Txt>
          <Txt variant="h2">{dayjs(w.date).date()}</Txt>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Txt variant="h3" style={{ flexShrink: 1 }}>
              {w.title}
            </Txt>
            {w.programDayId && <Chip small color="primary" label="Proqram" />}
          </View>
          <Txt variant="body2" color="secondary">
            {w.sets.length} set · {fmtVolume(volumeOf(w))}
            {w.durationMin ? ` · ${w.durationMin} dəq` : ''}
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {summary(w).map((s, i) => (
              <Chip key={i} small variant="outlined" label={`${s.name} · ${s.sets}×${s.best ? ` ${fmtNum(s.best, 1)}kg` : ''}`} />
            ))}
          </View>
          {w.notes ? (
            <Txt variant="body2" color="secondary" style={{ fontStyle: 'italic', marginTop: 4 }}>
              {w.notes}
            </Txt>
          ) : null}
        </View>
        <IconBtn icon="trash-outline" size={18} color={t.textSecondary} onPress={remove} label="Sil" />
      </View>
    </Glass>
  );
}

export default function WorkoutsScreen() {
  const t = useTheme();
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const from = month.format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');
  const { data, loading, refreshing, error, refresh } = useAsync(() => api.workouts(from, to), `${from}|${to}`);

  const workouts = data ?? [];
  const totalVolume = workouts.reduce((s, w) => s + volumeOf(w), 0);
  const totalMinutes = workouts.reduce((s, w) => s + (w.durationMin ?? 0), 0);
  const isCurrent = month.isSame(dayjs(), 'month');

  return (
    <Screen
      title="Məşqlər"
      subtitle="Zalda etdiyiniz məşqlərin jurnalı"
      tabs
      onRefresh={refresh}
      refreshing={refreshing}
      action={<IconBtn icon="add" glass color={t.primary} label="Məşq əlavə et" onPress={() => openWorkout(emptyDraft())} />}
    >
      <Glass padding={10} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconBtn icon="chevron-back" onPress={() => setMonth(month.subtract(1, 'month'))} />
          <Txt variant="h3" center style={{ flex: 1 }}>
            {fmtMonth(month)}
          </Txt>
          <IconBtn icon="chevron-forward" disabled={isCurrent} onPress={() => setMonth(month.add(1, 'month'))} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <Chip small color="primary" label={`${workouts.length} məşq`} />
          <Chip small label={`Həcm: ${fmtVolume(totalVolume)}`} />
          <Chip small label={`${fmtNum(totalMinutes)} dəq`} />
        </View>
      </Glass>

      {error && <ErrorBox text={error} />}
      {loading && !data ? (
        <Loading />
      ) : workouts.length === 0 ? (
        <Glass>
          <EmptyState
            icon="calendar-clear-outline"
            text="Bu ay üçün məşq qeyd olunmayıb"
            action={<Button title="Məşq əlavə et" variant="outlined" size="sm" onPress={() => openWorkout(emptyDraft())} />}
          />
        </Glass>
      ) : (
        <View style={{ gap: 12 }}>
          {workouts.map((w) => (
            <WorkoutCard key={w.id} w={w} />
          ))}
          <Txt variant="caption" color="disabled" center>
            Redaktə üçün toxunun · silmək üçün basıb saxlayın
          </Txt>
        </View>
      )}
    </Screen>
  );
}
