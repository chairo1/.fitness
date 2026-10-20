import AddRounded from '@mui/icons-material/AddRounded';
import { Box, Button, Grid, LinearProgress, Link, Stack, Typography, useTheme } from '@mui/material';
import { BarChart, LineChart } from '@mui/x-charts';
import { lazy, Suspense, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../api/client';
import BodyMap from '../components/bodymap/BodyMap';
import { EmptyState, Loading, Num, PageHeader, Panel, StatStrip, StatusLabel } from '../components/common';
import WorkoutDialog, { draftFromProgramDay, emptyDraft, type WorkoutDraft } from '../components/WorkoutDialog';
import { useAuthStore } from '../store/auth';
import { fmtDate, fmtDateShort, fmtDayMonth, fmtNum, fmtVolume, MUSCLE_LABELS, today, weekday, weekdayShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import dayjs from 'dayjs';

// x-charts reads categoryGapRatio on band axes, but its 7.x typings don't expose it.
const gap = (categoryGapRatio: number) => ({ categoryGapRatio }) as object;

// three.js + the model are large: load the 3D map only after the dashboard has rendered.
const BodyModel3D = lazy(() => import('../components/bodymap/BodyModel3D'));

function MoreLink({ to, children }: { to: string; children: string }) {
  return (
    <Link component={RouterLink} to={to} variant="body2" color="text.secondary" fontWeight={500} underline="hover" whiteSpace="nowrap">
      {children} →
    </Link>
  );
}

/** One rule-separated row: left label, right figure. */
function Row({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={2}
      py={1.25}
      sx={{ borderBottom: last ? 0 : (t) => `1px dotted ${t.tokens.ruleStrong}` }}
    >
      {children}
    </Stack>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const tk = theme.tokens;
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, reload } = useAsync(api.dashboard);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [use2d, setUse2d] = useState(false); // no WebGL, or the model failed to load

  if (loading && !data) return <Loading />;
  if (error || !data) return <EmptyState text={error ?? 'Məlumat yüklənmədi'} />;

  const { totals, weekly, records, muscles, recent, body, activeProgram } = data;
  const muscleSets = Object.fromEntries(muscles.map((m) => [m.muscleGroup, m.sets]));
  const maxSets = Math.max(1, ...muscles.map((m) => m.sets));
  const latestWeight = body[body.length - 1];
  const nextDay = activeProgram?.nextDay;
  const weekLabels = weekly.map((w) => fmtDateShort(w.week));

  return (
    <>
      <PageHeader
        title={`Salam, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle={`${weekday(today())}, ${fmtDayMonth(today())}`}
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDraft(emptyDraft())}>
            Məşq əlavə et
          </Button>
        }
      />

      <Stack gap={3}>
        <StatStrip
          items={[
            { label: 'Bu həftə', value: totals.thisWeek, unit: 'məşq', hint: `Bu ay: ${totals.thisMonth}` },
            { label: 'Həftəlik həcm', value: fmtVolume(totals.volumeThisWeek), hint: `Bu ay: ${fmtVolume(totals.volumeThisMonth)}` },
            { label: 'Ardıcıl seriya', value: totals.weekStreak, unit: 'həftə', hint: `Cəmi ${totals.total} məşq` },
            {
              label: 'Cari çəki',
              value: latestWeight ? fmtNum(latestWeight.weightKg, 1) : '—',
              unit: latestWeight ? 'kg' : undefined,
              hint: latestWeight && user?.goalWeightKg
                ? `Hədəf: ${fmtNum(user.goalWeightKg, 1)} kg`
                : latestWeight
                  ? fmtDate(latestWeight.date)
                  : 'Ölçü əlavə edin',
            },
          ]}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} lg={5}>
            <Panel
              title={activeProgram ? activeProgram.name : 'Aktiv proqram'}
              meta={
                activeProgram &&
                `${activeProgram.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} · ${fmtDate(activeProgram.startDate)} — ${fmtDate(activeProgram.endDate)}`
              }
              action={<MoreLink to={activeProgram ? `/programs/${activeProgram.id}` : '/programs'}>Proqram</MoreLink>}
              flush
            >
              {activeProgram ? (
                <>
                  <Box px={{ xs: 2, sm: 2.75 }} py={2}>
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        {activeProgram.stats.completed}/{activeProgram.stats.totalDays} gün tamamlandı
                        {activeProgram.stats.missed > 0 && ` · ${activeProgram.stats.missed} buraxılıb`}
                      </Typography>
                      <Num sx={{ fontSize: 14, fontWeight: 600 }}>{activeProgram.stats.progress}%</Num>
                    </Stack>
                    <LinearProgress variant="determinate" value={activeProgram.stats.progress} />
                  </Box>
                  {nextDay ? (
                    <Box sx={{ borderTop: `1.5px solid ${tk.ink}` }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} px={{ xs: 2, sm: 2.75 }} py={1.75}>
                        <Box minWidth={0}>
                          <Typography variant="body2" color="text.secondary">
                            {nextDay.status === 'today' ? 'Bu günün planı' : `Növbəti: ${weekday(nextDay.date)}, ${fmtDateShort(nextDay.date)}`}
                          </Typography>
                          <Typography variant="h6" component="p" noWrap>
                            {nextDay.title}
                          </Typography>
                        </Box>
                        <StatusLabel status={nextDay.status} />
                      </Stack>
                      {nextDay.exercises.map((e, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          gap={2}
                          px={{ xs: 2, sm: 2.75 }}
                          py={1.25}
                          sx={{ borderTop: `1px solid ${tk.rule}` }}
                        >
                          <Typography flex={1} minWidth={0} noWrap>
                            {e.exercise?.name}
                          </Typography>
                          <Num sx={{ fontSize: 14, color: 'text.secondary' }}>
                            {e.sets} × {e.reps}
                          </Num>
                          <Num sx={{ fontSize: 14, width: 64, textAlign: 'right' }}>
                            {e.targetWeightKg ? `${fmtNum(e.targetWeightKg, 1)} kg` : '—'}
                          </Num>
                        </Stack>
                      ))}
                      {nextDay.status === 'today' && (
                        <Box px={{ xs: 2, sm: 2.75 }} py={2} sx={{ borderTop: `1px solid ${tk.rule}` }}>
                          <Button variant="contained" onClick={() => setDraft(draftFromProgramDay(nextDay))}>
                            Nəticəni qeyd et
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box px={{ xs: 2, sm: 2.75 }} pb={2.5}>
                      <Typography color="text.secondary">Proqramın bütün günləri keçib. Yenisini qurmağın vaxtıdır.</Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Box px={{ xs: 2, sm: 2.75 }}>
                  <EmptyState
                    text="Aktiv proqram yoxdur. Həftəlik və ya aylıq plan qursanız, hər günün planı burada görünəcək."
                    action={
                      <Button variant="outlined" component={RouterLink} to="/programs/new">
                        Proqram qur
                      </Button>
                    }
                  />
                </Box>
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Panel title="Həftəlik həcm" meta="Son 12 həftə, kg">
              <BarChart
                height={270}
                xAxis={[
                  {
                    scaleType: 'band' as const,
                    data: weekLabels,
                    ...gap(0.38),
                    colorMap: {
                      type: 'ordinal',
                      values: weekLabels,
                      colors: weekLabels.map((_, i) => (i === weekLabels.length - 1 ? tk.red : tk.ink)),
                    },
                  },
                ]}
                yAxis={[{ valueFormatter: (v: number) => fmtVolume(v) }]}
                series={[{ data: weekly.map((w) => w.volume), label: 'Həcm', valueFormatter: (v) => fmtVolume(v ?? 0) }]}
                margin={{ left: 60, right: 8, top: 12, bottom: 28 }}
                slotProps={{ legend: { hidden: true } }}
                grid={{ horizontal: true }}
                sx={{ '& .MuiChartsGrid-line': { stroke: tk.rule, strokeDasharray: '2 4' } }}
              />
            </Panel>
          </Grid>

          <Grid item xs={12}>
            <Panel title="Əzələ xəritəsi" meta="Son 30 günün setləri qruplar üzrə">
              {use2d ? (
                <BodyMap sets={muscleSets} />
              ) : (
                <Suspense fallback={<Loading />}>
                  <BodyModel3D sets={muscleSets} onUnsupported={() => setUse2d(true)} />
                </Suspense>
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Panel title="Rekordlar" meta="Ən ağır set və təxmini 1RM">
              {records.length ? (
                <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                  {records.map((r, i) => (
                    <Box component="li" key={r.id}>
                      <Row last={i === records.length - 1}>
                        <Num sx={{ fontSize: 13, color: i === 0 ? 'secondary.main' : 'text.secondary', width: 18 }}>{i + 1}</Num>
                        <Box flex={1} minWidth={0}>
                          <Typography fontWeight={600} noWrap>
                            {r.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {MUSCLE_LABELS[r.muscleGroup]} · 1RM ≈ {fmtNum(r.est1rm, 1)} kg
                          </Typography>
                        </Box>
                        <Num sx={{ fontWeight: 600 }}>{fmtNum(r.maxWeight, 1)} kg</Num>
                      </Row>
                    </Box>
                  ))}
                </Box>
              ) : (
                <EmptyState text="Çəki ilə set yazdıqca ən yaxşı nəticələriniz burada toplanacaq." />
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Panel title="Əzələ qrupları" meta="Setlər · son 30 gün">
              {muscles.length ? (
                [...muscles]
                  .sort((a, b) => b.sets - a.sets)
                  .map((m, i, arr) => (
                    <Row key={m.muscleGroup} last={i === arr.length - 1}>
                      <Typography sx={{ width: 104, flexShrink: 0 }} noWrap>
                        {MUSCLE_LABELS[m.muscleGroup].replace(' (core)', '')}
                      </Typography>
                      <Box flex={1} height={6} bgcolor={tk.sunken} position="relative" aria-hidden>
                        <Box
                          position="absolute"
                          left={0}
                          top={0}
                          bottom={0}
                          width={`${(m.sets / maxSets) * 100}%`}
                          bgcolor={i === arr.length - 1 && arr.length > 2 ? tk.red : tk.ink}
                        />
                      </Box>
                      <Num sx={{ width: 32, textAlign: 'right' }}>{m.sets}</Num>
                    </Row>
                  ))
              ) : (
                <EmptyState text="Son 30 gündə məşq yoxdur." />
              )}
              {muscles.length > 2 && (
                <Typography variant="body2" color="text.secondary" mt={1.5}>
                  Qırmızı — ən az işlənən qrup.
                </Typography>
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Panel title="Çəki" meta={latestWeight ? `Son ölçü: ${fmtDate(latestWeight.date)}` : undefined} action={<MoreLink to="/body">Ölçülər</MoreLink>}>
              {body.length > 1 ? (
                <LineChart
                  height={230}
                  xAxis={[{ scaleType: 'point', data: body.map((b) => fmtDateShort(b.date)) }]}
                  series={[{ data: body.map((b) => b.weightKg), label: 'Çəki (kg)', color: tk.ink, curve: 'linear' }]}
                  yAxis={[{ min: Math.floor(Math.min(...body.map((b) => b.weightKg)) - 2) }]}
                  margin={{ left: 40, right: 12, top: 12, bottom: 28 }}
                  slotProps={{ legend: { hidden: true } }}
                  grid={{ horizontal: true }}
                  sx={{ '& .MuiChartsGrid-line': { stroke: tk.rule, strokeDasharray: '2 4' } }}
                />
              ) : (
                <EmptyState
                  text="Qrafik üçün ən azı iki ölçü lazımdır."
                  action={
                    <Button variant="outlined" size="small" component={RouterLink} to="/body">
                      Ölçü əlavə et
                    </Button>
                  }
                />
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} md={6}>
            <Panel title="Son məşqlər" action={<MoreLink to="/workouts">Jurnal</MoreLink>} flush>
              {recent.length ? (
                recent.map((w, i) => (
                  <Stack
                    key={w.id}
                    component={RouterLink}
                    to="/workouts"
                    direction="row"
                    alignItems="center"
                    gap={2}
                    px={{ xs: 2, sm: 2.75 }}
                    py={1.5}
                    sx={{
                      color: 'inherit',
                      textDecoration: 'none',
                      borderTop: i ? `1px solid ${tk.rule}` : 0,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box width={44} flexShrink={0}>
                      <Num sx={{ display: 'block', fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>{dayjs(w.date).date()}</Num>
                      <Num sx={{ fontSize: 12, color: 'text.secondary' }}>{weekdayShort(w.date)}</Num>
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={600} noWrap>
                        {w.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {w.sets} set{w.durationMin ? ` · ${w.durationMin} dəq` : ''}
                      </Typography>
                    </Box>
                    <Num sx={{ fontWeight: 600 }}>{w.volume ? fmtVolume(w.volume) : '—'}</Num>
                  </Stack>
                ))
              ) : (
                <Box px={{ xs: 2, sm: 2.75 }}>
                  <EmptyState
                    text="Hələ məşq yazılmayıb. İlk məşqdən sonra burada görünəcək."
                    action={
                      <Button variant="outlined" onClick={() => setDraft(emptyDraft())}>
                        Məşq əlavə et
                      </Button>
                    }
                  />
                </Box>
              )}
            </Panel>
          </Grid>

          <Grid item xs={12} md={6}>
            <Panel title="Həftədə neçə məşq" meta="Son 12 həftə">
              <BarChart
                height={240}
                xAxis={[{ scaleType: 'band' as const, data: weekLabels, ...gap(0.55) }]}
                yAxis={[{ min: 0, tickMinStep: 1 }]}
                series={[{ data: weekly.map((w) => w.workouts), label: 'Məşq', color: tk.muted }]}
                margin={{ left: 32, right: 8, top: 12, bottom: 28 }}
                slotProps={{ legend: { hidden: true } }}
                grid={{ horizontal: true }}
                sx={{ '& .MuiChartsGrid-line': { stroke: tk.rule, strokeDasharray: '2 4' } }}
              />
            </Panel>
          </Grid>
        </Grid>
      </Stack>

      <WorkoutDialog
        open={!!draft}
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          reload();
        }}
      />
    </>
  );
}
