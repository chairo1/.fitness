import CheckRounded from '@mui/icons-material/CheckRounded';
import { Box, Button, Link, Stack, Typography, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts';
import dayjs from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../api/client';
import type { Dashboard, MuscleGroup } from '../api/types';
import RecoveryMap, { recoveryOf } from '../components/bodymap/RecoveryMap';
import { EmptyState, ListRow, Loading, Num, Panel, Screen } from '../components/common';
import { draftFromProgramDay } from '../components/WorkoutDialog';
import { useAuthStore } from '../store/auth';
import { useComposer, useDataVersion } from '../store/ui';
import { display } from '../theme';
import { fmtDateShort, fmtDayMonth, fmtNum, fmtVolume, MUSCLE_LABELS, today, weekday, weekdayShort } from '../utils/format';
import { BODY_GROUPS } from '../utils/muscles';
import { useAsync } from '../utils/useAsync';

// x-charts reads categoryGapRatio on band axes, but its 7.x typings don't expose it.
const gap = (categoryGapRatio: number) => ({ categoryGapRatio }) as object;

const PAD = { xs: 2, sm: 2.5 };

function MoreLink({ to, children }: { to: string; children: string }) {
  return (
    <Link component={RouterLink} to={to} variant="body2" color="text.secondary" fontWeight={500} underline="hover" whiteSpace="nowrap">
      {children} →
    </Link>
  );
}

/** Mon–Sun of the current week: what was planned, what was done (TrainingPeaks-style), plus the week's figures. */
function WeekStrip({ data }: { data: Dashboard }) {
  const t = useTheme().tokens;
  const user = useAuthStore((s) => s.user);
  const monday = dayjs(today()).subtract((dayjs(today()).day() + 6) % 7, 'day');
  const trained = new Set(data.weekDays);
  const plan = new Map(data.weekPlan.map((p) => [p.date, p]));
  const latestWeight = data.body[data.body.length - 1];
  const { totals } = data;

  const figures = [
    { label: 'Həcm', value: fmtVolume(totals.volumeThisWeek), hint: `bu ay ${fmtVolume(totals.volumeThisMonth)}` },
    { label: 'Seriya', value: `${totals.weekStreak}`, unit: 'həftə', hint: `cəmi ${totals.total} məşq` },
    {
      label: 'Çəki',
      value: latestWeight ? fmtNum(latestWeight.weightKg, 1) : '—',
      unit: latestWeight ? 'kg' : undefined,
      hint: user?.goalWeightKg ? `hədəf ${fmtNum(user.goalWeightKg, 1)} kg` : 'hədəf yoxdur',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(7, minmax(0, 1fr))', lg: 'repeat(7, minmax(0, 1fr)) repeat(3, minmax(0, 1.15fr))' },
        bgcolor: 'background.paper',
        border: `1px solid ${t.ruleStrong}`,
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const date = monday.add(i, 'day').format('YYYY-MM-DD');
        const p = plan.get(date);
        const done = trained.has(date);
        const isToday = date === today();
        const missed = p?.status === 'missed' && !done;
        return (
          <Box
            key={date}
            sx={{
              px: { xs: 0.75, sm: 1.5 },
              py: 1.25,
              minWidth: 0,
              borderLeft: i ? `1px solid ${t.rule}` : 0,
              borderTop: `3px solid ${done ? t.red : missed ? t.ruleStrong : 'transparent'}`,
              bgcolor: isToday ? t.ink : 'transparent',
              color: isToday ? t.paper : 'text.primary',
            }}
          >
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={0.5}>
              <Num sx={{ fontSize: 12, opacity: isToday ? 0.7 : 1, color: isToday ? 'inherit' : 'text.secondary' }}>
                {weekdayShort(date)}
              </Num>
              <Num sx={{ fontSize: 15, fontWeight: 600 }}>{dayjs(date).date()}</Num>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5} mt={0.75} minHeight={20}>
              {done && <CheckRounded sx={{ fontSize: 16, color: t.red }} />}
              <Typography
                noWrap
                sx={{
                  fontSize: 13,
                  fontWeight: done || isToday ? 600 : 500,
                  color: isToday ? 'inherit' : done ? 'text.primary' : 'text.secondary',
                  textDecoration: missed ? 'line-through' : 'none',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {p?.title ?? (done ? 'Məşq' : isToday ? 'Bu gün' : '—')}
              </Typography>
            </Stack>
          </Box>
        );
      })}
      {figures.map((f, i) => (
        <Box
          key={f.label}
          sx={{
            display: { xs: 'none', lg: 'block' },
            px: 2.25,
            py: 1.25,
            minWidth: 0,
            borderLeft: `1px solid ${i ? t.rule : t.ruleStrong}`,
          }}
        >
          <Typography variant="body2" color="text.secondary" noWrap>
            {f.label}
          </Typography>
          <Typography sx={{ ...display(80), fontWeight: 800, fontSize: '1.65rem', lineHeight: 1.05 }} noWrap>
            {f.value}
            {f.unit && (
              <Num sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>{f.unit}</Num>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontSize={12.5} noWrap>
            {f.hint}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** New account: three concrete steps instead of empty charts. */
function FirstSteps({ data }: { data: Dashboard }) {
  const t = useTheme().tokens;
  const user = useAuthStore((s) => s.user);
  const openComposer = useComposer((s) => s.openComposer);
  const steps = [
    {
      done: !!(user?.heightCm && user?.goalWeightKg),
      title: 'Boy və hədəf çəki',
      text: 'BMI və hədəfə qalan kq hesablansın.',
      action: <Button component={RouterLink} to="/body" size="small" variant="outlined">Doldur</Button>,
    },
    {
      done: !!data.activeProgram,
      title: 'Proqram qur',
      text: 'Həftəlik və ya aylıq plan — hər gün burada görünəcək.',
      action: <Button component={RouterLink} to="/programs/new" size="small" variant="outlined">Qur</Button>,
    },
    {
      done: data.totals.total > 0,
      title: 'İlk məşqi yaz',
      text: 'Set, təkrar, çəki. Həcm və rekordlar özü hesablanır.',
      action: <Button size="small" variant="contained" onClick={() => openComposer()}>Yaz</Button>,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <Box px={PAD} py={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1.5}>
        <Typography variant="h6" component="p">
          Başlanğıc
        </Typography>
        <Num sx={{ fontSize: 13, color: 'text.secondary' }}>
          {doneCount}/{steps.length}
        </Num>
      </Stack>
      {steps.map((s, i) => (
        <Stack key={s.title} direction="row" gap={1.5} alignItems="center" py={1.25} sx={{ borderTop: `1px solid ${t.rule}` }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '4px',
              border: `1.5px solid ${s.done ? t.red : t.ruleStrong}`,
              bgcolor: s.done ? t.red : 'transparent',
              color: s.done ? '#fff' : 'text.secondary',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {s.done ? <CheckRounded sx={{ fontSize: 18 }} /> : i + 1}
          </Box>
          <Box flex={1} minWidth={0}>
            <Typography fontWeight={600} sx={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'text.secondary' : 'text.primary' }}>
              {s.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {s.text}
            </Typography>
          </Box>
          {!s.done && s.action}
        </Stack>
      ))}
    </Box>
  );
}

/** "What do I do today?" — the plan with one red button, or a suggestion from recovery when there is no plan. */
function Today({ data }: { data: Dashboard }) {
  const t = useTheme().tokens;
  const openComposer = useComposer((s) => s.openComposer);
  const day = data.activeProgram?.nextDay;
  const trainedToday = data.weekDays.includes(today());

  if (day && day.status === 'today') {
    return (
      <>
        <Box px={PAD} pt={2} pb={1.25}>
          <Typography variant="body2" color="secondary.main" fontWeight={600}>
            Bu gün · {data.activeProgram!.name}
          </Typography>
          <Typography sx={{ ...display(84), fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.05 }}>{day.title}</Typography>
        </Box>
        {day.exercises.map((e, i) => (
          <Stack key={i} direction="row" gap={2} px={PAD} py={1} sx={{ borderTop: `1px solid ${t.rule}` }}>
            <Typography flex={1} minWidth={0} noWrap>
              {e.exercise?.name}
            </Typography>
            <Num sx={{ fontSize: 14, color: 'text.secondary' }}>
              {e.sets} × {e.reps}
            </Num>
            <Num sx={{ fontSize: 14, width: 62, textAlign: 'right' }}>{e.targetWeightKg ? `${fmtNum(e.targetWeightKg, 1)} kg` : '—'}</Num>
          </Stack>
        ))}
        <Box px={PAD} py={1.75} sx={{ borderTop: `1px solid ${t.rule}` }}>
          <Button fullWidth size="large" variant="contained" onClick={() => openComposer(draftFromProgramDay(day))}>
            Nəticəni qeyd et
          </Button>
        </Box>
      </>
    );
  }

  if (!data.activeProgram) {
    if (!data.totals.total) return <FirstSteps data={data} />;
    // No plan: suggest the freshest groups (longest since training), Fitbod-style.
    const fresh = BODY_GROUPS.map((g) => ({ g, ...recoveryOf(data.muscles.find((m) => m.muscleGroup === g)?.lastDate) }))
      .filter((x) => x.state === 'ready' || x.state === 'none')
      .sort((a, b) => (b.days ?? 99) - (a.days ?? 99))
      .slice(0, 3)
      .map((x) => MUSCLE_LABELS[x.g as MuscleGroup].replace(' (core)', ''));
    return (
      <>
        <Box px={PAD} pt={2} pb={1.5}>
          <Typography variant="body2" color="secondary.main" fontWeight={600}>
            {trainedToday ? 'Bu gün məşq yazılıb' : 'Bu gün · plan yoxdur'}
          </Typography>
          <Typography sx={{ ...display(84), fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.05 }}>
            {fresh.length ? fresh.join(', ') : 'Hamısı bərpa olunur'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {fresh.length
              ? trainedToday
                ? 'Növbəti məşq üçün ən çox dincəlmiş qruplar.'
                : 'Bərpaya görə bu gün işləmək üçün ən hazır qruplar.'
              : 'Bütün qruplar son 3 gündə işlənib — yüngül gün və ya istirahət.'}
          </Typography>
        </Box>
        <Stack direction="row" gap={1} px={PAD} py={1.75} sx={{ borderTop: `1px solid ${t.rule}` }}>
          <Button variant="contained" onClick={() => openComposer()} sx={{ flex: 1 }}>
            Məşq yaz
          </Button>
          <Button component={RouterLink} to="/programs/new" sx={{ flex: 1 }}>
            Proqram qur
          </Button>
        </Stack>
      </>
    );
  }

  // Rest day in the program.
  return (
    <>
      <Box px={PAD} pt={2} pb={1.25}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Bu gün · istirahət
        </Typography>
        <Typography sx={{ ...display(84), fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.05 }}>
          {day ? `Növbəti: ${day.title}` : 'Proqram bitib'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {day ? `${weekday(day.date)}, ${fmtDayMonth(day.date)}` : 'Yeni proqram qurmağın vaxtıdır.'}
        </Typography>
      </Box>
      {day?.exercises.map((e, i) => (
        <Stack key={i} direction="row" gap={2} px={PAD} py={1} sx={{ borderTop: `1px solid ${t.rule}`, color: 'text.secondary' }}>
          <Typography flex={1} minWidth={0} noWrap color="inherit">
            {e.exercise?.name}
          </Typography>
          <Num sx={{ fontSize: 14 }}>
            {e.sets} × {e.reps}
          </Num>
        </Stack>
      ))}
      <Stack direction="row" gap={1} px={PAD} py={1.75} sx={{ borderTop: `1px solid ${t.rule}` }}>
        <Button variant="outlined" onClick={() => openComposer()} sx={{ flex: 1 }}>
          Plansız məşq yaz
        </Button>
        <Button component={RouterLink} to={day ? `/programs/${data.activeProgram!.id}` : '/programs/new'} sx={{ flex: 1 }}>
          {day ? 'Proqrama bax' : 'Proqram qur'}
        </Button>
      </Stack>
    </>
  );
}

function Progress({ data }: { data: Dashboard }) {
  const tk = useTheme().tokens;
  const openComposer = useComposer((s) => s.openComposer);
  const { weekly, records } = data;
  const labels = weekly.map((w) => fmtDateShort(w.week));

  if (!data.totals.total) {
    return (
      <Box px={PAD}>
        <EmptyState
          title="Hələ rəqəm yoxdur"
          text="İlk məşqdən sonra burada 12 həftəlik həcm qrafiki və hər hərəkət üzrə rekordlarınız görünəcək."
          action={
            <Button variant="contained" onClick={() => openComposer()}>
              İlk məşqi yaz
            </Button>
          }
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box px={PAD} pt={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="body2" color="text.secondary">
            Həftəlik həcm · 12 həftə
          </Typography>
          <Num sx={{ fontSize: 13, color: tk.redInk, fontWeight: 600 }}>bu həftə {fmtVolume(data.totals.volumeThisWeek)}</Num>
        </Stack>
      </Box>
      <Box sx={{ flex: 1, minHeight: 150, position: 'relative' }}>
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <BarChart
            xAxis={[
              {
                scaleType: 'band' as const,
                data: labels,
                ...gap(0.38),
                colorMap: { type: 'ordinal', values: labels, colors: labels.map((_, i) => (i === labels.length - 1 ? tk.red : tk.ink)) },
              },
            ]}
            yAxis={[{ valueFormatter: (v: number) => fmtVolume(v) }]}
            series={[{ data: weekly.map((w) => w.volume), label: 'Həcm', valueFormatter: (v) => fmtVolume(v ?? 0) }]}
            margin={{ left: 56, right: 16, top: 12, bottom: 26 }}
            slotProps={{ legend: { hidden: true } }}
            grid={{ horizontal: true }}
            sx={{ '& .MuiChartsGrid-line': { stroke: tk.rule, strokeDasharray: '2 4' } }}
          />
        </Box>
      </Box>
      <Box sx={{ borderTop: `1.5px solid ${tk.ink}`, flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" px={PAD} pt={1.25} pb={0.5}>
          <Typography variant="body2" color="text.secondary">
            Rekordlar · təxmini 1RM
          </Typography>
          <MoreLink to="/exercises">Hərəkətlər</MoreLink>
        </Stack>
        {records.slice(0, 4).map((r, i) => (
          <Stack key={r.id} direction="row" alignItems="center" gap={1.5} px={PAD} py={0.75} sx={{ borderTop: i ? `1px dotted ${tk.ruleStrong}` : 0 }}>
            <Num sx={{ fontSize: 12.5, width: 14, color: i === 0 ? 'secondary.main' : 'text.secondary' }}>{i + 1}</Num>
            <Typography flex={1} minWidth={0} noWrap fontSize={15}>
              {r.name}
            </Typography>
            <Num sx={{ fontSize: 13, color: 'text.secondary' }}>{fmtNum(r.maxWeight, 1)} kg</Num>
            <Num sx={{ fontWeight: 600, width: 76, textAlign: 'right' }}>{fmtNum(r.est1rm, 1)} kg</Num>
          </Stack>
        ))}
        <Box height={8} />
      </Box>
    </Box>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const version = useDataVersion();
  const { data, loading, error } = useAsync(api.dashboard, [version]);
  const tk = useTheme().tokens;

  if (loading && !data) return <Loading />;
  if (error || !data) return <EmptyState text={error ?? 'Məlumat yüklənmədi'} />;

  const planned = data.weekPlan.length;
  const purpose = planned
    ? `${weekday(today())}, ${fmtDayMonth(today())} · bu həftə ${data.weekPlan.filter((p) => p.status === 'done').length}/${planned} plan günü`
    : `${weekday(today())}, ${fmtDayMonth(today())} · bu həftə ${data.totals.thisWeek} məşq`;

  return (
    <Screen title={`Salam, ${user?.name?.split(' ')[0] ?? ''}`} purpose={purpose}>
      <Box
        sx={{
          height: { lg: '100%' },
          display: 'grid',
          gridTemplateRows: { lg: 'auto minmax(0, 1fr)' },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(0, 4fr) minmax(0, 4.3fr) minmax(0, 4.7fr)' },
          gap: 2,
        }}
      >
        <Box sx={{ gridColumn: '1 / -1' }}>
          <WeekStrip data={data} />
        </Box>

        <Panel flush sx={{ minHeight: { xs: 'auto', lg: 0 } }} bodySx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flexShrink: 0 }}>
            <Today data={data} />
          </Box>
          {data.recent.length > 0 && (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: `1.5px solid ${tk.ink}` }}>
              <Stack direction="row" justifyContent="space-between" px={PAD} pt={1.25} pb={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Son məşqlər
                </Typography>
                <MoreLink to="/workouts">Jurnal</MoreLink>
              </Stack>
              <Box sx={{ flex: 1, minHeight: 0, overflowY: { lg: 'auto' } }}>
                {data.recent.map((w, i) => (
                  <ListRow key={w.id} first={i === 0}>
                    <Box width={38} flexShrink={0}>
                      <Num sx={{ display: 'block', fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>{dayjs(w.date).date()}</Num>
                      <Num sx={{ fontSize: 11.5, color: 'text.secondary' }}>{weekdayShort(w.date)}</Num>
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={600} noWrap fontSize={15}>
                        {w.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {w.sets} set{w.durationMin ? ` · ${w.durationMin} dəq` : ''}
                      </Typography>
                    </Box>
                    <Num sx={{ fontWeight: 600, fontSize: 14 }}>{w.volume ? fmtVolume(w.volume) : '—'}</Num>
                  </ListRow>
                ))}
              </Box>
            </Box>
          )}
        </Panel>

        <Panel title="Bərpa" meta="Son işlənmə tarixinə görə, təxmini">
          <RecoveryMap groups={data.muscles} />
        </Panel>

        <Panel
          title="İrəliləyiş"
          flush
          sx={{ gridColumn: { md: '1 / -1', lg: 'auto' }, minHeight: { xs: 420, lg: 0 } }}
        >
          <Progress data={data} />
        </Panel>
      </Box>
    </Screen>
  );
}
