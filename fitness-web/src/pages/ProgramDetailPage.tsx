import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { ProgramDay } from '../api/types';
import { EmptyState, Loading, Num, PageHeader, StatStrip, StatusLabel } from '../components/common';
import WorkoutDialog, { draftFromProgramDay, draftFromWorkout, type WorkoutDraft } from '../components/WorkoutDialog';
import { notify } from '../store/ui';
import { display } from '../theme';
import { fmtDate, fmtDateShort, fmtNum, ordinal, today, weekdayShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';

export default function ProgramDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tk = useTheme().tokens;
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
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/programs')}>
              Proqramlar
            </Button>
            {p.isActive ? (
              <Typography fontWeight={600} color="secondary.main" px={1}>
                Aktiv proqram
              </Typography>
            ) : (
              <Button variant="outlined" onClick={activate}>
                Aktiv et
              </Button>
            )}
            <Button variant="contained" component={RouterLink} to={`/programs/${p.id}/edit`}>
              Redaktə
            </Button>
          </Stack>
        }
      />
      {p.description && (
        <Typography color="text.secondary" mt={-1.5} mb={3} maxWidth={720}>
          {p.description}
        </Typography>
      )}

      <Box mb={4}>
        <StatStrip
          items={[
            { label: 'İcra', value: `${p.stats.progress}%` },
            { label: 'Tamamlanıb', value: p.stats.completed, unit: 'gün' },
            { label: 'Buraxılıb', value: p.stats.missed, unit: 'gün', accent: p.stats.missed > 0 },
            { label: 'Qalıb', value: p.stats.remaining, unit: 'gün' },
          ]}
        />
      </Box>

      {Array.from({ length: weeks }, (_, wi) => {
        const ws = p.weekStats[wi];
        return (
          <Box key={wi} mb={4}>
            <Stack direction="row" alignItems="baseline" gap={2} mb={1.5}>
              <Typography variant="h5" component="h2" whiteSpace="nowrap">
                {weeks > 1 ? `${ordinal(wi + 1)} həftə` : 'Həftə planı'}
              </Typography>
              <Num sx={{ fontSize: 14, color: 'text.secondary' }}>
                {ws.completed}/{ws.planned} tamamlandı
              </Num>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(7, minmax(0, 1fr))' },
                bgcolor: 'background.paper',
                border: `1px solid ${tk.ruleStrong}`,
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              {Array.from({ length: 7 }, (_, di) => {
                const date = dayjs(p.startDate).add(wi * 7 + di, 'day').format('YYYY-MM-DD');
                const d = byKey.get(`${wi + 1}-${di + 1}`);
                const isToday = date === today();
                // Today's training day is inverted, like on the landing page.
                const inverted = isToday && !!d;
                const mark = d?.status === 'done' ? tk.green : d?.status === 'missed' ? tk.ruleStrong : 'transparent';
                const dim = inverted ? { color: 'inherit', opacity: 0.7 } : { color: 'text.secondary' };
                return (
                  <Box
                    key={di}
                    sx={{
                      display: { xs: 'grid', lg: 'flex' },
                      gridTemplateColumns: { xs: '96px minmax(0, 1fr)', sm: '120px minmax(0, 1fr) auto' },
                      flexDirection: 'column',
                      alignItems: { xs: 'start', sm: 'center', lg: 'stretch' },
                      columnGap: 2,
                      rowGap: 1,
                      minHeight: { lg: 230 },
                      p: { xs: 2, lg: 1.75 },
                      borderTop: { xs: di ? `1px solid ${tk.rule}` : 0, lg: `3px solid ${mark}` },
                      borderLeft: { xs: `3px solid ${mark}`, lg: di ? `1px solid ${tk.rule}` : 0 },
                      bgcolor: inverted ? tk.ink : 'transparent',
                      color: inverted ? tk.paper : 'text.primary',
                      boxShadow: isToday && !d ? `inset 0 0 0 2px ${tk.ink}` : 'none',
                    }}
                  >
                    <Box>
                      <Num sx={{ fontSize: 13, ...dim }}>
                        {weekdayShort(date)} · {fmtDateShort(date)}
                      </Num>
                      {d && <StatusLabel status={d.status} sx={{ display: 'flex', mt: 0.5, ...(inverted && { color: tk.red }) }} />}
                    </Box>
                    {d ? (
                      <>
                        <Box flex={{ lg: 1 }} minWidth={0} mt={{ lg: 1 }}>
                          <Typography sx={{ ...display(88), fontWeight: 700, fontSize: 19, lineHeight: 1.1 }}>{d.title}</Typography>
                          <Stack gap={0.75} mt={1}>
                            {d.exercises.map((e, i) => (
                              <Box key={i} sx={{ fontSize: 13, lineHeight: 1.3 }}>
                                <Box sx={{ opacity: inverted ? 0.92 : 1 }}>{e.exercise?.name}</Box>
                                <Num sx={{ fontSize: 12, ...dim }}>
                                  {e.sets}×{e.reps}
                                  {e.targetWeightKg ? ` · ${fmtNum(e.targetWeightKg, 1)} kg` : ''}
                                </Num>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                        <Box sx={{ gridColumn: { xs: '2', sm: 'auto' }, mt: { lg: 1.5 } }}>
                          {d.status === 'done' ? (
                            <Button size="small" onClick={() => openWorkout(d)} sx={{ px: 0, minWidth: 0 }}>
                              Nəticəyə bax
                            </Button>
                          ) : d.status === 'today' ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => setDraft(draftFromProgramDay(d))}
                              sx={inverted ? { bgcolor: tk.paper, color: tk.ink, '&:hover': { bgcolor: tk.red, color: '#fff' } } : undefined}
                            >
                              Qeyd et
                            </Button>
                          ) : (
                            <Button size="small" onClick={() => setDraft(draftFromProgramDay(d))} sx={{ px: 0, minWidth: 0, color: 'text.secondary' }}>
                              Qeyd et
                            </Button>
                          )}
                        </Box>
                      </>
                    ) : (
                      <Typography sx={{ ...display(88), fontWeight: 700, fontSize: 19, color: tk.ruleStrong, mt: { lg: 1 } }}>
                        İstirahət
                      </Typography>
                    )}
                  </Box>
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
