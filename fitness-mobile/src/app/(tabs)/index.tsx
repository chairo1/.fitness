import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { api } from '@/api/client';
import BodyMap from '@/components/bodymap/BodyMap';
import { BarChart, Donut, LineChart } from '@/components/charts';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorBox,
  Grid2,
  IconBtn,
  Loading,
  ProgressBar,
  Screen,
  StatCard,
  Txt,
} from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { radius, useTheme } from '@/theme';
import { draftFromProgramDay, emptyDraft } from '@/utils/draft';
import { fmtDate, fmtDateShort, fmtNum, fmtVolume, MUSCLE_LABELS, STATUS_META, weekday } from '@/utils/format';
import { openWorkout } from '@/utils/navigation';
import { useAsync } from '@/utils/useAsync';

export default function DashboardScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data, loading, refreshing, error, refresh } = useAsync(api.dashboard);

  const header = {
    title: `Salam, ${user?.name?.split(' ')[0] ?? ''} 👋`,
    subtitle: 'Göstəriciləriniz bir baxışda',
    action: <IconBtn icon="add" glass color={t.primary} label="Məşq əlavə et" onPress={() => openWorkout(emptyDraft())} />,
  };

  if (!data)
    return (
      <Screen {...header} tabs onRefresh={refresh} refreshing={refreshing}>
        {loading ? <Loading /> : <ErrorBox text={error ?? 'Məlumat yüklənmədi'} />}
      </Screen>
    );

  const { totals, weekly, records, muscles, recent, body, activeProgram } = data;
  const palette = [t.primary, t.secondary, t.success, t.warning, '#38BDF8', '#A78BFA', '#F472B6', '#94A3B8'];
  const latestWeight = body[body.length - 1];
  const nextDay = activeProgram?.nextDay;

  return (
    <Screen {...header} tabs onRefresh={refresh} refreshing={refreshing}>
      <View style={{ gap: 14 }}>
        {error && <ErrorBox text={error} />}
        <Grid2>
          {[
            <StatCard key="w" icon="barbell" label="Bu həftə" value={`${totals.thisWeek} məşq`} hint={`Bu ay: ${totals.thisMonth}`} />,
            <StatCard
              key="v"
              icon="flash"
              label="Həftəlik həcm"
              value={fmtVolume(totals.volumeThisWeek)}
              hint={`Bu ay: ${fmtVolume(totals.volumeThisMonth)}`}
              color="secondary"
            />,
            <StatCard
              key="s"
              icon="flame"
              label="Ardıcıl həftə"
              value={`${totals.weekStreak} həftə`}
              hint={`Cəmi ${totals.total} məşq`}
              color="warning"
            />,
            <StatCard
              key="b"
              icon="scale"
              label="Cari çəki"
              value={latestWeight ? `${fmtNum(latestWeight.weightKg, 1)} kg` : '—'}
              hint={
                latestWeight && user?.goalWeightKg
                  ? `Hədəf: ${fmtNum(user.goalWeightKg, 1)} kg`
                  : latestWeight
                    ? fmtDate(latestWeight.date)
                    : 'Ölçü əlavə edin'
              }
              color="success"
            />,
          ]}
        </Grid2>

        <Card title="Aktiv proqram" action={<Button title="Hamısı" variant="text" size="sm" onPress={() => router.push('/programs')} />}>
          {activeProgram ? (
            <View style={{ gap: 14 }}>
              <Pressable onPress={() => router.push(`/program/${activeProgram.id}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Txt variant="h3" style={{ flexShrink: 1 }} numberOfLines={1}>
                    {activeProgram.name}
                  </Txt>
                  <Chip small label={activeProgram.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} />
                </View>
                <Txt variant="body2" color="secondary">
                  {fmtDate(activeProgram.startDate)} — {fmtDate(activeProgram.endDate)}
                </Txt>
              </Pressable>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt variant="body2" color="secondary">
                    {activeProgram.stats.completed}/{activeProgram.stats.totalDays} gün tamamlandı
                    {activeProgram.stats.missed > 0 && ` · ${activeProgram.stats.missed} buraxılıb`}
                  </Txt>
                  <Txt variant="body2" weight="700">
                    {activeProgram.stats.progress}%
                  </Txt>
                </View>
                <ProgressBar value={activeProgram.stats.progress} />
              </View>
              {nextDay ? (
                <View style={{ padding: 14, borderRadius: radius.md, backgroundColor: t.hover, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="caption" color="secondary">
                        {nextDay.status === 'today' ? 'Bu günün planı' : `Növbəti: ${weekday(nextDay.date)}, ${fmtDateShort(nextDay.date)}`}
                      </Txt>
                      <Txt weight="700">{nextDay.title}</Txt>
                    </View>
                    <Chip small color={STATUS_META[nextDay.status].color} label={STATUS_META[nextDay.status].label} />
                  </View>
                  <View style={{ gap: 3 }}>
                    {nextDay.exercises.map((e, i) => (
                      <Txt key={i} variant="body2" color="secondary">
                        • {e.exercise?.name} — {e.sets}×{e.reps}
                        {e.targetWeightKg ? ` @ ${fmtNum(e.targetWeightKg, 1)} kg` : ''}
                      </Txt>
                    ))}
                  </View>
                  {nextDay.status === 'today' && (
                    <Button title="Nəticəni qeyd et" icon="play" size="sm" onPress={() => openWorkout(draftFromProgramDay(nextDay))} />
                  )}
                </View>
              ) : (
                <Txt color="secondary">Proqramda qalan gün yoxdur 🎉</Txt>
              )}
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              text="Hələ aktiv proqramınız yoxdur"
              action={<Button title="Proqram yarat" variant="outlined" size="sm" onPress={() => router.push('/program/edit')} />}
            />
          )}
        </Card>

        <Card title="Əzələ xəritəsi">
          <BodyMap sets={Object.fromEntries(muscles.map((m) => [m.muscleGroup, m.sets]))} />
        </Card>

        <Card title="Həftəlik həcm" action={<Txt variant="caption" color="secondary">son 12 həftə</Txt>}>
          <BarChart labels={weekly.map((w) => fmtDateShort(w.week))} values={weekly.map((w) => w.volume)} format={fmtVolume} />
        </Card>

        <Card title="Əzələ qrupları" action={<Txt variant="caption" color="secondary">30 gün</Txt>}>
          {muscles.length ? (
            <Donut
              data={muscles.map((m, i) => ({ label: MUSCLE_LABELS[m.muscleGroup], value: m.sets, color: palette[i % palette.length] }))}
              centerValue={String(muscles.reduce((s, m) => s + m.sets, 0))}
              centerLabel="set"
            />
          ) : (
            <EmptyState text="Son 30 gündə məşq yoxdur" />
          )}
        </Card>

        <Card title="Şəxsi rekordlar">
          {records.length ? (
            <View style={{ gap: 12 }}>
              {records.map((r, i) => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons
                    name="trophy"
                    size={22}
                    color={i === 0 ? '#F5B301' : i === 1 ? '#A8B3C4' : i === 2 ? '#CD7F32' : t.textDisabled}
                  />
                  <View style={{ flex: 1 }}>
                    <Txt weight="600" numberOfLines={1}>
                      {r.name}
                    </Txt>
                    <Txt variant="caption" color="secondary">
                      {MUSCLE_LABELS[r.muscleGroup]} · təxmini 1RM {fmtNum(r.est1rm, 1)} kg
                    </Txt>
                  </View>
                  <Txt weight="800">{fmtNum(r.maxWeight, 1)} kg</Txt>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="trophy-outline" text="Çəki ilə məşq qeyd etdikcə rekordlar burada görünəcək" />
          )}
        </Card>

        <Card title="Çəki dinamikası" action={<Button title="Ətraflı" variant="text" size="sm" onPress={() => router.push('/profile')} />}>
          {body.length > 1 ? (
            <LineChart
              labels={body.map((b) => fmtDateShort(b.date))}
              series={[{ data: body.map((b) => b.weightKg), color: t.success, area: true, label: 'Çəki' }]}
              min={Math.floor(Math.min(...body.map((b) => b.weightKg)) - 2)}
              format={(v) => fmtNum(v, 1)}
            />
          ) : (
            <EmptyState text="Qrafik üçün ən azı 2 ölçü lazımdır" />
          )}
        </Card>

        <Card title="Son məşqlər" action={<Button title="Hamısı" variant="text" size="sm" onPress={() => router.push('/workouts')} />}>
          {recent.length ? (
            <View style={{ gap: 4 }}>
              {recent.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => router.push('/workouts')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    borderRadius: radius.md,
                    backgroundColor: pressed ? t.hover : 'transparent',
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Txt weight="600" numberOfLines={1}>
                      {w.title}
                    </Txt>
                    <Txt variant="caption" color="secondary">
                      {fmtDate(w.date)} · {w.sets} set{w.durationMin ? ` · ${w.durationMin} dəq` : ''}
                    </Txt>
                  </View>
                  <Txt weight="700" color="primary">
                    {fmtVolume(w.volume)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="barbell-outline"
              text="İlk məşqinizi əlavə edin"
              action={<Button title="Məşq əlavə et" variant="outlined" size="sm" onPress={() => openWorkout(emptyDraft())} />}
            />
          )}
        </Card>

        <Card title="Həftəlik məşq sayı">
          <LineChart
            labels={weekly.map((w) => fmtDateShort(w.week))}
            series={[{ data: weekly.map((w) => w.workouts), color: t.secondary, label: 'Məşq' }]}
            min={0}
          />
        </Card>
      </View>
    </Screen>
  );
}
