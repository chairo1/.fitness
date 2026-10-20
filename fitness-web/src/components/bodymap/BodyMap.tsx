import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import TouchAppRounded from '@mui/icons-material/TouchAppRounded';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MuscleGroup } from '../../api/types';
import { MUSCLE_LABELS } from '../../utils/format';
import { BODY_GROUPS, exercisesUrl, MUSCLE_PARTS, musclePart, type MusclePart } from '../../utils/muscles';
import {
  BACK_LINES,
  BACK_MUSCLES,
  BACK_SHORTS,
  BASE_SHAPES,
  FACE_LINES,
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

type View = 'front' | 'back';
type State = 'idle' | 'group' | 'hot';

const RED = '#e5432b';
const ORANGE = '#f07a5c';

const FIBER_ANGLES = [...new Set([...FRONT_MUSCLES, ...BACK_MUSCLES, ...GLUTES].map((m) => m.fiber))];

/** Gradients and fibre patterns shared by both figures. */
function Defs() {
  const radial = (id: string, stops: [number, string][]) => (
    <radialGradient id={id} cx="0.42" cy="0.36" r="0.78">
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </radialGradient>
  );
  return (
    <defs>
      {radial('bm-muscle', [[0, '#fafafa'], [0.55, '#e2e3e6'], [1, '#a7aab0']])}
      {radial('bm-group', [[0, '#ffd2c4'], [0.55, '#f5967b'], [1, '#c8573c']])}
      {radial('bm-hot', [[0, '#ff9f86'], [0.55, '#e8472e'], [1, '#9e2213']])}
      {radial('bm-shorts', [[0, '#4a4b50'], [0.6, '#2b2c30'], [1, '#141518']])}
      <linearGradient id="bm-skin" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#b9bbc0" />
        <stop offset="0.45" stopColor="#e4e5e8" />
        <stop offset="1" stopColor="#b3b6bb" />
      </linearGradient>
      <linearGradient id="bm-hair" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#4a4747" />
        <stop offset="1" stopColor="#262424" />
      </linearGradient>
      {FIBER_ANGLES.map((a) => (
        <pattern key={a} id={`bm-fib-${a}`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform={`rotate(${a})`}>
          <line x1="0" y1="1.7" x2="3.4" y2="1.7" stroke="#2a2c30" strokeWidth="0.7" />
        </pattern>
      ))}
      <filter id="bm-soft" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="0.35" />
      </filter>
    </defs>
  );
}

// Click events don't carry a reliable pointerType everywhere (older Safari), so remember it from pointerdown.
let lastPointerType = 'mouse';
const isTouch = () => lastPointerType !== 'mouse';

const FILL: Record<State, string> = { idle: 'url(#bm-muscle)', group: 'url(#bm-group)', hot: 'url(#bm-hot)' };
const STROKE: Record<State, string> = { idle: '#676a70', group: '#a8452c', hot: '#7d1a0e' };

interface FigureProps {
  view: View;
  stateOf: (part: string) => State;
  onEnter: (part: string) => void;
  onLeave: () => void;
  onPick: (part: string, touch: boolean) => void;
}

function MusclePath({ m, state, ...h }: { m: MuscleShape; state: State } & Omit<FigureProps, 'view' | 'stateOf'>) {
  return (
    <g
      onPointerEnter={(e) => e.pointerType === 'mouse' && h.onEnter(m.part)}
      onPointerLeave={h.onLeave}
      onPointerDown={(e) => (lastPointerType = e.pointerType)}
      onClick={() => h.onPick(m.part, isTouch())}
      style={{ cursor: 'pointer' }}
    >
      <path d={m.d} fill={FILL[state]} stroke={STROKE[state]} strokeWidth={1.1} strokeLinejoin="round" />
      <path d={m.d} fill={`url(#bm-fib-${m.fiber})`} opacity={state === 'idle' ? 0.16 : 0.22} pointerEvents="none" />
    </g>
  );
}

function Figure({ view, stateOf, ...h }: FigureProps) {
  const front = view === 'front';
  const muscles = front ? FRONT_MUSCLES : BACK_MUSCLES;
  return (
    <g>
      {/* Silhouette: a thick stroke pass under a fill pass leaves one clean outline around the union. */}
      {BASE_SHAPES.map((d, i) => (
        <path key={`o${i}`} d={d} fill="none" stroke="#45484d" strokeWidth={4.2} strokeLinejoin="round" />
      ))}
      {BASE_SHAPES.map((d, i) => (
        <path key={`f${i}`} d={d} fill="url(#bm-skin)" />
      ))}
      {front && FRONT_LINES.map((d, i) => <path key={i} d={d} fill="none" stroke="#7d8086" strokeWidth={1.1} />)}
      {!front && BACK_LINES.map((d, i) => <path key={i} d={d} fill="none" stroke="#5f6267" strokeWidth={1.4} />)}

      {muscles.map((m, i) => (
        <MusclePath key={i} m={m} state={stateOf(m.part)} {...h} />
      ))}

      <path d={front ? FRONT_SHORTS : BACK_SHORTS} fill="url(#bm-shorts)" stroke="#0d0e10" strokeWidth={1.4} />
      {!front &&
        GLUTES.map((m, i) => {
          const st = stateOf(m.part);
          return st === 'idle' ? (
            // At rest the glutes are just the shape of the shorts fabric.
            <g key={i} onPointerEnter={(e) => e.pointerType === 'mouse' && h.onEnter(m.part)} onPointerLeave={h.onLeave}
              onPointerDown={(e) => (lastPointerType = e.pointerType)} onClick={() => h.onPick(m.part, isTouch())} style={{ cursor: 'pointer' }}>
              <path d={m.d} fill="url(#bm-shorts)" stroke="#08090a" strokeWidth={1.2} />
            </g>
          ) : (
            <MusclePath key={i} m={m} state={st} {...h} />
          );
        })}

      <path d={front ? HAIR_FRONT : HAIR_BACK} fill="url(#bm-hair)" />
      {front && FACE_LINES.map((d, i) => <path key={i} d={d} fill={d.endsWith('Z') ? '#6d7076' : 'none'} stroke="#6d7076" strokeWidth={1.1} strokeLinecap="round" />)}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export default function BodyMap({ sets = {} }: { sets?: Partial<Record<MuscleGroup, number>> }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroup | null>(null);
  // Touch has no hover: the first tap selects, a second tap (or the button) opens the exercises.
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>('front');

  const part = musclePart(hovered ?? selected);
  const activeGroup = part?.group ?? hoveredGroup;
  const stateOf = (id: string): State =>
    id === part?.id ? 'hot' : activeGroup && musclePart(id)?.group === activeGroup ? 'group' : 'idle';

  const open = (p: MusclePart) => navigate(exercisesUrl(p.group, p.id));
  const onPick = (id: string, touch: boolean) => {
    const p = musclePart(id);
    if (!p) return;
    if (!touch || selected === id) open(p);
    else setSelected(id);
  };
  const handlers = {
    stateOf,
    onEnter: setHovered,
    onLeave: () => setHovered(null),
    onPick,
  };
  // Tapping empty space clears a touch selection.
  const onBackgroundDown = (e: ReactPointerEvent) => {
    if (e.target === e.currentTarget) setSelected(null);
  };

  const views: View[] = compact ? [view] : ['front', 'back'];

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={3}>
      <Box flex={1} minWidth={0}>
        <Paper
          elevation={0}
          sx={{ px: 2, py: 1, mb: 1.5, minHeight: 52, display: 'flex', alignItems: 'center', bgcolor: 'action.hover', boxShadow: 'none' }}
        >
          {part ? (
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" flex={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: RED }} />
              <Typography fontWeight={700}>{part.name}</Typography>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                {part.latin}
              </Typography>
              <Box flex={1} />
              <Chip size="small" label={MUSCLE_LABELS[part.group]} sx={{ bgcolor: ORANGE, color: '#fff', fontWeight: 600 }} />
              {selected && !hovered ? (
                <Button size="small" variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => open(part)}>
                  Hərəkətlərə bax
                </Button>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Klikləyin → hərəkətlər
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" gap={1} color="text.secondary">
              <TouchAppRounded fontSize="small" />
              <Typography variant="body2">
                Əzələnin üzərinə {compact ? 'toxunun' : 'klikləyin'} — uyğun hərəkətlər açılacaq.
              </Typography>
            </Stack>
          )}
        </Paper>

        {compact && (
          <Stack alignItems="center" mb={1}>
            <ButtonGroup size="small">
              <Button variant={view === 'front' ? 'contained' : 'outlined'} onClick={() => setView('front')}>
                Ön
              </Button>
              <Button variant={view === 'back' ? 'contained' : 'outlined'} onClick={() => setView('back')}>
                Arxa
              </Button>
            </ButtonGroup>
          </Stack>
        )}

        <Box
          onPointerDown={onBackgroundDown}
          sx={{
            borderRadius: '4px',
            py: 2,
            background: theme.tokens.sunken,
          }}
        >
          <Box
            component="svg"
            viewBox={`0 0 ${FIGURE_W * views.length} ${FIGURE_H}`}
            sx={{ display: 'block', width: '100%', maxHeight: compact ? 560 : 640, userSelect: 'none' }}
            role="img"
            aria-label="Əzələ xəritəsi"
          >
            <Defs />
            {views.map((v, i) => (
              <g key={v} transform={`translate(${i * FIGURE_W},0)`}>
                <Figure view={v} {...handlers} />
                {!compact && (
                  <text x={FIGURE_W / 2} y={FIGURE_H - 2} textAnchor="middle" fontSize={15} fontWeight={700} letterSpacing={2} fill={theme.palette.text.secondary}>
                    {v === 'front' ? 'ÖN' : 'ARXA'}
                  </text>
                )}
              </g>
            ))}
          </Box>
        </Box>
      </Box>

      <Box width={{ md: 280 }} flexShrink={0}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Əzələ qrupları · son 30 gün
        </Typography>
        <List disablePadding>
          {BODY_GROUPS.map((g) => {
            const parts = MUSCLE_PARTS.filter((p) => p.group === g);
            return (
              <ListItemButton
                key={g}
                selected={activeGroup === g}
                onMouseEnter={() => setHoveredGroup(g)}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => navigate(exercisesUrl(g))}
                sx={{ borderBottom: `1px solid ${theme.tokens.rule}`, py: 0.75 }}
              >
                <ListItemText
                  primary={MUSCLE_LABELS[g]}
                  secondary={parts.map((p) => p.name).join(', ')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ noWrap: true }}
                  sx={{ minWidth: 0 }}
                />
                <Chip size="small" label={`${sets[g] ?? 0} set`} sx={{ ml: 1 }} />
                <ChevronRightRounded color="action" />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Stack>
  );
}
