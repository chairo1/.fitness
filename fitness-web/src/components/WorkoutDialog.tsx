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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { ExerciseProgressPoint, ProgramDay, Workout } from '../api/types';
import { notify } from '../store/ui';
import { FONT_MONO } from '../theme';
import { fmtDateShort, fmtNum, fmtVolume, today } from '../utils/format';
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
const DEFAULT_SET: SetRow = { reps: 10, weightKg: 0 };
const block = (exerciseId: string | null = null, sets: SetRow[] = [{ ...DEFAULT_SET }]): Block => ({
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

// ---------------------------------------------------------------------------
// "Previous" values (Hevy-style): the last session of each exercise before this workout's date.
// ---------------------------------------------------------------------------

const history = new Map<string, Promise<ExerciseProgressPoint[]>>();
const historyOf = (id: string) => {
  if (!history.has(id)) history.set(id, api.exerciseProgress(id).catch(() => []));
  return history.get(id)!;
};

interface Previous {
  date: string;
  sets: number;
  reps: number; // average per set
  weightKg: number; // heaviest set
  best: number; // all-time heaviest before this date
}

async function previousOf(exerciseId: string, before: string, excludeDate?: string): Promise<Previous | null> {
  // Up to the workout's date; when editing, that workout's own day is left out (progress is grouped by date).
  const earlier = (await historyOf(exerciseId)).filter((p) => p.date <= before && p.date !== excludeDate);
  const last = earlier[earlier.length - 1];
  if (!last) return null;
  return {
    date: last.date,
    sets: last.sets,
    reps: Math.round(last.reps / Math.max(1, last.sets)),
    weightKg: last.maxWeight,
    best: earlier.reduce((m, p) => Math.max(m, p.maxWeight), 0),
  };
}

const isUntouched = (b: Block) => b.sets.length === 1 && b.sets[0].reps === DEFAULT_SET.reps && b.sets[0].weightKg === 0;

function BlockEditor({
  b,
  index,
  date,
  editingDate,
  onChange,
  onRemove,
}: {
  b: Block;
  index: number;
  date: string;
  editingDate?: string;
  onChange: (fn: (b: Block) => Block) => void;
  onRemove: () => void;
}) {
  const t = useTheme().tokens;
  const [prev, setPrev] = useState<Previous | null>(null);

  useEffect(() => {
    let alive = true;
    setPrev(null);
    if (!b.exerciseId) return;
    previousOf(b.exerciseId, date, editingDate).then((p) => alive && setPrev(p));
    return () => {
      alive = false;
    };
  }, [b.exerciseId, date, editingDate]);

  const pick = async (id: string | null) => {
    const untouched = isUntouched(b);
    onChange((x) => ({ ...x, exerciseId: id }));
    // Picking an exercise on an empty block fills it from last time, so you only change what changed.
    if (id && untouched) {
      const p = await previousOf(id, date, editingDate);
      if (p) onChange((x) => (isUntouched(x) ? { ...x, sets: Array.from({ length: p.sets }, () => ({ reps: p.reps, weightKg: p.weightKg })) } : x));
    }
  };

  const updateSet = (i: number, patch: Partial<SetRow>) =>
    onChange((x) => ({ ...x, sets: x.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v)));
  const top = Math.max(0, ...b.sets.map((s) => s.weightKg));
  const isPr = !!prev && prev.best > 0 && top > prev.best;

  return (
    <Box sx={{ border: `1px solid ${t.ruleStrong}`, borderRadius: '6px', bgcolor: 'background.default' }}>
      <Stack direction="row" gap={1} alignItems="center" px={1.5} pt={1.5}>
        <Typography fontWeight={600} color="text.secondary" width={22} sx={{ fontFamily: FONT_MONO }}>
          {index + 1}
        </Typography>
        <ExerciseSelect value={b.exerciseId} onChange={pick} />
        <IconButton onClick={onRemove} aria-label="Hərəkəti sil">
          <DeleteOutlineRounded />
        </IconButton>
      </Stack>
      <Stack direction="row" alignItems="center" gap={1} px={1.5} pl={{ xs: 1.5, sm: 5 }} mt={0.75} minHeight={22}>
        <Typography variant="body2" color="text.secondary" fontSize={13}>
          {!b.exerciseId
            ? 'Hərəkət seçin — əvvəlki nəticəniz avtomatik dolacaq.'
            : prev
              ? `Əvvəlki: ${fmtDateShort(prev.date)} · ${prev.sets}×${prev.reps} · ${fmtNum(prev.weightKg, 1)} kg · rekord ${fmtNum(prev.best, 1)} kg`
              : 'Bu hərəkəti ilk dəfə yazırsınız.'}
        </Typography>
        {isPr && (
          <Box component="span" sx={{ bgcolor: t.red, color: '#fff', fontSize: 11.5, fontWeight: 600, px: 0.75, py: 0.1, borderRadius: '3px' }}>
            Yeni rekord
          </Box>
        )}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '40px minmax(70px, 96px) 92px 120px 34px',
          columnGap: 1,
          rowGap: 0.75,
          alignItems: 'center',
          px: 1.5,
          pl: { xs: 1.5, sm: 5 },
          py: 1.25,
        }}
      >
        {['Set', 'Əvvəlki', 'Təkrar', 'Çəki', ''].map((h, i) => (
          <Typography key={i} variant="body2" color="text.secondary" fontSize={12}>
            {h}
          </Typography>
        ))}
        {b.sets.map((s, i) => {
          const hasPrev = prev && i < prev.sets;
          return (
            <Box key={i} sx={{ display: 'contents' }}>
              <Typography sx={{ fontFamily: FONT_MONO, fontSize: 14 }}>{i + 1}</Typography>
              <Box
                component={hasPrev ? 'button' : 'span'}
                type={hasPrev ? 'button' : undefined}
                title={hasPrev ? 'Bu seti əvvəlki kimi doldur' : undefined}
                onClick={hasPrev ? () => updateSet(i, { reps: prev!.reps, weightKg: prev!.weightKg }) : undefined}
                sx={{
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  textAlign: 'left',
                  fontFamily: FONT_MONO,
                  fontSize: 13,
                  color: 'text.secondary',
                  cursor: hasPrev ? 'pointer' : 'default',
                  '&:hover': hasPrev ? { color: 'text.primary', textDecoration: 'underline' } : undefined,
                }}
              >
                {hasPrev ? `${prev!.reps}×${fmtNum(prev!.weightKg, 1)}` : '—'}
              </Box>
              <TextField
                size="small"
                type="number"
                value={s.reps}
                onChange={(e) => updateSet(i, { reps: Math.round(num(e.target.value)) })}
                inputProps={{ 'aria-label': `Set ${i + 1} təkrar` }}
              />
              <TextField
                size="small"
                type="number"
                value={s.weightKg}
                onChange={(e) => updateSet(i, { weightKg: num(e.target.value) })}
                InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                inputProps={{ step: 0.5, 'aria-label': `Set ${i + 1} çəki` }}
              />
              <IconButton
                size="small"
                disabled={b.sets.length === 1}
                onClick={() => onChange((x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                aria-label="Seti sil"
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
      <Box px={1.5} pl={{ xs: 1.5, sm: 5 }} pb={1.25}>
        <Button
          size="small"
          startIcon={<AddRounded />}
          onClick={() => onChange((x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}
        >
          Set əlavə et
        </Button>
      </Box>
    </Box>
  );
}

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

  const volume = d.blocks.reduce((sum, b) => sum + b.sets.reduce((s, r) => s + r.reps * r.weightKg, 0), 0);
  const setCount = d.blocks.reduce((n, b) => n + (b.exerciseId ? b.sets.length : 0), 0);

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
      history.clear();
      notify(d.id ? 'Məşq yeniləndi' : 'Məşq yazıldı');
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
        <Box flex={1}>{d.id ? 'Məşqi redaktə et' : 'Məşq yaz'}</Box>
        <IconButton onClick={onClose} aria-label="Bağla">
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {d.programDayId && !d.id && (
            <Alert severity="info">Proqram planından dolduruldu. Faktiki təkrar və çəkini düzəldin.</Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              label="Məşqin adı"
              placeholder="məs. Sinə + Triceps"
              value={d.title}
              onChange={(e) => setD({ ...d, title: e.target.value })}
              sx={{ flex: 2 }}
              required
              autoFocus={!d.title}
              size="small"
            />
            <TextField
              label="Tarix"
              type="date"
              size="small"
              value={d.date}
              onChange={(e) => setD({ ...d, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Müddət"
              type="number"
              size="small"
              value={d.durationMin}
              onChange={(e) => setD({ ...d, durationMin: e.target.value === '' ? '' : num(e.target.value) })}
              InputProps={{ endAdornment: <InputAdornment position="end">dəq</InputAdornment> }}
              sx={{ flex: 0.8 }}
            />
          </Stack>

          {d.blocks.map((b, bi) => (
            <BlockEditor
              key={b.key}
              b={b}
              index={bi}
              date={d.date}
              editingDate={d.id ? draft?.date : undefined}
              onChange={(fn) => updateBlock(b.key, fn)}
              onRemove={() => setD((x) => ({ ...x, blocks: x.blocks.filter((y) => y.key !== b.key) }))}
            />
          ))}

          <Box>
            <Button variant="outlined" startIcon={<AddRounded />} onClick={() => setD((x) => ({ ...x, blocks: [...x.blocks, block()] }))}>
              Hərəkət əlavə et
            </Button>
          </Box>
          <TextField label="Qeyd" size="small" multiline minRows={1} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.75, gap: 1 }}>
        <Typography color="text.secondary" flex={1} fontSize={14}>
          <Box component="b" sx={{ fontFamily: FONT_MONO, color: 'text.primary' }}>
            {setCount}
          </Box>{' '}
          set · həcm{' '}
          <Box component="b" sx={{ fontFamily: FONT_MONO, color: 'text.primary' }}>
            {fmtVolume(volume)}
          </Box>
        </Typography>
        <Button onClick={onClose}>Ləğv et</Button>
        <Button variant="contained" onClick={save} disabled={busy}>
          Yadda saxla
        </Button>
      </DialogActions>
    </Dialog>
  );
}
