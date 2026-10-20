import AddRounded from '@mui/icons-material/AddRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { Box, Button, IconButton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { Workout } from '../api/types';
import { EmptyState, Loading, Num, PageHeader, Panel } from '../components/common';
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
  const tk = useTheme().tokens;
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const from = month.format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');
  const { data, loading, reload } = useAsync(() => api.workouts(from, to), [from, to]);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);

  const workouts = data ?? [];
  const totalVolume = workouts.reduce((s, w) => s + volumeOf(w), 0);
  const totalMinutes = workouts.reduce((s, w) => s + (w.durationMin ?? 0), 0);
  const isCurrent = month.isSame(dayjs(), 'month');

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

  const meta = [
    `${workouts.length} məşq`,
    totalVolume ? fmtVolume(totalVolume) : null,
    totalMinutes ? `${fmtNum(totalMinutes)} dəq` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <PageHeader
        title="Məşqlər"
        subtitle="Zalda etdiyiniz hər məşqin jurnalı"
        action={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDraft(emptyDraft())}>
            Məşq əlavə et
          </Button>
        }
      />

      <Panel
        title={
          <Stack direction="row" alignItems="center" gap={0.5}>
            <IconButton size="small" onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="Əvvəlki ay">
              <ChevronLeftRounded />
            </IconButton>
            <Typography variant="h6" component="h2" minWidth={150} textAlign="center">
              {fmtMonth(month)}
            </Typography>
            <IconButton size="small" onClick={() => setMonth(month.add(1, 'month'))} disabled={isCurrent} aria-label="Növbəti ay">
              <ChevronRightRounded />
            </IconButton>
          </Stack>
        }
        action={
          <Typography variant="body2" color="text.secondary" textAlign="right">
            {meta}
          </Typography>
        }
        flush
      >
        {loading && !data ? (
          <Loading />
        ) : workouts.length === 0 ? (
          <Box px={{ xs: 2, sm: 2.75 }}>
            <EmptyState
              text={isCurrent ? 'Bu ay hələ məşq yazılmayıb.' : 'Bu ay üçün məşq yoxdur.'}
              action={
                isCurrent && (
                  <Button variant="outlined" onClick={() => setDraft(emptyDraft())}>
                    Məşq əlavə et
                  </Button>
                )
              }
            />
          </Box>
        ) : (
          workouts.map((w, i) => (
            <Stack
              key={w.id}
              direction="row"
              gap={{ xs: 1.5, sm: 2.5 }}
              alignItems="flex-start"
              px={{ xs: 2, sm: 2.75 }}
              py={2}
              sx={{ borderTop: i ? `1px solid ${tk.rule}` : 0 }}
            >
              <Box width={48} flexShrink={0} pt={0.25}>
                <Num sx={{ display: 'block', fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{dayjs(w.date).date()}</Num>
                <Num sx={{ fontSize: 12.5, color: 'text.secondary' }}>{weekdayShort(w.date)}</Num>
              </Box>
              <Box flex={1} minWidth={0}>
                <Stack direction="row" alignItems="baseline" gap={1.25} flexWrap="wrap">
                  <Typography fontWeight={600} fontSize={17}>
                    {w.title}
                  </Typography>
                  {w.programDayId && (
                    <Typography variant="body2" color="text.secondary">
                      proqramdan
                    </Typography>
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {summary(w)
                    .map((s) => `${s.name} ${s.sets}×${s.best ? ` ${fmtNum(s.best, 1)} kg` : ''}`)
                    .join(' · ')}
                </Typography>
                {w.notes && (
                  <Typography variant="body2" mt={1} sx={{ pl: 1.5, borderLeft: `2px solid ${tk.rule}` }}>
                    {w.notes}
                  </Typography>
                )}
              </Box>
              <Box textAlign="right" flexShrink={0}>
                <Num sx={{ display: 'block', fontWeight: 600 }}>{volumeOf(w) ? fmtVolume(volumeOf(w)) : '—'}</Num>
                <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
                  {w.sets.length} set{w.durationMin ? ` · ${w.durationMin} dəq` : ''}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} flexShrink={0} mt={-0.5} mr={-1}>
                  <Tooltip title="Redaktə">
                    <IconButton size="small" onClick={() => setDraft(draftFromWorkout(w))}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sil">
                    <IconButton size="small" onClick={() => remove(w)}>
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
              </Stack>
            </Stack>
          ))
        )}
      </Panel>

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
