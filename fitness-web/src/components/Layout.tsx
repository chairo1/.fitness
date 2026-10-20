import AddRounded from '@mui/icons-material/AddRounded';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useComposer, useUiStore } from '../store/ui';
import { display } from '../theme';
import { Mark } from './Brand';
import WorkoutDialog from './WorkoutDialog';

export const BAR_H = 56;
const TABS_H = 60;

export interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  short?: string;
}

export function ThemeToggle({ onBar }: { onBar?: boolean }) {
  const { mode, toggleMode } = useUiStore();
  return (
    <Tooltip title={mode === 'dark' ? 'İşıqlı tema' : 'Qaranlıq tema'}>
      <IconButton
        onClick={toggleMode}
        aria-label="Temanı dəyiş"
        sx={onBar ? { color: 'rgba(242,239,232,0.7)', '&:hover': { color: '#f2efe8' } } : undefined}
      >
        {mode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

const isActive = (to: string, pathname: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

function UserMenu({ extra }: { extra?: ReactNode }) {
  const { user, logout } = useAuthStore();
  const { mode, toggleMode } = useUiStore();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Hesab"
        sx={{
          width: 34,
          height: 34,
          border: '1.5px solid rgba(242,239,232,0.5)',
          borderRadius: '4px',
          bgcolor: 'transparent',
          color: '#f2efe8',
          font: 'inherit',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          '&:hover': { borderColor: '#f2efe8' },
        }}
      >
        {initials}
      </Box>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 240, mt: 1 } } }}
      >
        <Box px={2} py={1.25}>
          <Typography fontWeight={600} noWrap>
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem component={NavLink} to="/body" onClick={() => setAnchor(null)}>
          Profil və hədəf
        </MenuItem>
        <MenuItem
          onClick={() => {
            toggleMode();
            setAnchor(null);
          }}
        >
          {mode === 'dark' ? 'İşıqlı tema' : 'Qaranlıq tema'}
        </MenuItem>
        {extra && <Box onClick={() => setAnchor(null)}>{extra}</Box>}
        <Divider />
        <MenuItem onClick={logout}>Çıxış</MenuItem>
      </Menu>
    </>
  );
}

export default function Layout({
  nav: items,
  brand,
  menuExtra,
  composer = true,
}: {
  nav: NavItem[];
  /** Small label after the wordmark, e.g. "Admin". */
  brand?: string;
  /** Extra items for the account menu (e.g. a link to the admin panel). */
  menuExtra?: ReactNode;
  /** The global "log a workout" button + dialog (off in the admin panel). */
  composer?: boolean;
}) {
  const theme = useTheme();
  const t = theme.tokens;
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const { pathname } = useLocation();
  const { isOpen, draft, openComposer, closeComposer, markSaved } = useComposer();

  // "N" anywhere outside a text field opens a new workout.
  useEffect(() => {
    if (!composer) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (useComposer.getState().isOpen) return;
      e.preventDefault();
      openComposer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composer, openComposer]);

  const paper = '#f2efe8';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          height: BAR_H,
          flexShrink: 0,
          bgcolor: t.bar,
          color: paper,
          borderBottom: '1px solid rgba(242,239,232,0.08)',
        }}
      >
        <Stack direction="row" alignItems="stretch" height="100%" px={{ xs: 2, md: 3 }} gap={{ xs: 1.5, md: 4 }}>
          <Stack component={NavLink} to="/" direction="row" alignItems="center" gap={1.25} sx={{ color: paper, textDecoration: 'none' }}>
            <Mark />
            <Box
              component="span"
              lang="en"
              sx={{ ...display(112), fontWeight: 800, fontSize: 16, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
            >
              Fitness Coach
            </Box>
            {brand && (
              <Box component="span" sx={{ fontSize: 13, color: 'rgba(242,239,232,0.55)' }}>
                {brand}
              </Box>
            )}
          </Stack>

          {desktop && (
            <Stack component="nav" aria-label="Bölmələr" direction="row" alignItems="stretch" gap={0.5}>
              {items.map((n) => {
                const active = isActive(n.to, pathname);
                return (
                  <Box
                    key={n.to}
                    component={NavLink}
                    to={n.to}
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 1.5,
                      fontSize: 15,
                      fontWeight: active ? 600 : 500,
                      color: active ? paper : 'rgba(242,239,232,0.62)',
                      textDecoration: 'none',
                      boxShadow: active ? `inset 0 -3px 0 ${t.red}` : 'none',
                      '&:hover': { color: paper },
                    }}
                  >
                    {n.label}
                  </Box>
                );
              })}
            </Stack>
          )}

          <Box flex={1} />
          <Stack direction="row" alignItems="center" gap={1.25}>
            {composer &&
              (desktop ? (
                <Tooltip title="Qısayol: N">
                  <Button variant="contained" startIcon={<AddRounded />} onClick={() => openComposer()} sx={{ minHeight: 36 }}>
                    Məşq yaz
                  </Button>
                </Tooltip>
              ) : (
                <IconButton
                  onClick={() => openComposer()}
                  aria-label="Məşq yaz"
                  sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark', color: '#fff' } }}
                >
                  <AddRounded />
                </IconButton>
              ))}
            {desktop && <ThemeToggle onBar />}
            <UserMenu extra={menuExtra} />
          </Stack>
        </Stack>
      </Box>

      <Box
        component="main"
        sx={{
          // Desktop: a fixed height, not flex-grow — a flex-grown box isn't a definite height for `height: 100%` below it.
          flex: { xs: 1, md: 'none' },
          minWidth: 0,
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 2.5 },
          pb: { xs: `${TABS_H + 24}px`, md: 2.5 },
          // Desktop: the page owns exactly the viewport below the bar; screens that need more scroll inside panels.
          height: { md: `calc(100vh - ${BAR_H}px)` },
          overflowY: { md: 'auto' },
        }}
      >
        <Outlet />
      </Box>

      {!desktop && (
        <Box
          component="nav"
          aria-label="Bölmələr"
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.appBar,
            height: TABS_H,
            display: 'grid',
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
            bgcolor: t.bar,
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          {items.map((n) => {
            const active = isActive(n.to, pathname);
            return (
              <Box
                key={n.to}
                component={NavLink}
                to={n.to}
                aria-current={active ? 'page' : undefined}
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? paper : 'rgba(242,239,232,0.6)',
                  textDecoration: 'none',
                  boxShadow: active ? `inset 0 3px 0 ${t.red}` : 'none',
                }}
              >
                {n.short ?? n.label}
              </Box>
            );
          })}
        </Box>
      )}

      {composer && (
        <WorkoutDialog open={isOpen} draft={draft} onClose={closeComposer} onSaved={markSaved} />
      )}
    </Box>
  );
}
