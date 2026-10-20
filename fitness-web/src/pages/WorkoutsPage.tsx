import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Box, Button, IconButton, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';
import type { Workout } from '../api/types';
import { EmptyState, ListRow, Loading, Num, Panel, Screen } from '../components/common';
import { draftFromWorkout } from '../components/WorkoutDialog';
import { notify, useComposer, useDataVersion } from '../store/ui';
import { display } from '../theme';
import { fmtDayMonth, fmtMonth, fmtNum, fmtVolume, MUSCLE_LABELS, weekday, weekdayShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';

const volumeOf = (w: Workout) => w.sets.reduce((s, x) => s + x.reps * x.weightKg, 0);

/** Consecutive sets of one exercise form a block. */
function blocks(w: Workout) {
  const out: { name: string; group?: string; sets: Workout['sets'] }[] = [];
  for (const s of w.sets) {
    const last = out[out.length - 1];
    if (last && last.name === s.exercise?.name) last.sets.push(s);
    else out.push({ name: s.exercise?.name ?? '?', group: s.exercise ? MUSCLE_LABELS[s.exercise.muscleGroup] : undefined, sets: [s] });
  }
  return out;
}

function Detail({ w, onDeleted }: { w: Workout; onDeleted: () => void }) {
  const t = useTheme().tokens;
  const openComposer = useComposer((s) => s.openComposer);
  const bs = blocks(w);
  const remove = async () => {
    if (!confirm(`"${w.title}" məşqi silinsin?`)) return;
    try {
      await api.deleteWorkout(w.id);
      notify('Məşq silindi');
      onDeleted();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Stack direction="row" alignItems="flex-start" gap={2} px={{ xs: 2, sm: 3 }} py={2} sx={{ borderBottom: `1px solid ${t.rule}` }}>
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" color="text.secondary">
            {weekday(w.date)}, {fmtDayMonth(w.date)}
            {w.programDayId && ' · proqramdan'}
          </Typography>
          <Typography sx={{ ...display(84), fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.2rem' }, lineHeight: 1.05 }}>{w.title}</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" size="small" onClick={() => openComposer(draftFromWorkout(w))}>
            Redaktə
          </Button>
          <Button size="small" onClick={remove} sx={{ color: 'text.secondary' }}>
            Sil
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderBottom: `1px solid ${t.rule}`, flexShrink: 0 }}>
        {[
          ['Həcm', volumeOf(w) ? fmtVolume(volumeOf(w)) : '—'],
          ['Set', `${w.sets.length}`],
          ['Müddət', w.durationMin ? `${w.durationMin} dəq` : '—'],
        ].map(([k, v], i) => (
          <Box key={k} px={{ xs: 2, sm: 3 }} py={1.25} sx={{ borderLeft: i ? `1px solid ${t.rule}` : 0 }}>
            <Typography variant="body2" color="text.secondary">
              {k}
            </Typography>
            <Num sx={{ fontSize: 20, fontWeight: 600 }}>{v}</Num>
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' } }}>
        {bs.map((b, bi) => {
          const best = Math.max(...b.sets.map((s) => s.weightKg));
          return (
            <Box key={bi} px={{ xs: 2, sm: 3 }} py={1.5} sx={{ borderTop: bi ? `1px solid ${t.rule}` : 0 }}>
              <Stack direction="row" alignItems="baseline" gap={1.5} mb={0.75}>
                <Typography fontWeight={600} fontSize={16}>
                  {b.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {b.group}
                </Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr', rowGap: 0.25, maxWidth: 440 }}>
                {['Set', 'Təkrar', 'Çəki', 'Həcm'].map((h) => (
                  <Typography key={h} variant="body2" color="text.secondary" fontSize={12.5}>
                    {h}
                  </Typography>
                ))}
                {b.sets.map((s, i) => (
                  <Box key={i} sx={{ display: 'contents', '& > *': { py: 0.25 } }}>
                    <Num sx={{ color: 'text.secondary' }}>{i + 1}</Num>
                    <Num>{s.reps}</Num>
                    <Num sx={{ fontWeight: s.weightKg === best && best > 0 ? 600 : 400 }}>{s.weightKg ? `${fmtNum(s.weightKg, 1)} kg` : '—'}</Num>
                    <Num sx={{ color: 'text.secondary' }}>{s.weightKg ? fmtNum(s.reps * s.weightKg) : '—'}</Num>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
        {w.notes && (
          <Box px={{ xs: 2, sm: 3 }} py={1.5} sx={{ borderTop: `1px solid ${t.rule}` }}>
            <Typography variant="body2" color="text.secondary" mb={0.25}>
              Qeyd
            </Typography>
            <Typography>{w.notes}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function WorkoutsPage() {
  const t = useTheme().tokens;
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const version = useDataVersion();
  const openComposer = useComposer((s) => s.openComposer);
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const from = month.format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');
  const { data, loading, reload } = useAsync(() => api.workouts(from, to), [from, to, version]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const workouts = data ?? [];
  const selected = workouts.find((w) => w.id === selectedId) ?? (desktop ? workouts[0] : undefined);
  useEffect(() => setSelectedId(null), [from]);

  const totalVolume = workouts.reduce((s, w) => s + volumeOf(w), 0);
  const isCurrent = month.isSame(dayjs(), 'month');

  return (
    <Screen
      title="Jurnal"
      purpose="Yazdığınız bütün məşqlər, aylar üzrə. Birini seçin — setləri sağda açılır."
    >
      <Box
        sx={{
          height: { md: '100%' },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(320px, 4fr) minmax(0, 7fr)' },
          gap: 2,
        }}
      >
        <Panel
          flush
          scroll
          title={
            <Stack direction="row" alignItems="center" gap={0.5} ml={-1}>
              <IconButton size="small" onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="Əvvəlki ay">
                <ChevronLeftRounded />
              </IconButton>
              <Typography variant="h6" component="h2" minWidth={138} textAlign="center">
                {fmtMonth(month)}
              </Typography>
              <IconButton size="small" onClick={() => setMonth(month.add(1, 'month'))} disabled={isCurrent} aria-label="Növbəti ay">
                <ChevronRightRounded />
              </IconButton>
            </Stack>
          }
          action={
            <Num sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'right' }}>
              {workouts.length} məşq{totalVolume ? ` · ${fmtVolume(totalVolume)}` : ''}
            </Num>
          }
        >
          {loading && !data ? (
            <Loading />
          ) : workouts.length === 0 ? (
            <Box px={2.5}>
              <EmptyState
                text={isCurrent ? 'Bu ay hələ məşq yazılmayıb.' : 'Bu ay üçün məşq yoxdur.'}
                action={
                  isCurrent && (
                    <Button variant="contained" onClick={() => openComposer()}>
                      Məşq yaz
                    </Button>
                  )
                }
              />
            </Box>
          ) : (
            workouts.map((w, i) => (
              <ListRow key={w.id} first={i === 0} selected={selected?.id === w.id} onClick={() => setSelectedId(w.id)}>
                <Box width={40} flexShrink={0}>
                  <Num sx={{ display: 'block', fontSize: 19, fontWeight: 600, lineHeight: 1.1 }}>{dayjs(w.date).date()}</Num>
                  <Num sx={{ fontSize: 11.5, color: 'text.secondary' }}>{weekdayShort(w.date)}</Num>
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography fontWeight={600} noWrap>
                    {w.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {blocks(w).map((b) => b.name).join(', ')}
                  </Typography>
                </Box>
                <Num sx={{ fontWeight: 600, fontSize: 14 }}>{volumeOf(w) ? fmtVolume(volumeOf(w)) : '—'}</Num>
              </ListRow>
            ))
          )}
        </Panel>

        {(desktop || selected) && (
          <Panel flush sx={{ minHeight: { xs: 360, md: 0 } }}>
            {selected ? (
              <Detail w={selected} onDeleted={() => { setSelectedId(null); reload(); }} />
            ) : (
              <Box px={3} sx={{ color: t.muted }}>
                <EmptyState text="Soldan məşq seçin." />
              </Box>
            )}
          </Panel>
        )}
      </Box>
    </Screen>
  );
}
