import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import HotelRounded from '@mui/icons-material/HotelRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ProgramInput, ProgramType } from '../api/types';
import ExerciseSelect from '../components/ExerciseSelect';
import { Loading, PageHeader } from '../components/common';
import { notify } from '../store/ui';
import { fmtDateShort, ordinal, today, weekday } from '../utils/format';

interface ExRow {
  key: number;
  exerciseId: string | null;
  sets: number;
  reps: number;
  targetWeightKg: number | '';
}
interface DayDraft {
  title: string;
  exercises: ExRow[];
}

let seq = 0;
const exRow = (p: Partial<ExRow> = {}): ExRow => ({ key: ++seq, exerciseId: null, sets: 3, reps: 10, targetWeightKg: '', ...p });
const dayKey = (week: number, day: number) => `${week}-${day}`;
const WEEKS: Record<ProgramType, number> = { weekly: 1, monthly: 4 };

export default function ProgramEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProgramType>('weekly');
  const [startDate, setStartDate] = useState(() => {
    // default: next Monday (or today if it's Monday)
    const d = dayjs();
    return d.add((8 - d.day()) % 7, 'day').format('YYYY-MM-DD');
  });
  const [days, setDays] = useState<Record<string, DayDraft>>({});
  const [week, setWeek] = useState(1);

  useEffect(() => {
    if (!id) return;
    api
      .program(id)
      .then((p) => {
        setName(p.name);
        setDescription(p.description ?? '');
        setType(p.type);
        setStartDate(p.startDate);
        const map: Record<string, DayDraft> = {};
        for (const d of p.days ?? []) {
          map[dayKey(d.week, d.dayIndex)] = {
            title: d.title,
            exercises: d.exercises.map((e) =>
              exRow({ exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, targetWeightKg: e.targetWeightKg ?? '' }),
            ),
          };
        }
        setDays(map);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const weeks = WEEKS[type];
  const dateOf = (w: number, d: number) => dayjs(startDate).add((w - 1) * 7 + d - 1, 'day').format('YYYY-MM-DD');

  const updateDay = (k: string, fn: (d: DayDraft) => DayDraft) =>
    setDays((all) => ({ ...all, [k]: fn(all[k] ?? { title: '', exercises: [] }) }));

  const updateEx = (k: string, key: number, patch: Partial<ExRow>) =>
    updateDay(k, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) }));

  const copyWeekToAll = () => {
    if (!confirm(`${ordinal(week)} həftənin planı digər həftələrə köçürülsün? Onların mövcud planı əvəz olunacaq.`)) return;
    setDays((all) => {
      const next = { ...all };
      for (let w = 1; w <= weeks; w++) {
        if (w === week) continue;
        for (let d = 1; d <= 7; d++) {
          const src = all[dayKey(week, d)];
          if (src) next[dayKey(w, d)] = { title: src.title, exercises: src.exercises.map((e) => exRow({ ...e })) };
          else delete next[dayKey(w, d)];
        }
      }
      return next;
    });
    notify('Plan bütün həftələrə köçürüldü', 'info');
  };

  const save = async () => {
    if (!name.trim()) return setError('Proqramın adını daxil edin');
    const payloadDays: ProgramInput['days'] = [];
    for (let w = 1; w <= weeks; w++) {
      for (let d = 1; d <= 7; d++) {
        const day = days[dayKey(w, d)];
        const exercises = (day?.exercises ?? []).filter((e) => e.exerciseId);
        if (!exercises.length) continue;
        payloadDays.push({
          week: w,
          dayIndex: d,
          title: day!.title.trim() || `${ordinal(d)} gün`,
          exercises: exercises.map((e) => ({
            exerciseId: e.exerciseId!,
            sets: e.sets,
            reps: e.reps,
            targetWeightKg: e.targetWeightKg === '' ? null : e.targetWeightKg,
          })),
        });
      }
    }
    if (!payloadDays.length) return setError('Ən azı bir günə hərəkət əlavə edin');
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveProgram(
        { name: name.trim(), description: description.trim() || null, type, startDate, days: payloadDays },
        id,
      );
      notify(id ? 'Proqram yeniləndi' : 'Proqram yaradıldı');
      navigate(`/programs/${saved.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  const plannedInWeek = Array.from({ length: 7 }, (_, i) => days[dayKey(week, i + 1)]?.exercises.length ?? 0).filter(
    Boolean,
  ).length;
  const int = (v: string, min = 1) => Math.max(min, Math.round(Number(v) || 0));

  return (
    <>
      <PageHeader
        title={id ? 'Proqramı redaktə et' : 'Yeni proqram'}
        subtitle="Hərəkət əlavə olunmayan günlər istirahət günü sayılır"
        action={
          <Stack direction="row" gap={1}>
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate(-1)}>
              Geri
            </Button>
            <Button variant="contained" onClick={save} disabled={busy}>
              Yadda saxla
            </Button>
          </Stack>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField
                label="Proqramın adı"
                placeholder="məs. Güc proqramı — Oktyabr"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                color="primary"
                value={type}
                onChange={(_, v: ProgramType | null) => {
                  if (!v) return;
                  setType(v);
                  if (week > WEEKS[v]) setWeek(1);
                }}
                sx={{ height: 56 }}
              >
                <ToggleButton value="weekly">Həftəlik (7 gün)</ToggleButton>
                <ToggleButton value="monthly">Aylıq (4 həftə)</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Başlama tarixi"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value || today())}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Təsvir (istəyə bağlı)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={1}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1} mb={2}>
        {weeks > 1 ? (
          <Tabs value={week} onChange={(_, v) => setWeek(v)} variant="scrollable">
            {Array.from({ length: weeks }, (_, i) => (
              <Tab key={i} value={i + 1} label={`${ordinal(i + 1)} həftə`} />
            ))}
          </Tabs>
        ) : (
          <Typography variant="h6">Həftəlik plan</Typography>
        )}
        <Box flex={1} />
        <Typography variant="body2" color="text.secondary">
          {plannedInWeek} məşq günü · {7 - plannedInWeek} istirahət
        </Typography>
        {weeks > 1 && (
          <Button size="small" startIcon={<ContentCopyRounded />} onClick={copyWeekToAll}>
            Bu həftəni digərlərinə köçür
          </Button>
        )}
      </Stack>

      <Grid container spacing={2}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = i + 1;
          const k = dayKey(week, d);
          const day = days[k];
          const date = dateOf(week, d);
          const rest = !day?.exercises.length;
          return (
            <Grid item xs={12} md={6} xl={4} key={k}>
              <Card sx={{ height: '100%', opacity: rest ? 0.85 : 1 }}>
                <CardContent>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" mb={1.5}>
                    <Typography fontWeight={700}>
                      {ordinal(d)} gün · {weekday(date)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fmtDateShort(date)}
                    </Typography>
                  </Stack>

                  {rest ? (
                    <Stack alignItems="center" gap={1} py={2} color="text.secondary">
                      <HotelRounded />
                      <Typography variant="body2">İstirahət günü</Typography>
                    </Stack>
                  ) : (
                    <Stack gap={1.5}>
                      <TextField
                        size="small"
                        label="Günün adı"
                        placeholder="məs. Ayaq günü"
                        value={day.title}
                        onChange={(e) => updateDay(k, (x) => ({ ...x, title: e.target.value }))}
                      />
                      {day.exercises.map((e) => (
                        <Box key={e.key} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                          <Stack direction="row" gap={1} alignItems="center" mb={1}>
                            <ExerciseSelect value={e.exerciseId} onChange={(v) => updateEx(k, e.key, { exerciseId: v })} />
                            <IconButton
                              size="small"
                              onClick={() =>
                                updateDay(k, (x) => ({ ...x, exercises: x.exercises.filter((y) => y.key !== e.key) }))
                              }
                            >
                              <CloseRounded fontSize="small" />
                            </IconButton>
                          </Stack>
                          <Stack direction="row" gap={1}>
                            <TextField
                              size="small"
                              type="number"
                              label="Set"
                              value={e.sets}
                              onChange={(ev) => updateEx(k, e.key, { sets: Math.min(20, int(ev.target.value)) })}
                            />
                            <TextField
                              size="small"
                              type="number"
                              label="Təkrar"
                              value={e.reps}
                              onChange={(ev) => updateEx(k, e.key, { reps: Math.min(200, int(ev.target.value)) })}
                            />
                            <TextField
                              size="small"
                              type="number"
                              label="Hədəf"
                              value={e.targetWeightKg}
                              onChange={(ev) =>
                                updateEx(k, e.key, {
                                  targetWeightKg: ev.target.value === '' ? '' : Math.max(0, Number(ev.target.value)),
                                })
                              }
                              InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                  <Button
                    size="small"
                    startIcon={<AddRounded />}
                    sx={{ mt: 1.5 }}
                    onClick={() => updateDay(k, (x) => ({ ...x, exercises: [...x.exercises, exRow()] }))}
                  >
                    Hərəkət əlavə et
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}
