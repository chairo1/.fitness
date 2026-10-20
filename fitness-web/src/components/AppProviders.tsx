import { Alert, CssBaseline, Snackbar, ThemeProvider } from '@mui/material';
import { useEffect, useMemo, type ReactNode } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { useToastStore, useUiStore } from '../store/ui';
import { createAppTheme } from '../theme';

function Toasts() {
  const { toast, clear } = useToastStore();
  return (
    <Snackbar
      key={toast?.id}
      open={!!toast}
      autoHideDuration={3500}
      onClose={clear}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {toast ? (
        <Alert severity={toast.severity} variant="filled" onClose={clear}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

/** Theme, toasts and profile refresh shared by the user app and the admin panel. */
export default function AppProviders({ children }: { children: ReactNode }) {
  const mode = useUiStore((s) => s.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  // Refresh the cached profile (incl. roles/permissions) once per session; an expired token is cleared by the 401 interceptor.
  useEffect(() => {
    if (token) api.me().then(setUser).catch(() => undefined);
  }, [token, setUser]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
      <Toasts />
    </ThemeProvider>
  );
}
