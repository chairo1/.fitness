import { alpha, createTheme } from '@mui/material/styles';

// Same paper / ink / red system as the landing page (pages/landing/landing.css).
export const FONT_DISPLAY = '"Archivo", "Arial Narrow", sans-serif';
export const FONT_TEXT = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';
export const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

/** Condensed display face used for headings and big figures. */
export const display = (stretch = 84) => ({ fontFamily: FONT_DISPLAY, fontStretch: `${stretch}%` });

export interface Tokens {
  paper: string;
  card: string;
  sunken: string;
  ink: string;
  muted: string;
  rule: string;
  ruleStrong: string;
  red: string;
  redInk: string;
  /** Solid red for filled buttons: dark enough for white text (≈6:1). */
  action: string;
  actionHover: string;
  /** App bar: ink in both themes. */
  bar: string;
  green: string;
}

export const TOKENS: Record<'light' | 'dark', Tokens> = {
  light: {
    paper: '#f2efe8',
    card: '#fbfaf6',
    sunken: '#e8e3d8',
    ink: '#17160f',
    muted: '#6c685e',
    rule: '#d5cfc1',
    ruleStrong: '#b9b2a2',
    red: '#e5432b',
    redInk: '#b3311c',
    action: '#d43a22',
    actionHover: '#b3311c',
    bar: '#17160f',
    green: '#2f6b46',
  },
  dark: {
    paper: '#14130f',
    card: '#1c1b16',
    sunken: '#26241e',
    ink: '#ece8de',
    muted: '#9d978a',
    rule: '#34322a',
    ruleStrong: '#4a473d',
    red: '#f0583c',
    redInk: '#ff8a73',
    action: '#d43a22',
    actionHover: '#e5432b',
    bar: '#0b0a07',
    green: '#6fbf8c',
  },
};

declare module '@mui/material/styles' {
  interface Theme {
    tokens: Tokens;
  }
  interface ThemeOptions {
    tokens?: Tokens;
  }
}

export function createAppTheme(mode: 'light' | 'dark') {
  const t = TOKENS[mode];
  const dark = mode === 'dark';

  return createTheme({
    tokens: t,
    palette: {
      mode,
      // Red drives action (buttons, progress, the current item); ink stays the structure.
      primary: { main: t.action, dark: t.actionHover, contrastText: '#fff' },
      secondary: { main: t.red, contrastText: '#fff' },
      success: { main: t.green },
      warning: { main: dark ? '#d9a441' : '#a8741a' },
      error: { main: t.redInk },
      info: { main: t.muted },
      background: { default: t.paper, paper: t.card },
      text: { primary: t.ink, secondary: t.muted, disabled: alpha(t.ink, 0.38) },
      divider: t.rule,
      action: {
        hover: alpha(t.ink, 0.045),
        selected: alpha(t.ink, 0.08),
        focus: alpha(t.ink, 0.12),
      },
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: FONT_TEXT,
      h1: { ...display(78), fontWeight: 800, lineHeight: 0.95 },
      h2: { ...display(80), fontWeight: 800, lineHeight: 0.98 },
      h3: { ...display(82), fontWeight: 800, lineHeight: 1 },
      h4: { ...display(80), fontWeight: 800, fontSize: '2.6rem', lineHeight: 1, letterSpacing: '-0.01em' },
      h5: { ...display(86), fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.1 },
      h6: { ...display(90), fontWeight: 700, fontSize: '1.22rem', lineHeight: 1.2 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, fontSize: '0.84rem', color: t.muted },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' },
      caption: { fontSize: '0.8rem' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { minHeight: '100vh', backgroundColor: t.paper, WebkitFontSmoothing: 'antialiased' },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': { background: t.ruleStrong, border: `3px solid ${t.paper}`, borderRadius: 8 },
          '::selection': { background: alpha(t.red, 0.25) },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: t.rule },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderColor: t.ruleStrong, borderRadius: 6 } },
      },
      MuiCardActionArea: {
        styleOverrides: { focusHighlight: { backgroundColor: t.ink } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: { root: { backgroundColor: t.paper, borderBottom: `1px solid ${t.rule}` } },
      },
      MuiDrawer: {
        styleOverrides: { paper: { backgroundColor: t.paper, borderRight: `1px solid ${t.rule}` } },
      },
      MuiDialog: {
        styleOverrides: { paper: { border: `1px solid ${t.ruleStrong}`, borderRadius: 6 } },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { ...display(88), fontWeight: 700, fontSize: '1.45rem' } },
      },
      MuiBackdrop: {
        styleOverrides: { root: { backgroundColor: alpha('#0c0b08', 0.55) } },
      },
      MuiPopover: {
        styleOverrides: { paper: { border: `1px solid ${t.ruleStrong}`, boxShadow: `0 10px 30px ${alpha('#000', dark ? 0.5 : 0.1)}` } },
      },
      MuiAutocomplete: {
        styleOverrides: { paper: { border: `1px solid ${t.ruleStrong}`, boxShadow: `0 10px 30px ${alpha('#000', dark ? 0.5 : 0.1)}` } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 4, paddingInline: 16, minHeight: 38 },
          sizeSmall: { minHeight: 32, paddingInline: 10, fontSize: '0.88rem' },
          sizeLarge: { minHeight: 48 },
          containedPrimary: {
            '&:hover': { backgroundColor: t.actionHover },
          },
          textPrimary: { color: t.ink },
          outlined: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
          outlinedPrimary: {
            borderColor: t.ink,
            color: t.ink,
            '&:hover': { backgroundColor: t.ink, color: t.paper, borderColor: t.ink },
          },
          text: { '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline', textUnderlineOffset: 4 } },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 4, color: t.muted, '&:hover': { color: t.ink } } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: t.card,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.ruleStrong },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.muted },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.ink, borderWidth: 1.5 },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { '&.Mui-focused': { color: t.ink } } },
      },
      MuiChip: {
        styleOverrides: {
          sizeSmall: { height: 22, fontSize: '0.78rem' },
          outlined: { borderColor: t.ruleStrong },
          root: { borderRadius: 3, fontWeight: 500, height: 26, '&.MuiChip-filled.MuiChip-colorDefault': { backgroundColor: t.sunken } },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 0, height: 4, backgroundColor: t.sunken },
          bar: { borderRadius: 0 },
        },
      },
      MuiListItemButton: {
        styleOverrides: { root: { borderRadius: 0 } },
      },
      MuiTabs: {
        styleOverrides: { indicator: { height: 3, backgroundColor: t.red } },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44, '&.Mui-selected': { color: t.ink } } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            textTransform: 'none',
            fontWeight: 600,
            borderColor: t.ruleStrong,
            '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: t.ink, color: t.paper },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.rule },
          head: { color: t.muted, fontWeight: 500, fontSize: '0.84rem' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 4, alignItems: 'center' },
          standardInfo: { backgroundColor: t.sunken, color: t.ink, '& .MuiAlert-icon': { color: t.ink } },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: t.ink, color: t.paper, borderRadius: 3, fontSize: '0.8rem' } },
      },
      MuiAvatar: {
        styleOverrides: { root: { borderRadius: 4, fontWeight: 600 } },
      },
      MuiMenuItem: {
        styleOverrides: { root: { '&.Mui-selected': { backgroundColor: t.sunken } } },
      },
    },
  });
}
