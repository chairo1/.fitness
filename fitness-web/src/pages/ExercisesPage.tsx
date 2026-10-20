import AddRounded from '@mui/icons-material/AddRounded';
import { Box, Button, Chip, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Exercise, MuscleGroup } from '../api/types';
import { EmptyState, ListRow, Loading, Num, Panel, Screen } from '../components/common';
import { useExercisesStore } from '../store/exercises';
import { notify, useDataVersion } from '../store/ui';
import { display } from '../theme';
import { fmtDate, fmtDateShort, fmtNum, MUSCLE_GROUPS, MUSCLE_LABELS } from '../utils/format';
import { musclePart } from '../utils/muscles';
import { useAsync } from '../utils/useAsync';

const BodyModel3D = lazy(() => import('../components/bodymap/BodyModel3D'));

function Progress({ exercise }: { exercise: Exercise }) {
  const t = useTheme().tokens;
  const version = useDataVersion();
  const { data, loading } = useAsync(() => api.exerciseProgress(exercise.id), [exercise.id, version]);
  const points = data ?? [];
  const best = points.reduce((m, p) => Math.max(m, p.maxWeight), 0);
  const best1rm = points.reduce((m, p) => Math.max(m, p.est1rm), 0);
  const last = points[points.length - 1];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box px={{ xs: 2, sm: 2.5 }} py={1.75} sx={{ borderBottom: `1px solid ${t.rule}` }}>
        <Typography variant="body2" color="text.secondary">
          {MUSCLE_LABELS[exercise.muscleGroup]}
          {exercise.userId && ' · öz hərəkətiniz'}
        </Typography>
        <Typography sx={{ ...display(84), fontWeight: 800, fontSize: '2rem', lineHeight: 1.05 }} noWrap>
          {exercise.name}
        </Typography>
      </Box>
      {loading && !data ? (
        <Loading />
      ) : points.length === 0 ? (
        <Box px={2.5}>
          <EmptyState text="Bu hərəkət üçün hələ nəticə yoxdur. Məşqdə yazdıqdan sonra rekord və qrafik burada görünəcək." />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', borderBottom: `1px solid ${t.rule}`, flexShrink: 0 }}>
            {[
              ['Rekord', `${fmtNum(best, 1)} kg`, true],
              ['1RM ≈', `${fmtNum(best1rm, 1)} kg`, false],
              ['Son dəfə', `${fmtNum(last.maxWeight, 1)} kg`, false],
              ['Məşq', `${points.length}`, false],
            ].map(([k, v, accent], i) => (
              <Box key={k as string} px={{ xs: 1.5, sm: 2.5 }} py={1.25} sx={{ borderLeft: i ? `1px solid ${t.rule}` : 0, minWidth: 0 }}>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {k as string}
                </Typography>
                <Num sx={{ fontSize: 19, fontWeight: 600, color: accent ? 'secondary.main' : 'text.primary' }}>{v as string}</Num>
              </Box>
            ))}
          </Box>
          <Box sx={{ flex: 1, minHeight: 200, position: 'relative' }}>
            <Box sx={{ position: 'absolute', inset: 0 }}>
              <LineChart
                xAxis={[{ scaleType: 'point', data: points.map((p) => fmtDateShort(p.date)) }]}
                series={[
                  { data: points.map((p) => p.maxWeight), label: 'Maks. çəki', color: t.ink, curve: 'linear' },
                  { data: points.map((p) => Math.round(p.est1rm * 10) / 10), label: 'Təxmini 1RM', color: t.red, curve: 'linear' },
                ]}
                margin={{ left: 48, right: 20, top: 40, bottom: 28 }}
                grid={{ horizontal: true }}
                sx={{ '& .MuiChartsGrid-line': { stroke: t.rule, strokeDasharray: '2 4' } }}
                slotProps={{ legend: { position: { vertical: 'top', horizontal: 'right' }, itemMarkWidth: 12, itemMarkHeight: 3, labelStyle: { fontSize: 12.5 } } }}
              />
            </Box>
          </Box>
          <Box sx={{ borderTop: `1.5px solid ${t.ink}`, flexShrink: 0, maxHeight: 180, overflowY: 'auto' }}>
            {[...points].reverse().slice(0, 5).map((p, i) => (
              <Stack key={p.date} direction="row" gap={2} px={{ xs: 2, sm: 2.5 }} py={0.75} sx={{ borderTop: i ? `1px dotted ${t.ruleStrong}` : 0 }}>
                <Num sx={{ fontSize: 13, color: 'text.secondary', width: 96 }}>{fmtDate(p.date)}</Num>
                <Num sx={{ fontSize: 13, flex: 1 }}>
                  {p.sets} set · {p.reps} təkrar
                </Num>
                <Num sx={{ fontSize: 13, fontWeight: p.maxWeight === best ? 600 : 400, color: p.maxWeight === best ? 'secondary.main' : 'text.primary' }}>
                  {fmtNum(p.maxWeight, 1)} kg
                </Num>
              </Stack>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export default function ExercisesPage() {
  const theme = useTheme();
  const t = theme.tokens;
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const { items, loaded, load, add, remove } = useExercisesStore();
  const [name, setName] = useState('');
  const [no3d, setNo3d] = useState(false);
  // Group, focused muscle and selected exercise live in the URL so the dashboard map can deep-link here.
  const [params, setParams] = useSearchParams();
  const muscle = params.get('muscle') as MuscleGroup | null;
  const group: MuscleGroup | null = muscle && MUSCLE_GROUPS.includes(muscle) ? muscle : null;
  const focus = musclePart(params.get('focus'));
  const list = items.filter((e) => !group || e.muscleGroup === group);
  const selected = items.find((e) => e.id === params.get('ex')) ?? (wide ? list[0] : undefined);

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };
  const pickGroup = (g: MuscleGroup | null, focusId?: string) => setQuery({ muscle: g, focus: focusId ?? null, ex: null });

  useEffect(() => {
    load(true);
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (!group) return;
      const ex = await add(name, group);
      setName('');
      notify('Hərəkət əlavə olundu');
      setQuery({ ex: ex.id });
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const del = async (ex: Exercise) => {
    if (!confirm(`"${ex.name}" silinsin?`)) return;
    try {
      await remove(ex.id);
      notify('Silindi');
      setQuery({ ex: null });
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <Screen title="Hərəkətlər" purpose="Əzələ seçin → hərəkət seçin → rekordu və irəliləyişi görün.">
      <Box
        sx={{
          height: { md: '100%' },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 5fr) minmax(0, 6fr)', lg: 'minmax(0, 3.6fr) minmax(0, 4fr) minmax(0, 5.4fr)' },
          gap: 2,
        }}
      >
        {wide && (
          <Panel flush title="Əzələ" meta={focus ? `${focus.name} · ${focus.latin}` : group ? MUSCLE_LABELS[group] : 'Hamısı'}>
            {no3d ? (
              <Box p={2.5}>
                <EmptyState text="3D model bu brauzerdə açılmadı. Qrupu ortadakı siyahıdan seçin." />
              </Box>
            ) : (
              <Suspense fallback={<Loading />}>
                <BodyModel3D
                  variant="fill"
                  selectedGroup={group}
                  onPickGroup={(g, partId) => pickGroup(g, partId)}
                  onUnsupported={() => setNo3d(true)}
                />
              </Suspense>
            )}
          </Panel>
        )}

        <Panel flush bodySx={{ display: 'flex', flexDirection: 'column' }} sx={{ minHeight: { xs: 420, md: 0 } }}>
          <Stack direction="row" gap={0.75} flexWrap="wrap" px={2} py={1.5} sx={{ borderBottom: `1px solid ${t.rule}`, flexShrink: 0 }}>
            <Chip size="small" label="Hamısı" color={!group ? 'primary' : 'default'} variant={!group ? 'filled' : 'outlined'} onClick={() => pickGroup(null)} />
            {MUSCLE_GROUPS.map((g) => (
              <Chip
                key={g}
                size="small"
                label={MUSCLE_LABELS[g].replace(' (core)', '')}
                color={group === g ? 'primary' : 'default'}
                variant={group === g ? 'filled' : 'outlined'}
                onClick={() => pickGroup(g)}
              />
            ))}
          </Stack>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' } }}>
            {!loaded ? (
              <Loading />
            ) : list.length === 0 ? (
              <Box px={2.5}>
                <EmptyState text="Bu qrupda hələ hərəkət yoxdur. Aşağıdan öz hərəkətinizi əlavə edin." />
              </Box>
            ) : (
              list.map((ex, i) => (
                <ListRow key={ex.id} first={i === 0} selected={selected?.id === ex.id} onClick={() => setQuery({ ex: ex.id })}>
                  <Typography flex={1} minWidth={0} noWrap fontWeight={selected?.id === ex.id ? 600 : 400}>
                    {ex.name}
                  </Typography>
                  {!group && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {MUSCLE_LABELS[ex.muscleGroup].replace(' (core)', '')}
                    </Typography>
                  )}
                  {ex.userId && (
                    <Box
                      component="span"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        del(ex);
                      }}
                      sx={{ fontSize: 13, color: 'text.secondary', '&:hover': { color: 'secondary.main', textDecoration: 'underline' } }}
                    >
                      sil
                    </Box>
                  )}
                </ListRow>
              ))
            )}
          </Box>
          <Stack
            component="form"
            onSubmit={submit}
            direction="row"
            gap={1}
            px={2}
            py={1.5}
            sx={{ borderTop: `1.5px solid ${t.ink}`, flexShrink: 0 }}
          >
            <TextField
              size="small"
              label={group ? `Öz hərəkətiniz · ${MUSCLE_LABELS[group]}` : 'Öz hərəkətiniz — əvvəlcə qrup seçin'}
              placeholder="məs. Smith Machine Squat"
              disabled={!group}
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" disabled={!name.trim()} sx={{ minWidth: 0, px: 1.5 }} aria-label="Əlavə et">
              <AddRounded />
            </Button>
          </Stack>
        </Panel>

        <Panel flush sx={{ minHeight: { xs: 460, md: 0 } }}>
          {selected ? (
            <Progress exercise={selected} />
          ) : (
            <Box px={2.5}>
              <EmptyState text="Siyahıdan hərəkət seçin — rekord, təxmini 1RM və qrafik burada açılacaq." />
            </Box>
          )}
        </Panel>
      </Box>
    </Screen>
  );
}
