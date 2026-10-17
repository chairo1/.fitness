import { alpha, createTheme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark') {
  const dark = mode === 'dark';
  const primary = dark ? '#8EA2FF' : '#4F5BFF';
  const glass = dark ? 'rgba(24, 29, 54, 0.55)' : 'rgba(255, 255, 255, 0.58)';
  const glassStrong = dark ? 'rgba(24, 29, 54, 0.88)' : 'rgba(255, 255, 255, 0.9)';
  const border = dark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.75)';
  const shadow = dark ? '0 8px 32px rgba(0, 0, 0, 0.35)' : '0 8px 32px rgba(76, 88, 160, 0.12)';
  const blur = 'blur(20px) saturate(160%)';

  return createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: dark ? '#FF8AC5' : '#E5489B' },
      success: { main: dark ? '#4ADE9E' : '#16A06A' },
      warning: { main: '#F5A524' },
      error: { main: dark ? '#FF6B81' : '#E5384F' },
      background: { default: dark ? '#090D1C' : '#EEF1FB', paper: glass },
      text: dark
        ? { primary: '#ECEEFA', secondary: 'rgba(236, 238, 250, 0.62)' }
        : { primary: '#1A1D33', secondary: 'rgba(26, 29, 51, 0.6)' },
      divider: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,29,51,0.08)',
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { minHeight: '100vh' },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': { background: alpha(primary, 0.3), borderRadius: 8 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: blur,
            WebkitBackdropFilter: blur,
            border: `1px solid ${border}`,
            boxShadow: shadow,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: { root: { borderTop: 0, borderLeft: 0, borderRight: 0, boxShadow: 'none' } },
      },
      MuiDrawer: {
        styleOverrides: { paper: { borderTop: 0, borderBottom: 0, borderLeft: 0, boxShadow: 'none' } },
      },
      MuiDialog: { styleOverrides: { paper: { backgroundColor: glassStrong } } },
      MuiPopover: { styleOverrides: { paper: { backgroundColor: glassStrong } } },
      MuiAutocomplete: { styleOverrides: { paper: { backgroundColor: glassStrong } } },
      MuiMenu: { styleOverrides: { paper: { backgroundColor: glassStrong } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 12, paddingInline: 16 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primary}, ${dark ? '#B98CFF' : '#8A5CFF'})`,
            color: '#fff',
            '&.Mui-disabled': { color: '#fff', opacity: 0.45 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12, backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)' },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 8, height: 8 }, bar: { borderRadius: 8 } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
    },
  });
}
