import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { ProgramDay, Workout } from '../api/types';
import { notify } from '../store/ui';
import { fmtVolume, today } from '../utils/format';
import ExerciseSelect from './ExerciseSelect';

interface SetRow {
  reps: number;
  weightKg: number;
}
interface Block {
  key: number;
  exerciseId: string | null;
  sets: SetRow[];
}
export interface WorkoutDraft {
  id?: string;
  date: string;
  title: string;
  notes: string;
  durationMin: number | '';
  programDayId: string | null;
  blocks: Block[];
}

let seq = 0;
const block = (exerciseId: string | null = null, sets: SetRow[] = [{ reps: 10, weightKg: 0 }]): Block => ({
  key: ++seq,
  exerciseId,
  sets,
});

export const emptyDraft = (): WorkoutDraft => ({
  date: today(),
  title: '',
  notes: '',
  durationMin: '',
  programDayId: null,
  blocks: [block()],
});

/** Consecutive sets of the same exercise are grouped into one block. */
export const draftFromWorkout = (w: Workout): WorkoutDraft => {
  const blocks: Block[] = [];
  for (const s of w.sets) {
    const last = blocks[blocks.length - 1];
    const row = { reps: s.reps, weightKg: s.weightKg };
    if (last && last.exerciseId === s.exerciseId) last.sets.push(row);
    else blocks.push(block(s.exerciseId, [row]));
  }
  return {
    id: w.id,
    date: w.date,
    title: w.title,
    notes: w.notes ?? '',
    durationMin: w.durationMin ?? '',
    programDayId: w.programDayId,
    blocks: blocks.length ? blocks : [block()],
  };
};

export const draftFromProgramDay = (d: ProgramDay): WorkoutDraft => ({
  date: d.date > today() ? today() : d.date,
  title: d.title,
  notes: '',
  durationMin: '',
  programDayId: d.id,
  blocks: d.exercises.map((e) =>
    block(
      e.exerciseId,
      Array.from({ length: e.sets }, () => ({ reps: e.reps, weightKg: e.targetWeightKg ?? 0 })),
    ),
  ),
});

export default function WorkoutDialog({
  open,
  draft,
  onClose,
  onSaved,
}: {
  open: boolean;
  draft: WorkoutDraft | null;
  onClose: () => void;
  onSaved: (w: Workout) => void;
}) {
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [d, setD] = useState<WorkoutDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setD(draft ?? emptyDraft());
      setError(null);
    }
  }, [open, draft]);

  const updateBlock = (key: number, fn: (b: Block) => Block) =>
    setD((x) => ({ ...x, blocks: x.blocks.map((b) => (b.key === key ? fn(b) : b)) }));

  const updateSet = (key: number, i: number, patch: Partial<SetRow>) =>
    updateBlock(key, (b) => ({ ...b, sets: b.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const volume = d.blocks.reduce((sum, b) => sum + b.sets.reduce((s, r) => s + r.reps * r.weightKg, 0), 0);

  const save = async () => {
    const blocks = d.blocks.filter((b) => b.exerciseId && b.sets.length);
    if (!d.title.trim()) return setError('Məşqin adını daxil edin');
    if (!blocks.length) return setError('Ən azı bir hərəkət əlavə edin');
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveWorkout(
        {
          date: d.date,
          title: d.title.trim(),
          notes: d.notes.trim() || null,
          durationMin: d.durationMin === '' ? null : Number(d.durationMin),
          programDayId: d.programDayId,
          sets: blocks.flatMap((b) => b.sets.map((s) => ({ exerciseId: b.exerciseId!, ...s }))),
        },
        d.id,
      );
      notify(d.id ? 'Məşq yeniləndi' : 'Məşq əlavə olundu 💪');
      onSaved(saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v)));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box flex={1}>{d.id ? 'Məşqi redaktə et' : 'Yeni məşq'}</Box>
        <IconButton onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {d.programDayId && !d.id && (
            <Alert severity="info">Proqram planı əsasında dolduruldu — real nəticələrinizi yazın.</Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              label="Məşqin adı"
              placeholder="məs. Sinə + Triceps"
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
              sx={{ flex: 2 }}
              required
            />
            <TextField
              label="Tarix"
              type="date"
              value={d.date}
              onChange={(e) => setD({ ...d, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Müddət"
              type="number"
              value={d.durationMin}
              onChange={(e) => setD({ ...d, durationMin: e.target.value === '' ? '' : num(e.target.value) })}
              InputProps={{ endAdornment: <InputAdornment position="end">dəq</InputAdornment> }}
              sx={{ flex: 1 }}
            />
          </Stack>

          {d.blocks.map((b, bi) => (
            <Paper key={b.key} variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', boxShadow: 'none' }}>
              <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
                <Typography fontWeight={700} color="text.secondary" width={24}>
                  {bi + 1}.
                </Typography>
                <ExerciseSelect value={b.exerciseId} onChange={(id) => updateBlock(b.key, (x) => ({ ...x, exerciseId: id }))} />
                <IconButton
                  onClick={() => setD((x) => ({ ...x, blocks: x.blocks.filter((y) => y.key !== b.key) }))}
                  aria-label="Hərəkəti sil"
                >
                  <DeleteOutlineRounded />
                </IconButton>
              </Stack>
              <Stack gap={1} pl={{ sm: 4 }}>
                {b.sets.map((s, i) => (
                  <Stack key={i} direction="row" gap={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary" width={48} flexShrink={0}>
                      Set {i + 1}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      label="Təkrar"
                      value={s.reps}
                      onChange={(e) => updateSet(b.key, i, { reps: Math.round(num(e.target.value)) })}
                      sx={{ width: 110 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Çəki"
                      value={s.weightKg}
                      onChange={(e) => updateSet(b.key, i, { weightKg: num(e.target.value) })}
                      InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                      inputProps={{ step: 0.5 }}
                      sx={{ width: 130 }}
                    />
                    <IconButton
                      size="small"
                      disabled={b.sets.length === 1}
                      onClick={() => updateBlock(b.key, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                      aria-label="Seti sil"
                    >
                      <CloseRounded fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Box>
                  <Button
                    size="small"
                    startIcon={<AddRounded />}
                    onClick={() =>
                      updateBlock(b.key, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))
                    }
                  >
                    Set əlavə et
                  </Button>
                </Box>
              </Stack>
            </Paper>
          ))}

          <Box>
            <Button
              variant="outlined"
              startIcon={<AddRounded />}
              onClick={() => setD((x) => ({ ...x, blocks: [...x.blocks, block()] }))}
            >
              Hərəkət əlavə et
            </Button>
          </Box>
          <Divider />
          <TextField
            label="Qeydlər"
            multiline
            minRows={2}
            value={d.notes}
            onChange={(e) => setD({ ...d, notes: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography color="text.secondary" flex={1}>
          Ümumi həcm: <b>{fmtVolume(volume)}</b>
        </Typography>
        <Button onClick={onClose}>Ləğv et</Button>
        <Button variant="contained" onClick={save} disabled={busy}>
          Yadda saxla
        </Button>
      </DialogActions>
    </Dialog>
  );
}
