import { Alert, CssBaseline, Snackbar, ThemeProvider } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { api } from './api/client';
import GlassBackground from './components/GlassBackground';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import BodyPage from './pages/BodyPage';
import DashboardPage from './pages/DashboardPage';
import ExercisesPage from './pages/ExercisesPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import ProgramEditorPage from './pages/ProgramEditorPage';
import ProgramsPage from './pages/ProgramsPage';
import WorkoutsPage from './pages/WorkoutsPage';
import { useAuthStore } from './store/auth';
import { useToastStore, useUiStore } from './store/ui';
import { createAppTheme } from './theme';

function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/" replace /> : <Outlet />;
}

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
        <Alert severity={toast.severity} variant="filled" onClose={clear} sx={{ borderRadius: 3 }}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

export default function App() {
  const mode = useUiStore((s) => s.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  // Refresh the cached profile once per session; an expired token is cleared by the 401 interceptor.
  useEffect(() => {
    if (token) api.me().then(setUser).catch(() => undefined);
  }, [token, setUser]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlassBackground />
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/new" element={<ProgramEditorPage />} />
            <Route path="programs/:id" element={<ProgramDetailPage />} />
            <Route path="programs/:id/edit" element={<ProgramEditorPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="body" element={<BodyPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </ThemeProvider>
  );
}
