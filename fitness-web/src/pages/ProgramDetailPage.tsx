import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import EventBusyRounded from '@mui/icons-material/EventBusyRounded';
import HotelRounded from '@mui/icons-material/HotelRounded';
import PendingActionsRounded from '@mui/icons-material/PendingActionsRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import { Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ProgramDay } from '../api/types';
import { EmptyState, Loading, PageHeader, StatCard } from '../components/common';
import WorkoutDialog, { draftFromProgramDay, draftFromWorkout, type WorkoutDraft } from '../components/WorkoutDialog';
import { notify } from '../store/ui';
import { fmtDate, fmtDateShort, fmtNum, ordinal, STATUS_META, today, weekdayShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import dayjs from 'dayjs';

export default function ProgramDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: p, loading, error, reload } = useAsync(() => api.program(id!), [id]);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);

  if (loading && !p) return <Loading />;
  if (error || !p) return <EmptyState text={error ?? 'Proqram tapılmadı'} />;

  const days = p.days ?? [];
  const weeks = p.weekStats.length;
  const byKey = new Map(days.map((d) => [`${d.week}-${d.dayIndex}`, d]));

  const openWorkout = async (d: ProgramDay) => {
    try {
      setDraft(draftFromWorkout(await api.workout(d.workouts[0].id)));
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const activate = async () => {
    await api.activateProgram(p.id);
    notify('Aktiv proqram dəyişdi');
    reload();
  };

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`${p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} proqram · ${fmtDate(p.startDate)} — ${fmtDate(p.endDate)}`}
        action={
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/programs')}>
              Proqramlar
            </Button>
            {p.isActive ? (
              <Chip color="primary" icon={<CheckCircleRounded />} label="Aktiv proqram" sx={{ height: 36 }} />
            ) : (
              <Button variant="outlined" onClick={activate}>
                Aktiv et
              </Button>
            )}
            <Button variant="contained" startIcon={<EditRounded />} component={RouterLink} to={`/programs/${p.id}/edit`}>
              Redaktə
            </Button>
          </Stack>
        }
      />
      {p.description && (
        <Typography color="text.secondary" mt={-1.5} mb={3}>
          {p.description}
        </Typography>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={6} md={3}>
          <StatCard icon={<TrendingUpRounded />} label="İcra" value={`${p.stats.progress}%`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<CheckCircleRounded />} label="Tamamlanıb" value={p.stats.completed} color="success.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<EventBusyRounded />} label="Buraxılıb" value={p.stats.missed} color="error.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<PendingActionsRounded />} label="Qalıb" value={p.stats.remaining} color="warning.main" />
        </Grid>
      </Grid>

      {Array.from({ length: weeks }, (_, wi) => {
        const ws = p.weekStats[wi];
        return (
          <Box key={wi} mb={3}>
            <Stack direction="row" alignItems="center" gap={2} mb={1.5}>
              <Typography variant="h6" whiteSpace="nowrap">
                {weeks > 1 ? `${ordinal(wi + 1)} həftə` : 'Həftə planı'}
              </Typography>
              <Box flex={1} maxWidth={320}>
                <LinearProgress
                  variant="determinate"
                  color="success"
                  value={ws.planned ? (ws.completed / ws.planned) * 100 : 0}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {ws.completed}/{ws.planned}
              </Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', xl: 'repeat(7, 1fr)' },
              }}
            >
              {Array.from({ length: 7 }, (_, di) => {
                const date = dayjs(p.startDate).add(wi * 7 + di, 'day').format('YYYY-MM-DD');
                const d = byKey.get(`${wi + 1}-${di + 1}`);
                const isToday = date === today();
                const meta = d ? STATUS_META[d.status] : null;
                return (
                  <Card
                    key={di}
                    sx={{
                      outline: isToday ? 2 : 0,
                      outlineColor: 'primary.main',
                      opacity: d ? 1 : 0.7,
                      borderLeft: d ? 4 : undefined,
                      borderLeftColor: d
                        ? d.status === 'done'
                          ? 'success.main'
                          : d.status === 'missed'
                            ? 'error.main'
                            : 'primary.main'
                        : undefined,
                    }}
                  >
                    <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight={700}>
                          {weekdayShort(date)}, {fmtDateShort(date)}
                        </Typography>
                        {meta && <Chip size="small" label={meta.label} color={meta.color} />}
                      </Stack>
                      {d ? (
                        <>
                          <Typography fontWeight={700} mb={0.5}>
                            {d.title}
                          </Typography>
                          <Stack gap={0.25} mb={1.25}>
                            {d.exercises.map((e, i) => (
                              <Typography key={i} variant="caption" color="text.secondary">
                                {e.exercise?.name} · {e.sets}×{e.reps}
                                {e.targetWeightKg ? ` @${fmtNum(e.targetWeightKg, 1)}kg` : ''}
                              </Typography>
                            ))}
                          </Stack>
                          {d.status === 'done' ? (
                            <Button size="small" startIcon={<VisibilityRounded />} onClick={() => openWorkout(d)}>
                              Nəticəyə bax
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant={d.status === 'today' ? 'contained' : 'text'}
                              startIcon={<PlayArrowRounded />}
                              onClick={() => setDraft(draftFromProgramDay(d))}
                            >
                              Qeyd et
                            </Button>
                          )}
                        </>
                      ) : (
                        <Stack direction="row" gap={1} alignItems="center" color="text.secondary">
                          <HotelRounded fontSize="small" />
                          <Typography variant="body2">İstirahət</Typography>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        );
      })}

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
