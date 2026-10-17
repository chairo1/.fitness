import { Box, Card, CardContent, CircularProgress, Stack, Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      gap={2}
      mb={3}
    >
      <Box>
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography color="text.secondary" mt={0.5}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

export function GlassCard({
  title,
  action,
  children,
  sx,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps;
}) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        {(title || action) && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} gap={1}>
            {typeof title === 'string' ? <Typography variant="h6">{title}</Typography> : title}
            {action}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  color = 'primary.main',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  color?: string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              color,
              bgcolor: 'action.hover',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box minWidth={0}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            <Typography variant="h5" lineHeight={1.2}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function Loading() {
  return (
    <Box display="grid" sx={{ placeItems: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  );
}

export function EmptyState({ icon, text, action }: { icon?: ReactNode; text: string; action?: ReactNode }) {
  return (
    <Stack alignItems="center" gap={1.5} py={4} color="text.secondary" textAlign="center">
      {icon && <Box sx={{ fontSize: 40, opacity: 0.6, display: 'flex' }}>{icon}</Box>}
      <Typography color="text.secondary">{text}</Typography>
      {action}
    </Stack>
  );
}
