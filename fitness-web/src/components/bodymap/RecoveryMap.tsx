import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MuscleGroup } from '../../api/types';
import { MUSCLE_LABELS, today } from '../../utils/format';
import { BODY_GROUPS, exercisesUrl, musclePart } from '../../utils/muscles';
import { Num } from '../common';
import {
  BACK_LINES,
  BACK_MUSCLES,
  BACK_SHORTS,
  BASE_SHAPES,
  FIGURE_H,
  FIGURE_W,
  FRONT_LINES,
  FRONT_MUSCLES,
  FRONT_SHORTS,
  GLUTES,
  HAIR_BACK,
  HAIR_FRONT,
  type MuscleShape,
} from './anatomy';

export type Recovery = 'fatigued' | 'recovering' | 'ready' | 'none';

/**
 * A deliberately simple estimate from the last day a group was trained (Fitbod-style, without load modelling):
 * 0–1 days → fatigued, 2–3 → recovering, 4+ → ready. Not trained in the last 30 days → none.
 */
export function recoveryOf(lastDate?: string): { state: Recovery; days: number | null } {
  if (!lastDate) return { state: 'none', days: null };
  const days = dayjs(today()).diff(dayjs(lastDate), 'day');
  return { state: days <= 1 ? 'fatigued' : days <= 3 ? 'recovering' : 'ready', days };
}

export const RECOVERY_LABEL: Record<Recovery, string> = {
  fatigued: 'Yorğun',
  recovering: 'Bərpa olunur',
  ready: 'Hazır',
  none: '30 gündə işlənməyib',
};

const ago = (days: number | null) =>
  days == null ? '—' : days === 0 ? 'bu gün' : days === 1 ? 'dünən' : `${days} gün əvvəl`;

export interface GroupLoad {
  muscleGroup: MuscleGroup;
  sets: number;
  lastDate: string;
}

export default function RecoveryMap({ groups }: { groups: GroupLoad[] }) {
  const theme = useTheme();
  const t = theme.tokens;
  const dark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  const byGroup = new Map(groups.map((g) => [g.muscleGroup, g]));
  const stateOfGroup = (g: MuscleGroup) => recoveryOf(byGroup.get(g)?.lastDate);
  const fill: Record<Recovery, string> = {
    fatigued: t.red,
    recovering: alpha(t.red, 0.42),
    ready: t.card,
    none: t.card,
  };
  const hoverPart = musclePart(hover);
  const hoverGroup = hoverPart?.group ?? null;

  const muscle = (m: MuscleShape, i: number) => {
    const p = musclePart(m.part)!;
    const st = stateOfGroup(p.group).state;
    const hot = hoverGroup === p.group;
    return (
      <path
        key={i}
        d={m.d}
        fill={fill[st]}
        stroke={hot ? t.ink : alpha(t.ink, 0.45)}
        strokeWidth={hot ? 2.4 : 1.1}
        strokeLinejoin="round"
        style={{ cursor: 'pointer' }}
        onPointerEnter={() => setHover(m.part)}
        onPointerLeave={() => setHover(null)}
        onClick={() => navigate(exercisesUrl(p.group, p.id))}
      />
    );
  };

  const figure = (front: boolean) => (
    <>
      {BASE_SHAPES.map((d, i) => (
        <path key={`o${i}`} d={d} fill="none" stroke={t.ink} strokeWidth={3.2} strokeLinejoin="round" />
      ))}
      {BASE_SHAPES.map((d, i) => (
        <path key={`f${i}`} d={d} fill={t.sunken} />
      ))}
      {(front ? FRONT_LINES : BACK_LINES).map((d, i) => (
        <path key={`l${i}`} d={d} fill="none" stroke={alpha(t.ink, 0.35)} strokeWidth={1.1} />
      ))}
      {(front ? FRONT_MUSCLES : BACK_MUSCLES).map(muscle)}
      <path d={front ? FRONT_SHORTS : BACK_SHORTS} fill={dark ? '#3a382f' : '#2b2a24'} />
      {!front && GLUTES.map(muscle)}
      <path d={front ? HAIR_FRONT : HAIR_BACK} fill={alpha(t.ink, 0.7)} />
    </>
  );

  const readout = hoverPart
    ? (() => {
        const r = stateOfGroup(hoverPart.group);
        return `${hoverPart.name} · ${RECOVERY_LABEL[r.state]} · ${ago(r.days)}`;
      })()
    : 'Əzələnin üzərinə gətirin; klik — həmin əzələ üçün hərəkətlər.';

  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: { xs: 'auto auto auto', md: 'minmax(0, 1fr) auto auto' },
        rowGap: 1.5,
      }}
    >
      <Box sx={{ minHeight: 0, display: 'flex', justifyContent: 'center', height: { xs: 320, md: 'auto' } }}>
        <svg
          viewBox={`0 0 ${FIGURE_W * 2} ${FIGURE_H}`}
          style={{ height: '100%', width: '100%', display: 'block' }}
          role="img"
          aria-label="Əzələ bərpa xəritəsi: ön və arxa görünüş"
        >
          <g>{figure(true)}</g>
          <g transform={`translate(${FIGURE_W},0)`}>{figure(false)}</g>
        </svg>
      </Box>

      <Box
        component="ul"
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 2.5, borderTop: `1px solid ${t.rule}` }}
      >
        {BODY_GROUPS.map((g, i) => {
          const r = stateOfGroup(g);
          const load = byGroup.get(g);
          return (
            <Box
              component="li"
              key={g}
              onClick={() => navigate(exercisesUrl(g))}
              onPointerEnter={() => setHover(BODY_PARTS_FIRST[g])}
              onPointerLeave={() => setHover(null)}
              sx={{
                py: 0.75,
                borderTop: i > 1 ? `1px solid ${t.rule}` : 0,
                cursor: 'pointer',
                '&:hover .name': { textDecoration: 'underline' },
              }}
            >
              <Stack direction="row" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    flexShrink: 0,
                    bgcolor: fill[r.state],
                    border: `1px solid ${alpha(t.ink, 0.5)}`,
                  }}
                />
                <Typography className="name" fontWeight={600} fontSize={14.5} flex={1} noWrap>
                  {MUSCLE_LABELS[g].replace(' (core)', '')}
                </Typography>
                <Num sx={{ fontSize: 12.5, color: 'text.secondary' }}>{load ? `${load.sets} set` : '—'}</Num>
              </Stack>
              <Typography variant="body2" color={r.state === 'fatigued' ? 'secondary.main' : 'text.secondary'} pl="18px" fontSize={13}>
                {r.state === 'none' ? RECOVERY_LABEL.none : `${RECOVERY_LABEL[r.state]} · ${ago(r.days)}`}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 20 }} noWrap>
        {readout}
      </Typography>
    </Box>
  );
}

// Hovering a group in the list highlights that group on the figure (any one of its muscles will do).
const BODY_PARTS_FIRST: Record<MuscleGroup, string> = {
  chest: 'pectorals',
  shoulders: 'deltoids',
  back: 'lats',
  arms: 'biceps',
  core: 'abs',
  legs: 'quads',
  cardio: '',
  full_body: '',
};
