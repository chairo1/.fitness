import { Box, CircularProgress, Stack, Typography, useTheme, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import type { DayStatus } from '../api/types';
import { display, FONT_MONO } from '../theme';
import { STATUS_META } from '../utils/format';

/** Tabular figures for weights, sets and dates. */
export function Num({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box component="span" sx={{ fontFamily: FONT_MONO, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...sx }}>
      {children}
    </Box>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
      justifyContent="space-between"
      gap={2}
      pt={{ xs: 2, md: 5 }}
      pb={2.5}
      mb={3.5}
      sx={{ borderBottom: (t) => `1.5px solid ${t.tokens.ink}` }}
    >
      <Box minWidth={0}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '2.2rem', md: '3rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" mt={1}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

/** A bordered sheet with an optional heading row, like the sheets on the landing page. */
export function Panel({
  title,
  meta,
  action,
  children,
  flush,
  sx,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** No inner padding: for lists and tables that draw their own rules. */
  flush?: boolean;
  sx?: SxProps<Theme>;
}) {
  const pad = { xs: 2, sm: 2.75 };
  return (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.tokens.ruleStrong}`,
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...sx,
      }}
    >
      {(title || action) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
          px={pad}
          py={1.75}
          sx={{ borderBottom: (t) => `1px solid ${t.tokens.rule}` }}
        >
          <Box minWidth={0}>
            {typeof title === 'string' ? (
              <Typography variant="h6" component="h2">
                {title}
              </Typography>
            ) : (
              title
            )}
            {meta && (
              <Typography variant="body2" color="text.secondary" mt={0.25}>
                {meta}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box flex={1} p={flush ? 0 : pad}>
        {children}
      </Box>
    </Box>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  accent?: boolean;
}

/** One strip of figures divided by rules, instead of a row of icon cards. */
export function StatStrip({ items }: { items: Stat[] }) {
  const theme = useTheme();
  const rule = `1px solid ${theme.tokens.rule}`;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${items.length}, minmax(0, 1fr))` },
        bgcolor: 'background.paper',
        border: `1px solid ${theme.tokens.ruleStrong}`,
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {items.map((s, i) => (
        <Box
          key={s.label}
          sx={{
            px: { xs: 2, sm: 2.75 },
            py: 2.25,
            minWidth: 0,
            borderLeft: { xs: i % 2 ? rule : 0, md: i ? rule : 0 },
            borderTop: { xs: i > 1 ? rule : 0, md: 0 },
          }}
        >
          <Typography variant="body2" color="text.secondary" noWrap>
            {s.label}
          </Typography>
          <Typography
            sx={{
              ...display(80),
              fontWeight: 800,
              fontSize: { xs: '2rem', sm: '2.5rem' },
              lineHeight: 1,
              mt: 1,
              color: s.accent ? 'secondary.main' : 'text.primary',
            }}
            noWrap
          >
            {s.value}
            {s.unit && (
              <Box component="span" sx={{ fontFamily: FONT_MONO, fontSize: '0.9rem', fontWeight: 500, color: 'text.secondary', ml: 0.75 }}>
                {s.unit}
              </Box>
            )}
          </Typography>
          {s.hint && (
            <Typography variant="body2" color="text.secondary" mt={0.75} noWrap>
              {s.hint}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

/** Program-day status as a dot + word (today and done are filled, upcoming is hollow, missed is struck). */
export function StatusLabel({ status, sx }: { status: DayStatus; sx?: SxProps<Theme> }) {
  const theme = useTheme();
  const t = theme.tokens;
  const color = { done: t.green, missed: t.muted, today: t.redInk, upcoming: t.muted }[status];
  const filled = status === 'done' || status === 'today';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: '0.8rem',
        fontWeight: 500,
        color,
        textDecoration: status === 'missed' ? 'line-through' : 'none',
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      <Box
        component="span"
        sx={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${color}`, bgcolor: filled ? color : 'transparent', flexShrink: 0 }}
      />
      {STATUS_META[status].label}
    </Box>
  );
}

export function Loading() {
  return (
    <Box display="grid" sx={{ placeItems: 'center', py: 10 }}>
      <CircularProgress size={28} thickness={5} color="inherit" sx={{ color: 'text.secondary' }} />
    </Box>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <Stack alignItems="flex-start" gap={1.5} py={3}>
      <Typography color="text.secondary" maxWidth={420}>
        {text}
      </Typography>
      {action}
    </Stack>
  );
}
