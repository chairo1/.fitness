import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { Box, Button, LinearProgress, Stack, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Program, ProgramDay } from '../api/types';
import { EmptyState, ListRow, Loading, Num, Panel, Screen, StatusLabel, useStatusColor } from '../components/common';
import { draftFromProgramDay, draftFromWorkout } from '../components/WorkoutDialog';
import { notify, useComposer, useDataVersion } from '../store/ui';
import { display } from '../theme';
import { fmtDate, fmtDateShort, fmtNum, ordinal, today, weekdayShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';

function phase(p: Program) {
  const t = today();
  if (t < p.startDate) return 'Başlamayıb';
  if (t > p.endDate) return 'Bitib';
  return 'Davam edir';
}

/** One calendar cell: date, status bar, the day's plan, and the one thing you can do with it. */
function DayCell({ date, day, compact, first }: { date: string; day?: ProgramDay; compact: boolean; first: boolean }) {
  const t = useTheme().tokens;
  const statusColor = useStatusColor();
  const openComposer = useComposer((s) => s.openComposer);
  const isToday = date === today();
  const inverted = isToday && !!day;
  const bar = day && day.status !== 'upcoming' && day.status !== 'today' ? statusColor(day.status) : 'transparent';
  const dim = inverted ? { color: 'inherit', opacity: 0.68 } : { color: 'text.secondary' };

  const openResult = async () => {
    try {
      openComposer(draftFromWorkout(await api.workout(day!.workouts[0].id)));
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const list = day?.exercises ?? [];
  const shown = compact ? list.slice(0, 2) : list;

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        p: 1.25,
        borderLeft: { md: first ? 0 : `1px solid ${t.rule}` },
        borderTop: { xs: `1px solid ${t.rule}`, md: `3px solid ${bar}` },
        boxShadow: { xs: `inset 3px 0 0 ${bar}`, md: 'none' },
        bgcolor: inverted ? t.ink : 'transparent',
        color: inverted ? t.paper : 'text.primary',
        outline: isToday && !day ? `2px solid ${t.ink}` : 0,
        outlineOffset: -2,
        overflow: 'hidden',
      }}
    >
      <Num sx={{ fontSize: 12, ...dim }}>
        {weekdayShort(date)} · {fmtDateShort(date)}
      </Num>
      {day && !compact && <StatusLabel status={day.status} sx={{ mt: 0.25, ...(inverted && { color: t.red }) }} />}
      {day ? (
        <>
          <Typography sx={{ ...display(88), fontWeight: 700, fontSize: compact ? 16 : 19, lineHeight: 1.1, mt: 0.5 }} noWrap>
            {day.title}
          </Typography>
          <Tooltip
            title={list.map((e) => `${e.exercise?.name} · ${e.sets}×${e.reps}${e.targetWeightKg ? ` · ${fmtNum(e.targetWeightKg, 1)} kg` : ''}`).join('\n')}
            slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line' } } }}
            disableHoverListener={!compact}
          >
            <Stack gap={compact ? 0 : 0.6} mt={0.6} sx={{ minHeight: 0, overflow: 'hidden' }}>
              {shown.map((e, i) => (
                <Box key={i} sx={{ fontSize: 12.5, lineHeight: 1.3, minWidth: 0 }}>
                  <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: inverted ? 0.92 : 1 }}>
                    {e.exercise?.name}
                  </Box>
                  {!compact && (
                    <Num sx={{ fontSize: 11.5, ...dim }}>
                      {e.sets}×{e.reps}
                      {e.targetWeightKg ? ` · ${fmtNum(e.targetWeightKg, 1)} kg` : ''}
                    </Num>
                  )}
                </Box>
              ))}
              {compact && list.length > 2 && <Box sx={{ fontSize: 12, ...dim }}>+{list.length - 2} hərəkət</Box>}
            </Stack>
          </Tooltip>
          <Box mt={0.75}>
            {day.status === 'done' ? (
              <Button size="small" onClick={openResult} sx={{ px: 0, minWidth: 0, minHeight: 26, color: inverted ? 'inherit' : t.green }}>
                Nəticə
              </Button>
            ) : (
              <Button
                size="small"
                variant={day.status === 'today' ? 'contained' : 'text'}
                onClick={() => openComposer(draftFromProgramDay(day))}
                sx={day.status === 'today' ? { minHeight: 28 } : { px: 0, minWidth: 0, minHeight: 26, color: dim.color }}
              >
                Qeyd et
              </Button>
            )}
          </Box>
        </>
      ) : (
        <Typography sx={{ ...display(88), fontWeight: 700, fontSize: compact ? 15 : 18, color: t.ruleStrong, mt: 0.5 }}>İstirahət</Typography>
      )}
    </Box>
  );
}

