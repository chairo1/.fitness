import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import BadgeRounded from '@mui/icons-material/BadgeRounded';
import BlockRounded from '@mui/icons-material/BlockRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import KeyRounded from '@mui/icons-material/KeyRounded';
import SpaceDashboardRounded from '@mui/icons-material/SpaceDashboardRounded';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AppProviders from '../components/AppProviders';
import Layout, { type NavItem } from '../components/Layout';
import { appUrl } from '../config';
import AuthPage from '../pages/AuthPage';
import { useAuthStore, useCan } from '../store/auth';
import AdminDashboardPage from './AdminDashboardPage';
import PermissionsPage from './PermissionsPage';
import RolesPage from './RolesPage';
import UsersPage from './UsersPage';

const NAV: (NavItem & { permission: string })[] = [
  { to: '/', label: 'İcmal', icon: <SpaceDashboardRounded />, permission: 'admin.access' },
  { to: '/users', label: 'İstifadəçilər', icon: <GroupRounded />, permission: 'users.read' },
  { to: '/roles', label: 'Rollar', icon: <BadgeRounded />, permission: 'roles.read' },
  { to: '/permissions', label: 'Səlahiyyətlər', icon: <KeyRounded />, permission: 'permissions.read' },
];

function NoAccess({ text }: { text: string }) {
  const logout = useAuthStore((s) => s.logout);
  return (
    <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" gap={2} textAlign="center">
            <BlockRounded color="error" sx={{ fontSize: 48 }} />
            <Typography variant="h5">Giriş qadağandır</Typography>
            <Typography color="text.secondary">{text}</Typography>
            <Stack direction="row" gap={1}>
              <Button href={appUrl()}>Tətbiqə qayıt</Button>
              <Button variant="contained" onClick={logout}>
                Başqa hesabla daxil ol
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function RequireAdmin() {
  const token = useAuthStore((s) => s.token);
  const can = useCan();
  if (!token) return <Navigate to="/login" replace />;
  if (!can('admin.access')) return <NoAccess text="Bu hesabın admin panelə giriş səlahiyyəti yoxdur." />;
  return <Outlet />;
}

/** Renders the page only when the user holds `permission`. */
function Guard({ permission, children }: { permission: string; children: JSX.Element }) {
  return useCan()(permission) ? children : <NoAccess text="Bu bölməyə baxmaq üçün səlahiyyətiniz yoxdur." />;
}

function AdminLayout() {
  const can = useCan();
  return (
    <Layout
      nav={NAV.filter((n) => can(n.permission))}
      brand="Admin panel"
      sidebarExtra={
        <Button variant="outlined" startIcon={<ArrowBackRounded />} href={appUrl()} fullWidth>
          Tətbiqə qayıt
        </Button>
      }
    />
  );
}

export default function AdminApp() {
  const token = useAuthStore((s) => s.token);
  return (
    <AppProviders>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <AuthPage mode="login" admin />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<Guard permission="users.read"><UsersPage /></Guard>} />
            <Route path="roles" element={<Guard permission="roles.read"><RolesPage /></Guard>} />
            <Route path="permissions" element={<Guard permission="permissions.read"><PermissionsPage /></Guard>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  );
}
