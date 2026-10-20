import { MenuItem } from '@mui/material';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppProviders from './components/AppProviders';
import Layout, { type NavItem } from './components/Layout';
import { adminUrl } from './config';
import AuthPage from './pages/AuthPage';
import BodyPage from './pages/BodyPage';
import DashboardPage from './pages/DashboardPage';
import ExercisesPage from './pages/ExercisesPage';
import LandingPage from './pages/landing/LandingPage';
import ProgramEditorPage from './pages/ProgramEditorPage';
import ProgramsPage from './pages/ProgramsPage';
import WorkoutsPage from './pages/WorkoutsPage';
import { useAuthStore, useCan } from './store/auth';

const NAV: NavItem[] = [
  { to: '/', label: 'Bu gün', short: 'Bu gün' },
  { to: '/workouts', label: 'Jurnal', short: 'Jurnal' },
  { to: '/programs', label: 'Proqramlar', short: 'Proqram' },
  { to: '/exercises', label: 'Hərəkətlər', short: 'Hərəkət' },
  { to: '/body', label: 'Bədən', short: 'Bədən' },
];

/** Guests see the landing page at "/" and are sent to sign-in from any other app route. */
function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  const { pathname } = useLocation();
  if (token) return <Outlet />;
  return pathname === '/' ? <LandingPage /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/" replace /> : <Outlet />;
}

function AdminLink() {
  const can = useCan();
  if (!can('admin.access')) return null;
  return (
    <MenuItem component="a" href={adminUrl()}>
      Admin panel
    </MenuItem>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<Layout nav={NAV} menuExtra={<AdminLink />} />}>
            <Route index element={<DashboardPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/new" element={<ProgramEditorPage />} />
            <Route path="programs/:id" element={<ProgramsPage />} />
            <Route path="programs/:id/edit" element={<ProgramEditorPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="body" element={<BodyPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  );
}
