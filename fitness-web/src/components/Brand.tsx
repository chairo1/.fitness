import { Box, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { display } from '../theme';

/** A weight plate seen face-on — the brand mark, shared with the landing page. */
export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="9.5" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="11" cy="11" r="3" fill="#e5432b" />
    </svg>
  );
}

/** Wordmark. `lang="en"` keeps the capital I dotless on an Azerbaijani page. */
export default function Brand({ label = 'Fitness Coach', to = '/', suffix }: { label?: string; to?: string; suffix?: string }) {
  return (
    <Stack
      component={RouterLink}
      to={to}
      direction="row"
      alignItems="center"
      gap={1.25}
      sx={{ color: 'text.primary', textDecoration: 'none', minWidth: 0 }}
    >
      <Mark />
      <Box
        component="span"
        lang="en"
        sx={{ ...display(112), fontWeight: 800, fontSize: 17, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
      >
        {label}
      </Box>
      {suffix && (
        <Box component="span" sx={{ fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {suffix}
        </Box>
      )}
    </Stack>
  );
}
