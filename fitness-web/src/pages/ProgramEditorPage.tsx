import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ProgramInput, ProgramType } from '../api/types';
import ExerciseSelect from '../components/ExerciseSelect';
import { ListRow, Loading, Num, Panel, Screen } from '../components/common';
import { notify } from '../store/ui';
import { fmtDateShort, ordinal, today, weekday, weekdayShort } from '../utils/format';

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
  const rule = useTheme().tokens.rule;
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
  const [selDay, setSelDay] = useState(1);

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
  const k = dayKey(week, selDay);
  const day = days[k];
  const selDate = dateOf(week, selDay);

  return (
    <Screen
      title={id ? 'Proqramı redaktə et' : 'Yeni proqram'}
      purpose="Solda proqram və günlər, sağda seçilmiş günün planı. Hərəkətsiz gün — istirahət."
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
    >
      <Box
        sx={{
          height: { md: '100%' },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(320px, 4fr) minmax(0, 7fr)' },
          gap: 2,
        }}
      >
        <Panel flush scroll>
          <Stack gap={2} p={2.5} sx={{ borderBottom: (t) => `1px solid ${t.tokens.rule}` }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Proqramın adı"
              placeholder="məs. Güc proqramı — Oktyabr"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={type}
              onChange={(_, v: ProgramType | null) => {
                if (!v) return;
                setType(v);
                if (week > WEEKS[v]) setWeek(1);
              }}
              size="small"
            >
              <ToggleButton value="weekly">Həftəlik · 7 gün</ToggleButton>
              <ToggleButton value="monthly">Aylıq · 4 həftə</ToggleButton>
            </ToggleButtonGroup>
            <Stack direction="row" gap={1.5}>
              <TextField
                label="Başlama tarixi"
                type="date"
                size="small"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value || today())}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Təsvir"
                size="small"
                placeholder="istəyə bağlı"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ flex: 1.4 }}
              />
            </Stack>
          </Stack>

          {weeks > 1 && (
            <Stack direction="row" alignItems="center" sx={{ borderBottom: (t) => `1px solid ${t.tokens.rule}` }} pr={1}>
              <Tabs value={week} onChange={(_, v) => setWeek(v)} variant="scrollable" sx={{ flex: 1, minHeight: 44 }}>
                {Array.from({ length: weeks }, (_, i) => (
                  <Tab key={i} value={i + 1} label={`${ordinal(i + 1)} həftə`} sx={{ minWidth: 0, px: 1.5 }} />
                ))}
              </Tabs>
              <Tooltip title="Bu həftəni digərlərinə köçür">
                <IconButton size="small" onClick={copyWeekToAll} aria-label="Bu həftəni digərlərinə köçür">
                  <ContentCopyRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between" px={2.5} pt={1.25} pb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Günlər
            </Typography>
            <Num sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              {plannedInWeek} məşq · {7 - plannedInWeek} istirahət
            </Num>
          </Stack>
          {Array.from({ length: 7 }, (_, i) => {
            const d = i + 1;
            const dd = days[dayKey(week, d)];
            const n = dd?.exercises.length ?? 0;
            const date = dateOf(week, d);
            return (
              <ListRow key={d} first={i === 0} selected={selDay === d} onClick={() => setSelDay(d)}>
                <Box width={56} flexShrink={0}>
                  <Num sx={{ display: 'block', fontSize: 12.5, color: 'text.secondary' }}>{weekdayShort(date)}</Num>
                  <Num sx={{ fontSize: 13 }}>{fmtDateShort(date)}</Num>
                </Box>
                <Typography flex={1} minWidth={0} noWrap fontWeight={n ? 600 : 400} color={n ? 'text.primary' : 'text.secondary'}>
                  {n ? dd.title || `${ordinal(d)} gün` : 'İstirahət'}
                </Typography>
                <Num sx={{ fontSize: 12.5, color: 'text.secondary' }}>{n ? `${n} hərəkət` : ''}</Num>
              </ListRow>
            );
          })}
        </Panel>

        <Panel
          flush
          scroll
          title={`${weekday(selDate)}, ${fmtDateShort(selDate)}`}
          meta={`${ordinal(selDay)} gün${weeks > 1 ? ` · ${ordinal(week)} həftə` : ''}`}
          action={
            day?.exercises.length ? (
              <Button size="small" onClick={() => updateDay(k, () => ({ title: '', exercises: [] }))} sx={{ color: 'text.secondary' }}>
                İstirahət günü et
              </Button>
            ) : undefined
          }
        >
          <Stack gap={1.5} p={2.5}>
            {day?.exercises.length ? (
              <TextField
                label="Günün adı"
                placeholder="məs. Ayaq günü"
                value={day.title}
                onChange={(e) => updateDay(k, (x) => ({ ...x, title: e.target.value }))}
              />
            ) : (
              <Typography color="text.secondary">İstirahət günü. Hərəkət əlavə etsəniz, məşq gününə çevriləcək.</Typography>
            )}
            {day?.exercises.map((e, i) => (
              <Stack
                key={e.key}
                direction={{ xs: 'column', lg: 'row' }}
                gap={1}
                alignItems={{ lg: 'center' }}
                sx={{ py: 1.25, borderTop: `1px solid ${rule}` }}
              >
                <Stack direction="row" gap={1} alignItems="center" flex={1} minWidth={0}>
                  <Num sx={{ width: 18, color: 'text.secondary', fontSize: 13 }}>{i + 1}</Num>
                  <ExerciseSelect value={e.exerciseId} onChange={(v) => updateEx(k, e.key, { exerciseId: v })} />
                </Stack>
                <Stack direction="row" gap={1} alignItems="center" pl={{ xs: 3.25, lg: 0 }}>
                  <TextField
                    size="small"
                    type="number"
                    label="Set"
                    value={e.sets}
                    onChange={(ev) => updateEx(k, e.key, { sets: Math.min(20, int(ev.target.value)) })}
                    sx={{ width: 76 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Təkrar"
                    value={e.reps}
                    onChange={(ev) => updateEx(k, e.key, { reps: Math.min(200, int(ev.target.value)) })}
                    sx={{ width: 86 }}
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
                    sx={{ width: 118 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => updateDay(k, (x) => ({ ...x, exercises: x.exercises.filter((y) => y.key !== e.key) }))}
                    aria-label="Hərəkəti sil"
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            ))}
            <Box>
              <Button
                variant="outlined"
                startIcon={<AddRounded />}
                onClick={() => updateDay(k, (x) => ({ ...x, exercises: [...x.exercises, exRow()] }))}
              >
                Hərəkət əlavə et
              </Button>
            </Box>
          </Stack>
        </Panel>
      </Box>
    </Screen>
  );
}
