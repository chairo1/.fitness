import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import MenuRounded from '@mui/icons-material/MenuRounded';
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';

const DRAWER = 260;

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export function ThemeToggle() {
  const { mode, toggleMode } = useUiStore();
  return (
    <Tooltip title={mode === 'dark' ? 'İşıqlı rejim' : 'Qaranlıq rejim'}>
      <IconButton onClick={toggleMode}>{mode === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}</IconButton>
    </Tooltip>
  );
}

function Brand({ label }: { label: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.5} px={1}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
        }}
      >
        <FitnessCenterRounded fontSize="small" />
      </Box>
      <Typography variant="h6" fontWeight={800}>
        {label}
      </Typography>
    </Stack>
  );
}

export default function Layout({
  nav: items,
  brand,
  sidebarExtra,
}: {
  nav: NavItem[];
  brand: string;
  sidebarExtra?: ReactNode;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();

  const nav = (
    <Stack height="100%" p={2} gap={3}>
      <Box pt={1}>
        <Brand label={brand} />
      </Box>
      <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map((n) => {
          const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to);
          return (
            <ListItemButton
              key={n.to}
              component={NavLink}
              to={n.to}
              selected={active}
              onClick={() => setOpen(false)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box flex={1} />
      {sidebarExtra}
      <Stack direction="row" alignItems="center" gap={1.5} p={1.5} sx={{ borderRadius: 3, bgcolor: 'action.hover' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>{user?.name?.[0]?.toUpperCase()}</Avatar>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={600} noWrap>
            {user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email}
          </Typography>
        </Box>
        <Tooltip title="Çıxış">
          <IconButton size="small" onClick={logout}>
            <LogoutRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );

  return (
    <Box display="flex" minHeight="100vh">
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || open}
        onClose={() => setOpen(false)}
        sx={{ width: { md: DRAWER }, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER } }}
      >
        {nav}
      </Drawer>
      <Box flex={1} minWidth={0}>
        <AppBar position="sticky" sx={{ backdropFilter: 'blur(16px)' }}>
          <Toolbar sx={{ gap: 1 }}>
            {!desktop && (
              <>
                <IconButton edge="start" onClick={() => setOpen(true)}>
                  <MenuRounded />
                </IconButton>
                <Brand label={brand} />
              </>
            )}
            <Box flex={1} />
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ px: { xs: 2, sm: 3, lg: 4 }, pb: 6, pt: 1, maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
