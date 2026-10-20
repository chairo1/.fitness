import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import MenuRounded from '@mui/icons-material/MenuRounded';
import { AppBar, Box, Button, Drawer, IconButton, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';
import Brand from './Brand';

const DRAWER = 248;

export interface NavItem {
  to: string;
  label: string;
}

export function ThemeToggle() {
  const { mode, toggleMode } = useUiStore();
  return (
    <Tooltip title={mode === 'dark' ? 'İşıqlı tema' : 'Qaranlıq tema'}>
      <IconButton onClick={toggleMode} aria-label="Temanı dəyiş">
        {mode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

export default function Layout({
  nav: items,
  brand,
  sidebarExtra,
}: {
  nav: NavItem[];
  /** Small label after the wordmark, e.g. "Admin". */
  brand?: string;
  sidebarExtra?: ReactNode;
}) {
  const theme = useTheme();
  const t = theme.tokens;
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { mode, toggleMode } = useUiStore();
  const { pathname } = useLocation();

  const nav = (
    <Stack height="100%" pt={3} pb={2.5}>
      <Box px={3} pb={4}>
        <Brand suffix={brand} />
      </Box>
      <Box component="nav" aria-label="Bölmələr">
        {items.map((n) => {
          const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to);
          return (
            <Box
              key={n.to}
              component={NavLink}
              to={n.to}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              sx={{
                display: 'block',
                py: 1.15,
                pl: 2.75,
                pr: 2,
                borderLeft: `3px solid ${active ? t.ink : 'transparent'}`,
                color: active ? 'text.primary' : 'text.secondary',
                fontWeight: active ? 600 : 500,
                fontSize: 15.5,
                textDecoration: 'none',
                '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
              }}
            >
              {n.label}
            </Box>
          );
        })}
      </Box>
      <Box flex={1} />
      {sidebarExtra && <Box px={3} pb={2.5}>{sidebarExtra}</Box>}
      <Box mx={3} pt={2} sx={{ borderTop: `1px solid ${t.rule}` }}>
        <Typography fontWeight={600} noWrap>
          {user?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {user?.email}
        </Typography>
        <Stack direction="row" gap={2} mt={1.25}>
          <Button size="small" onClick={toggleMode} sx={{ px: 0, minWidth: 0, color: 'text.secondary' }}>
            {mode === 'dark' ? 'İşıqlı tema' : 'Qaranlıq tema'}
          </Button>
          <Button size="small" onClick={logout} sx={{ px: 0, minWidth: 0, color: 'text.secondary' }}>
            Çıxış
          </Button>
        </Stack>
      </Box>
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
        {!desktop && (
          <AppBar position="sticky">
            <Toolbar sx={{ gap: 1, minHeight: { xs: 58 } }}>
              <Brand suffix={brand} />
              <Box flex={1} />
              <IconButton edge="end" onClick={() => setOpen(true)} aria-label="Menyu">
                <MenuRounded />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}
        <Box component="main" sx={{ px: { xs: 2, sm: 3, lg: 5 }, pb: 8, maxWidth: 1320, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