function ProgramView({ id, onChanged }: { id: string; onChanged: () => void }) {
  const t = useTheme().tokens;
  const navigate = useNavigate();
  const version = useDataVersion();
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const { data: p, loading, reload } = useAsync(() => api.program(id), [id, version]);

  if (loading && !p) return <Loading />;
  if (!p) return <EmptyState text="Proqram tapılmadı" />;

  const weeks = p.weekStats.length;
  const byKey = new Map((p.days ?? []).map((d) => [`${d.week}-${d.dayIndex}`, d]));

  const activate = async () => {
    await api.activateProgram(p.id);
    notify(`"${p.name}" aktiv proqram oldu`);
    reload();
    onChanged();
  };
  const remove = async () => {
    if (!confirm(`"${p.name}" proqramı silinsin? Qeyd olunmuş məşqlər qalacaq.`)) return;
    try {
      await api.deleteProgram(p.id);
      notify('Proqram silindi');
      onChanged();
      navigate('/programs');
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} gap={1.5} px={{ xs: 2, sm: 2.5 }} py={1.75} sx={{ borderBottom: `1px solid ${t.rule}` }}>
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} · {fmtDate(p.startDate)} — {fmtDate(p.endDate)} · {phase(p)}
          </Typography>
          <Typography sx={{ ...display(84), fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.1rem' }, lineHeight: 1.05 }} noWrap>
            {p.name}
          </Typography>
          {p.description && (
            <Typography variant="body2" color="text.secondary" noWrap mt={0.25}>
              {p.description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" gap={1} alignItems="center" flexShrink={0}>
          {p.isActive ? (
            <Typography variant="body2" fontWeight={600} color="secondary.main" px={0.5}>
              Aktiv
            </Typography>
          ) : (
            <Button size="small" variant="contained" onClick={activate}>
              Aktiv et
            </Button>
          )}
          <Button size="small" variant="outlined" component={RouterLink} to={`/programs/${p.id}/edit`}>
            Redaktə
          </Button>
          <Button size="small" onClick={remove} sx={{ color: 'text.secondary' }}>
            Sil
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" gap={3} px={{ xs: 2, sm: 2.5 }} py={1.25} sx={{ borderBottom: `1px solid ${t.rule}`, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 200px' }}>
          <LinearProgress variant="determinate" value={p.stats.progress} />
        </Box>
        <Num sx={{ fontWeight: 600 }}>{p.stats.progress}%</Num>
        {[
          ['tamamlanıb', p.stats.completed, t.green],
          ['buraxılıb', p.stats.missed, t.redInk],
          ['qalıb', p.stats.remaining, t.muted],
        ].map(([label, n, c]) => (
          <Typography key={label as string} variant="body2" color="text.secondary">
            <Num sx={{ color: c as string, fontWeight: 600 }}>{n as number}</Num> {label as string}
          </Typography>
        ))}
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: { md: `repeat(${weeks}, minmax(0, 1fr))` },
          overflowY: { md: 'auto' },
        }}
      >
        {Array.from({ length: weeks }, (_, wi) => (
          <Box key={wi} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderTop: wi ? `1.5px solid ${t.ink}` : 0 }}>
            {weeks > 1 && (
              <Stack direction="row" gap={1.5} px={1.25} pt={0.75} alignItems="baseline">
                <Typography variant="body2" fontWeight={600}>
                  {ordinal(wi + 1)} həftə
                </Typography>
                <Num sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {p.weekStats[wi].completed}/{p.weekStats[wi].planned}
                </Num>
              </Stack>
            )}
            <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { md: 'repeat(7, minmax(0, 1fr))' } }}>
              {Array.from({ length: 7 }, (_, di) => (
                <DayCell
                  key={di}
                  first={di === 0}
                  compact={weeks > 1 && desktop}
                  date={dayjs(p.startDate).add(wi * 7 + di, 'day').format('YYYY-MM-DD')}
                  day={byKey.get(`${wi + 1}-${di + 1}`)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function ProgramsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const desktop = useMediaQuery(useTheme().breakpoints.up('md'));
  const { data, loading, reload } = useAsync(api.programs);
  const programs = data ?? [];
  const currentId = id ?? (desktop ? (programs.find((p) => p.isActive) ?? programs[0])?.id : undefined);

  const newButton = (
    <Button variant="outlined" startIcon={<AddRounded />} component={RouterLink} to="/programs/new">
      Yeni proqram
    </Button>
  );

  if (loading && !data) return <Loading />;

  if (!programs.length) {
    return (
      <Screen title="Proqramlar" purpose="Həftəlik və ya aylıq plan: hər gün nə ediləcək və nə edildi.">
        <Panel sx={{ height: 'auto', maxWidth: 640 }}>
          <EmptyState
            title="Hələ proqram yoxdur"
            text="Həftəlik (7 gün) və ya aylıq (4 həftə) plan qurun: hər gün üçün hərəkətlər, set × təkrar və hədəf çəki. Sonra hər günün statusu təqvimdə görünəcək."
            action={
              <Button variant="contained" component={RouterLink} to="/programs/new">
                Proqram qur
              </Button>
            }
          />
        </Panel>
      </Screen>
    );
  }

  const showList = desktop || !id;
  return (
    <Screen
      title="Proqramlar"
      purpose="Plan və icra bir təqvimdə: yaşıl — edilib, qırmızı — buraxılıb, qara — bu gün."
      action={desktop || !id ? newButton : (
        <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/programs')}>
          Bütün proqramlar
        </Button>
      )}
    >
      <Box
        sx={{
          height: { md: '100%' },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(260px, 3fr) minmax(0, 10fr)' },
          gap: 2,
        }}
      >
        {showList && (
          <Panel flush scroll title="Hamısı" action={<Num sx={{ fontSize: 13, color: 'text.secondary' }}>{programs.length}</Num>}>
            {programs.map((p, i) => (
              <ListRow key={p.id} first={i === 0} selected={p.id === currentId} onClick={() => navigate(`/programs/${p.id}`)}>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="baseline" gap={1}>
                    <Typography fontWeight={600} noWrap flex={1}>
                      {p.name}
                    </Typography>
                    {p.isActive && (
                      <Typography variant="body2" fontWeight={600} color="secondary.main">
                        Aktiv
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} · {phase(p)} · {p.stats.completed}/{p.stats.totalDays} gün
                  </Typography>
                  <LinearProgress variant="determinate" value={p.stats.progress} sx={{ mt: 0.75, height: 3 }} />
                </Box>
              </ListRow>
            ))}
          </Panel>
        )}
        {currentId && (
          <Panel flush sx={{ minHeight: { xs: 'auto', md: 0 } }}>
            <ProgramView id={currentId} onChanged={reload} />
          </Panel>
        )}
      </Box>
    </Screen>
  );
}
