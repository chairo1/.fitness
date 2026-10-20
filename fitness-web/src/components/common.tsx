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

/**
 * Page heading in one row: what the page is, one sentence on what it's for, and its main action.
 * Kept short on purpose — every pixel here is taken from the content below.
 */
export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
      justifyContent="space-between"
      gap={{ xs: 1.5, sm: 3 }}
      pb={1.75}
      mb={2}
      sx={{ borderBottom: (t) => `1.5px solid ${t.tokens.ink}`, flexShrink: 0 }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'baseline' }} columnGap={2.5} rowGap={0.5} minWidth={0}>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '2rem', md: '2.25rem' }, whiteSpace: 'nowrap' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ fontSize: 15 }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
      {action && <Box flexShrink={0}>{action}</Box>}
    </Stack>
  );
}

/**
 * A page that fits the viewport on desktop ("zero scroll"): header on top, `children` fill the rest.
 * Long lists scroll inside their own panels. On phones it falls back to normal page scroll.
 */
export function Screen({
  title,
  purpose,
  action,
  children,
}: {
  title: ReactNode;
  /** One sentence: what this page is for. */
  purpose?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: { md: '100%' }, minHeight: 0 }}>
      <PageHeader title={title} subtitle={purpose} action={action} />
      <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
    </Box>
  );
}

/** A bordered sheet with an optional heading row, like the sheets on the landing page. */
export function Panel({
  title,
  meta,
  action,
  children,
  flush,
  scroll,
  sx,
  bodySx,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** No inner padding: for lists and tables that draw their own rules. */
  flush?: boolean;
  /** Body scrolls inside the panel instead of growing the page. */
  scroll?: boolean;
  sx?: SxProps<Theme>;
  bodySx?: SxProps<Theme>;
}) {
  const pad = { xs: 2, sm: 2.5 };
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        bgcolor: 'background.paper',
        border: (t) => `1px solid ${t.tokens.ruleStrong}`,
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
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
          py={1.25}
          sx={{ borderBottom: (t) => `1px solid ${t.tokens.rule}`, flexShrink: 0, minHeight: 52 }}
        >
          <Box minWidth={0}>
            {typeof title === 'string' ? (
              <Typography variant="h6" component="h2" noWrap>
                {title}
              </Typography>
            ) : (
              title
            )}
            {meta && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {meta}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          p: flush ? 0 : pad,
          ...(scroll && { overflowY: { md: 'auto' } }),
          ...bodySx,
        }}
      >
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
export function StatStrip({ items, dense }: { items: Stat[]; dense?: boolean }) {
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
        height: '100%',
      }}
    >
      {items.map((s, i) => (
        <Box
          key={s.label}
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: dense ? 1.5 : 2,
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
              fontSize: dense ? { xs: '1.75rem', sm: '2rem' } : { xs: '2rem', sm: '2.4rem' },
              lineHeight: 1,
              mt: 0.75,
              color: s.accent ? 'secondary.main' : 'text.primary',
            }}
            noWrap
          >
            {s.value}
            {s.unit && (
              <Box component="span" sx={{ fontFamily: FONT_MONO, fontSize: '0.85rem', fontWeight: 500, color: 'text.secondary', ml: 0.75 }}>
                {s.unit}
              </Box>
            )}
          </Typography>
          {s.hint && (
            <Typography variant="body2" color="text.secondary" mt={0.5} noWrap>
              {s.hint}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

/** Day status colours, TrainingPeaks-style: green done, red missed, today stands out, upcoming neutral. */
export function useStatusColor() {
  const t = useTheme().tokens;
  return (status: DayStatus) => ({ done: t.green, missed: t.redInk, today: t.red, upcoming: t.muted })[status];
}

/** Program-day status as a dot + word (today and done are filled, upcoming is hollow, missed is struck). */
export function StatusLabel({ status, sx }: { status: DayStatus; sx?: SxProps<Theme> }) {
  const color = useStatusColor()(status);
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
    <Box display="grid" sx={{ placeItems: 'center', py: 8, height: '100%' }}>
      <CircularProgress size={28} thickness={5} color="inherit" sx={{ color: 'text.secondary' }} />
    </Box>
  );
}

export function EmptyState({ text, action, title }: { text: string; action?: ReactNode; title?: string; icon?: ReactNode }) {
  return (
    <Stack alignItems="flex-start" gap={1.25} py={2.5}>
      {title && (
        <Typography variant="h6" component="p">
          {title}
        </Typography>
      )}
      <Typography color="text.secondary" maxWidth={420}>
        {text}
      </Typography>
      {action}
    </Stack>
  );
}

/** A row in a list that is also the selection in a master–detail screen. */
export function ListRow({
  selected,
  onClick,
  children,
  first,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  first?: boolean;
}) {
  const t = useTheme().tokens;
  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-current={selected || undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        px: { xs: 2, sm: 2.5 },
        py: 1.25,
        border: 0,
        borderTop: first ? 0 : `1px solid ${t.rule}`,
        borderLeft: `3px solid ${selected ? t.red : 'transparent'}`,
        bgcolor: selected ? 'action.selected' : 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: selected ? 'action.selected' : 'action.hover' } : undefined,
      }}
    >
      {children}
    </Box>
  );
}
