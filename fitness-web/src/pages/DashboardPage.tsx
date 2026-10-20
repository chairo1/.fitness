import AddRounded from '@mui/icons-material/AddRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import ScaleRounded from '@mui/icons-material/ScaleRounded';
import {
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
import { lazy, Suspense, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { EmptyState, GlassCard, Loading, PageHeader, StatCard } from '../components/common';
import WorkoutDialog, { draftFromProgramDay, emptyDraft, type WorkoutDraft } from '../components/WorkoutDialog';
import { useAuthStore } from '../store/auth';
import { fmtDate, fmtDateShort, fmtNum, fmtVolume, MUSCLE_LABELS, STATUS_META, weekday } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import BodyMap from '../components/bodymap/BodyMap';

// three.js + the model are large: load the 3D map only after the dashboard has rendered.
const BodyModel3D = lazy(() => import('../components/bodymap/BodyModel3D'));

export default function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, reload } = useAsync(api.dashboard);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [use2d, setUse2d] = useState(false); // no WebGL, or the model failed to load

  if (loading && !data) return <Loading />;
  if (error || !data) return <EmptyState text={error ?? 'Məlumat yüklənmədi'} />;

  const { totals, weekly, records, muscles, recent, body, activeProgram } = data;
  const muscleSets = Object.fromEntries(muscles.map((m) => [m.muscleGroup, m.sets]));
  const palette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    '#38BDF8',
    '#A78BFA',
    '#F472B6',
    '#94A3B8',
  ];
  const latestWeight = body[body.length - 1];
  const nextDay = activeProgram?.nextDay;

  return (
    <>
      <PageHeader
        title={`Salam, ${user?.name?.split(' ')[0] ?? ''} 👋`}
        subtitle="Göstəriciləriniz və irəliləyişiniz bir baxışda"
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDraft(emptyDraft())}>
            Məşq əlavə et
          </Button>
        }
      />

      <Grid container spacing={2.5}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<FitnessCenterRounded />}
            label="Bu həftə"
            value={`${totals.thisWeek} məşq`}
            hint={`Bu ay: ${totals.thisMonth}`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<BoltRounded />}
            label="Həftəlik həcm"
            value={fmtVolume(totals.volumeThisWeek)}
            hint={`Bu ay: ${fmtVolume(totals.volumeThisMonth)}`}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<LocalFireDepartmentRounded />}
            label="Ardıcıl həftə"
            value={`${totals.weekStreak} həftə`}
            hint={`Cəmi ${totals.total} məşq`}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<ScaleRounded />}
            label="Cari çəki"
            value={latestWeight ? `${fmtNum(latestWeight.weightKg, 1)} kg` : '—'}
            hint={
              latestWeight && user?.goalWeightKg
                ? `Hədəf: ${fmtNum(user.goalWeightKg, 1)} kg`
                : latestWeight
                  ? fmtDate(latestWeight.date)
                  : 'Ölçü əlavə edin'
            }
            color="success.main"
          />
        </Grid>

        <Grid item xs={12}>
          <GlassCard title="Əzələ xəritəsi">
            {use2d ? (
              <BodyMap sets={muscleSets} />
            ) : (
              <Suspense fallback={<Loading />}>
                <BodyModel3D sets={muscleSets} onUnsupported={() => setUse2d(true)} />
              </Suspense>
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <GlassCard
            title="Aktiv proqram"
            action={
              <Button size="small" component={RouterLink} to="/programs">
                Hamısı
              </Button>
            }
          >
            {activeProgram ? (
              <Stack gap={2}>
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                    <Typography
                      variant="subtitle1"
                      component={RouterLink}
                      to={`/programs/${activeProgram.id}`}
                      sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                    >
                      {activeProgram.name}
                    </Typography>
                    <Chip size="small" label={activeProgram.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {fmtDate(activeProgram.startDate)} — {fmtDate(activeProgram.endDate)}
                  </Typography>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {activeProgram.stats.completed}/{activeProgram.stats.totalDays} gün tamamlandı
                      {activeProgram.stats.missed > 0 && ` · ${activeProgram.stats.missed} buraxılıb`}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {activeProgram.stats.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={activeProgram.stats.progress} />
                </Box>
                {nextDay ? (
                  <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {nextDay.status === 'today' ? 'Bu günün planı' : `Növbəti: ${weekday(nextDay.date)}, ${fmtDateShort(nextDay.date)}`}
                        </Typography>
                        <Typography fontWeight={700}>{nextDay.title}</Typography>
                      </Box>
                      <Chip size="small" color={STATUS_META[nextDay.status].color} label={STATUS_META[nextDay.status].label} />
                    </Stack>
                    <Stack gap={0.5} mb={1.5}>
                      {nextDay.exercises.map((e, i) => (
                        <Typography key={i} variant="body2" color="text.secondary">
                          • {e.exercise?.name} — {e.sets}×{e.reps}
                          {e.targetWeightKg ? ` @ ${fmtNum(e.targetWeightKg, 1)} kg` : ''}
                        </Typography>
                      ))}
                    </Stack>
                    {nextDay.status === 'today' && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowRounded />}
                        onClick={() => setDraft(draftFromProgramDay(nextDay))}
                      >
                        Nəticəni qeyd et
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Typography color="text.secondary">Proqramda qalan gün yoxdur 🎉</Typography>
                )}
              </Stack>
            ) : (
              <EmptyState
                icon={<CalendarMonthRounded fontSize="inherit" />}
                text="Hələ aktiv proqramınız yoxdur"
                action={
                  <Button variant="outlined" component={RouterLink} to="/programs/new">
                    Proqram yarat
                  </Button>
                }
              />
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <GlassCard title="Həftəlik həcm (son 12 həftə)">
            <BarChart
              height={260}
              xAxis={[{ scaleType: 'band', data: weekly.map((w) => fmtDateShort(w.week)) }]}
              yAxis={[{ valueFormatter: (v: number) => fmtVolume(v) }]}
              series={[
                {
                  data: weekly.map((w) => w.volume),
                  label: 'Həcm',
                  color: theme.palette.primary.main,
                  valueFormatter: (v) => fmtVolume(v ?? 0),
                },
              ]}
              margin={{ left: 64, right: 8, top: 16, bottom: 28 }}
              slotProps={{ legend: { hidden: true } }}
              borderRadius={8}
            />
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <GlassCard title="Əzələ qrupları (30 gün)">
            {muscles.length ? (
              <PieChart
                height={240}
                colors={palette}
                series={[
                  {
                    data: muscles.map((m, i) => ({ id: i, value: m.sets, label: MUSCLE_LABELS[m.muscleGroup] })),
                    innerRadius: 55,
                    paddingAngle: 2,
                    cornerRadius: 6,
                    valueFormatter: (v) => `${v.value} set`,
                  },
                ]}
                margin={{ right: 140 }}
              />
            ) : (
              <EmptyState text="Son 30 gündə məşq yoxdur" />
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <GlassCard title="Şəxsi rekordlar">
            {records.length ? (
              <Stack gap={1.5}>
                {records.map((r, i) => (
                  <Stack key={r.id} direction="row" alignItems="center" gap={1.5}>
                    <EmojiEventsRounded
                      sx={{ color: i === 0 ? '#F5B301' : i === 1 ? '#A8B3C4' : i === 2 ? '#CD7F32' : 'text.disabled' }}
                    />
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={600} noWrap>
                        {r.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {MUSCLE_LABELS[r.muscleGroup]} · təxmini 1RM {fmtNum(r.est1rm, 1)} kg
                      </Typography>
                    </Box>
                    <Typography fontWeight={800}>{fmtNum(r.maxWeight, 1)} kg</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <EmptyState text="Çəki ilə məşq qeyd etdikcə rekordlar burada görünəcək" />
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <GlassCard
            title="Çəki dinamikası"
            action={
              <Button size="small" component={RouterLink} to="/body">
                Ətraflı
              </Button>
            }
          >
            {body.length > 1 ? (
              <LineChart
                height={240}
                xAxis={[{ scaleType: 'point', data: body.map((b) => fmtDateShort(b.date)) }]}
                series={[
                  {
                    data: body.map((b) => b.weightKg),
                    label: 'Çəki (kg)',
                    color: theme.palette.success.main,
                    area: true,
                    curve: 'monotoneX',
                  },
                ]}
                yAxis={[{ min: Math.floor(Math.min(...body.map((b) => b.weightKg)) - 2) }]}
                margin={{ left: 44, right: 12, top: 16, bottom: 28 }}
                slotProps={{ legend: { hidden: true } }}
                sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.15 } }}
              />
            ) : (
              <EmptyState
                text="Qrafik üçün ən azı 2 ölçü lazımdır"
                action={
                  <Button variant="outlined" size="small" component={RouterLink} to="/body">
                    Ölçü əlavə et
                  </Button>
                }
              />
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard
            title="Son məşqlər"
            action={
              <Button size="small" component={RouterLink} to="/workouts">
                Hamısı
              </Button>
            }
          >
            {recent.length ? (
              <List disablePadding>
                {recent.map((w) => (
                  <ListItemButton key={w.id} onClick={() => navigate('/workouts')} sx={{ px: 1 }}>
                    <ListItemText
                      primary={w.title}
                      secondary={`${fmtDate(w.date)} · ${w.sets} set${w.durationMin ? ` · ${w.durationMin} dəq` : ''}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Typography fontWeight={700} color="primary.main">
                      {fmtVolume(w.volume)}
                    </Typography>
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <EmptyState
                icon={<FitnessCenterRounded fontSize="inherit" />}
                text="İlk məşqinizi əlavə edin"
                action={
                  <Button variant="outlined" onClick={() => setDraft(emptyDraft())}>
                    Məşq əlavə et
                  </Button>
                }
              />
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard title="Həftəlik məşq sayı">
            <LineChart
              height={240}
              xAxis={[{ scaleType: 'point', data: weekly.map((w) => fmtDateShort(w.week)) }]}
              yAxis={[{ min: 0, tickMinStep: 1 }]}
              series={[
                {
                  data: weekly.map((w) => w.workouts),
                  label: 'Məşq',
                  color: theme.palette.secondary.main,
                  curve: 'monotoneX',
                },
              ]}
              margin={{ left: 36, right: 12, top: 16, bottom: 28 }}
              slotProps={{ legend: { hidden: true } }}
            />
          </GlassCard>
        </Grid>
      </Grid>

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
