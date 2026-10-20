import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ShowChartRounded from '@mui/icons-material/ShowChartRounded';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Alert,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Exercise, MuscleGroup } from '../api/types';
import { EmptyState, GlassCard, Loading, PageHeader } from '../components/common';
import { useExercisesStore } from '../store/exercises';
import { notify } from '../store/ui';
import { fmtDateShort, fmtNum, MUSCLE_GROUPS, MUSCLE_LABELS } from '../utils/format';
import { musclePart } from '../utils/muscles';
import { useAsync } from '../utils/useAsync';

function ProgressDialog({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const theme = useTheme();
  const { data, loading } = useAsync(() => api.exerciseProgress(exercise.id), [exercise.id]);
  const points = data ?? [];
  const best = points.reduce((m, p) => Math.max(m, p.maxWeight), 0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <Box flex={1}>
          {exercise.name}
          <Typography variant="body2" color="text.secondary">
            {MUSCLE_LABELS[exercise.muscleGroup]}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Loading />
        ) : points.length === 0 ? (
          <EmptyState text="Bu hərəkət üçün hələ nəticə qeyd olunmayıb" />
        ) : (
          <>
            <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
              <Chip label={`${points.length} məşq`} />
              <Chip color="primary" label={`Rekord: ${fmtNum(best, 1)} kg`} />
              <Chip label={`Son: ${fmtNum(points[points.length - 1].maxWeight, 1)} kg`} />
            </Stack>
            <LineChart
              height={320}
              xAxis={[{ scaleType: 'point', data: points.map((p) => fmtDateShort(p.date)) }]}
              series={[
                { data: points.map((p) => p.maxWeight), label: 'Maks. çəki (kg)', color: theme.palette.primary.main, curve: 'monotoneX' },
                { data: points.map((p) => Math.round(p.est1rm * 10) / 10), label: 'Təxmini 1RM (kg)', color: theme.palette.secondary.main, curve: 'monotoneX' },
              ]}
              margin={{ left: 48, right: 16, top: 48, bottom: 28 }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ExercisesPage() {
  const { items, loaded, load, add, remove } = useExercisesStore();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('chest');
  // The filter lives in the URL so the dashboard body map can deep-link to a muscle group.
  const [params, setParams] = useSearchParams();
  const muscle = params.get('muscle') as MuscleGroup | null;
  const filter: MuscleGroup | 'all' = muscle && MUSCLE_GROUPS.includes(muscle) ? muscle : 'all';
  const focus = musclePart(params.get('focus'));
  const setFilter = (g: MuscleGroup | 'all') => setParams(g === 'all' ? {} : { muscle: g });
  // Pre-select the browsed group for a new custom exercise.
  useEffect(() => {
    if (muscle && MUSCLE_GROUPS.includes(muscle)) setGroup(muscle);
  }, [muscle]);
  const [selected, setSelected] = useState<Exercise | null>(null);

  useEffect(() => {
    load(true);
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add(name, group);
      setName('');
      notify('Hərəkət əlavə olundu');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const del = async (ex: Exercise) => {
    if (!confirm(`"${ex.name}" silinsin?`)) return;
    try {
      await remove(ex.id);
      notify('Silindi');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const visible = MUSCLE_GROUPS.filter((g) => filter === 'all' || g === filter)
    .map((g) => ({ g, list: items.filter((e) => e.muscleGroup === g) }))
    .filter((x) => x.list.length);

  return (
    <>
      <PageHeader title="Hərəkətlər" subtitle="Hərəkət kataloqu və hər hərəkət üzrə irəliləyiş qrafiki" />

      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Stack component="form" onSubmit={submit} direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              label="Yeni hərəkət"
              placeholder="məs. Smith Machine Squat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 2 }}
            />
            <TextField select label="Əzələ qrupu" value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup)} sx={{ flex: 1 }}>
              {MUSCLE_GROUPS.map((g) => (
                <MenuItem key={g} value={g}>
                  {MUSCLE_LABELS[g]}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained" startIcon={<AddRounded />} disabled={!name.trim()}>
              Əlavə et
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {focus && filter === focus.group && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setFilter(focus.group)}>
          <b>{focus.name}</b> <i>({focus.latin})</i> — {MUSCLE_LABELS[focus.group]} qrupunun hərəkətləri
        </Alert>
      )}

      <Stack direction="row" gap={1} mb={2.5} flexWrap="wrap">
        <Chip label="Hamısı" color={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')} />
        {MUSCLE_GROUPS.map((g) => (
          <Chip key={g} label={MUSCLE_LABELS[g]} color={filter === g ? 'primary' : 'default'} onClick={() => setFilter(g)} />
        ))}
      </Stack>

      {!loaded ? (
        <Loading />
      ) : (
        <Grid container spacing={2.5}>
          {visible.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <EmptyState text="Bu qrup üçün hələ hərəkət yoxdur — yuxarıdan öz hərəkətinizi əlavə edin" />
              </Card>
            </Grid>
          )}
          {visible.map(({ g, list }) => (
            <Grid item xs={12} md={6} xl={4} key={g}>
              <GlassCard title={MUSCLE_LABELS[g]} action={<Chip size="small" label={list.length} />}>
                <Stack gap={0.5}>
                  {list.map((ex) => (
                    <Stack
                      key={ex.id}
                      direction="row"
                      alignItems="center"
                      gap={1}
                      sx={{ px: 1, py: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Typography flex={1}>{ex.name}</Typography>
                      {ex.userId && <Chip size="small" variant="outlined" label="Mənim" />}
                      <IconButton size="small" onClick={() => setSelected(ex)} aria-label="İrəliləyiş">
                        <ShowChartRounded fontSize="small" />
                      </IconButton>
                      {ex.userId && (
                        <IconButton size="small" onClick={() => del(ex)} aria-label="Sil">
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      )}

      {selected && <ProgressDialog exercise={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
