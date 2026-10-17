import AddRounded from '@mui/icons-material/AddRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import EventNoteRounded from '@mui/icons-material/EventNoteRounded';
import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { Workout } from '../api/types';
import { EmptyState, Loading, PageHeader } from '../components/common';
import WorkoutDialog, { draftFromWorkout, emptyDraft, type WorkoutDraft } from '../components/WorkoutDialog';
import { notify } from '../store/ui';
import { fmtMonth, fmtNum, fmtVolume, weekdayShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';

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

export default function WorkoutsPage() {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const from = month.format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');
  const { data, loading, reload } = useAsync(() => api.workouts(from, to), [from, to]);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);

  const workouts = data ?? [];
  const totalVolume = workouts.reduce((s, w) => s + volumeOf(w), 0);
  const totalMinutes = workouts.reduce((s, w) => s + (w.durationMin ?? 0), 0);

  const remove = async (w: Workout) => {
    if (!confirm(`"${w.title}" məşqi silinsin?`)) return;
    try {
      await api.deleteWorkout(w.id);
      notify('Məşq silindi');
      reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Məşqlər"
        subtitle="Zalda etdiyiniz bütün məşqlərin jurnalı"
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDraft(emptyDraft())}>
            Məşq əlavə et
          </Button>
        }
      />

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2}>
            <Stack direction="row" alignItems="center" gap={1}>
              <IconButton onClick={() => setMonth(month.subtract(1, 'month'))}>
                <ChevronLeftRounded />
              </IconButton>
              <Typography variant="h6" minWidth={160} textAlign="center">
                {fmtMonth(month)}
              </Typography>
              <IconButton onClick={() => setMonth(month.add(1, 'month'))} disabled={month.isSame(dayjs(), 'month')}>
                <ChevronRightRounded />
              </IconButton>
            </Stack>
            <Box flex={1} />
            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
              <Chip label={`${workouts.length} məşq`} color="primary" variant="outlined" />
              <Chip label={`Həcm: ${fmtVolume(totalVolume)}`} variant="outlined" />
              <Chip label={`${fmtNum(totalMinutes)} dəq`} variant="outlined" />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && !data ? (
        <Loading />
      ) : workouts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<EventNoteRounded fontSize="inherit" />}
            text="Bu ay üçün məşq qeyd olunmayıb"
            action={
              <Button variant="outlined" onClick={() => setDraft(emptyDraft())}>
                Məşq əlavə et
              </Button>
            }
          />
        </Card>
      ) : (
        <Stack gap={1.5}>
          {workouts.map((w) => (
            <Card key={w.id}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" gap={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 56,
                      flexShrink: 0,
                      textAlign: 'center',
                      borderRadius: 3,
                      py: 1,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      {weekdayShort(w.date)}
                    </Typography>
                    <Typography variant="h6" lineHeight={1}>
                      {dayjs(w.date).date()}
                    </Typography>
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="subtitle1">{w.title}</Typography>
                      {w.programDayId && <Chip size="small" color="primary" label="Proqram" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {w.sets.length} set · {fmtVolume(volumeOf(w))}
                      {w.durationMin ? ` · ${w.durationMin} dəq` : ''}
                    </Typography>
                    <Stack direction="row" gap={0.75} flexWrap="wrap">
                      {summary(w).map((s, i) => (
                        <Chip
                          key={i}
                          size="small"
                          variant="outlined"
                          label={`${s.name} · ${s.sets}×${s.best ? ` ${fmtNum(s.best, 1)}kg` : ''}`}
                        />
                      ))}
                    </Stack>
                    {w.notes && (
                      <Typography variant="body2" color="text.secondary" mt={1} fontStyle="italic">
                        {w.notes}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }}>
                    <Tooltip title="Redaktə">
                      <IconButton onClick={() => setDraft(draftFromWorkout(w))}>
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton onClick={() => remove(w)}>
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

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
