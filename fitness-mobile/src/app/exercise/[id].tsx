import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { api } from '@/api/client';
import { BarChart, LineChart } from '@/components/charts';
import { Card, Chip, EmptyState, ErrorBox, Glass, Grid2, Loading, Screen, StatCard, Txt } from '@/components/ui';
import { useExercisesStore } from '@/store/exercises';
import { useTheme } from '@/theme';
import { fmtDate, fmtDateShort, fmtNum, fmtVolume, MUSCLE_LABELS } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';

export default function ExerciseProgressScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercisesStore((s) => s.items.find((e) => e.id === id));
  const { data, loading, refreshing, error, refresh } = useAsync(() => api.exerciseProgress(id), id);
  const points = data ?? [];
  const best = points.reduce((m, p) => Math.max(m, p.maxWeight), 0);
  const best1rm = points.reduce((m, p) => Math.max(m, p.est1rm), 0);
  const last = points[points.length - 1];
  const labels = points.map((p) => fmtDateShort(p.date));

  return (
    <Screen
      back
      title={exercise?.name ?? 'Hərəkət'}
      subtitle={exercise ? MUSCLE_LABELS[exercise.muscleGroup] : undefined}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      {error && <ErrorBox text={error} />}
      {loading && !data ? (
        <Loading />
      ) : points.length === 0 ? (
        <Glass>
          <EmptyState icon="stats-chart-outline" text="Bu hərəkət üçün hələ nəticə qeyd olunmayıb" />
        </Glass>
      ) : (
        <View style={{ gap: 14 }}>
          <Grid2>
            {[
              <StatCard key="b" icon="trophy" label="Rekord" value={`${fmtNum(best, 1)} kg`} color="warning" />,
              <StatCard key="r" icon="rocket" label="Təxmini 1RM" value={`${fmtNum(best1rm, 1)} kg`} color="secondary" />,
              <StatCard key="l" icon="time" label="Son nəticə" value={`${fmtNum(last.maxWeight, 1)} kg`} hint={fmtDate(last.date)} />,
              <StatCard key="n" icon="calendar" label="Məşq sayı" value={points.length} color="success" />,
            ]}
          </Grid2>

          <Card title="Çəki irəliləyişi">
            <LineChart
              labels={labels}
              height={230}
              format={(v) => fmtNum(v, 1)}
              series={[
                { data: points.map((p) => p.maxWeight), color: t.primary, label: 'Maks. çəki', area: true },
                { data: points.map((p) => Math.round(p.est1rm * 10) / 10), color: t.secondary, label: 'Təxmini 1RM', dashed: true },
              ]}
            />
          </Card>

          <Card title="Həcm (hər məşq)">
            <BarChart labels={labels} values={points.map((p) => p.volume)} color={t.success} format={fmtVolume} />
          </Card>

          <Card title="Tarixçə">
            {[...points].reverse().map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 }}>
                <Txt style={{ flex: 1 }}>{fmtDate(p.date)}</Txt>
                <Chip small label={`${p.sets} set · ${p.reps} təkrar`} />
                <Txt weight="700" style={{ width: 72, textAlign: 'right' }}>
                  {fmtNum(p.maxWeight, 1)} kg
                </Txt>
              </View>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}
