import { Alert, Box, Button, Link, Stack, TextField, Typography, useTheme } from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import Brand from '../components/Brand';
import { ThemeToggle } from '../components/Layout';
import { useAuthStore } from '../store/auth';
import { display, TOKENS } from '../theme';

const AFTER_SIGNUP = [
  ['Məşq jurnalı', 'Set, təkrar və çəkini yazın — həcm və 1RM özü hesablanır.'],
  ['Proqramlar', 'Həftəlik və ya aylıq plan; hər günün statusu təqvimdə.'],
  ['İrəliləyiş', '12 həftəlik qrafik, rekordlar, çəki və hədəf.'],
];

/** The dark column next to the form: what the account gives you. Always ink, in both themes. */
function Aside({ register }: { register: boolean }) {
  const t = TOKENS.light;
  // In dark mode the page is already ink, so the column steps up one tone and gets a rule.
  const dark = useTheme().palette.mode === 'dark';
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        bgcolor: dark ? TOKENS.dark.card : t.ink,
        borderLeft: dark ? `1px solid ${TOKENS.dark.rule}` : 0,
        color: t.paper,
        p: 6,
      }}
    >
      <Typography sx={{ fontSize: 14, color: 'rgba(242,239,232,0.55)' }}>
        {register ? 'Qeydiyyatdan sonra' : 'Fitness Coach'}
      </Typography>
      {register ? (
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, borderTop: '1.5px solid rgba(242,239,232,0.9)' }}>
          {AFTER_SIGNUP.map(([title, text], i) => (
            <Box
              component="li"
              key={title}
              sx={{ display: 'grid', gridTemplateColumns: '48px 1fr', py: 2.5, borderBottom: '1px solid rgba(242,239,232,0.16)' }}
            >
              <Box sx={{ ...display(75), fontWeight: 800, fontSize: 32, lineHeight: 1, color: t.red }}>{i + 1}</Box>
              <Box>
                <Box sx={{ ...display(90), fontWeight: 700, fontSize: 22 }}>{title}</Box>
                <Box sx={{ fontSize: 15, color: 'rgba(242,239,232,0.7)', mt: 0.5 }}>{text}</Box>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography
          sx={{ ...display(78), fontWeight: 800, fontSize: 'clamp(64px, 7vw, 104px)', lineHeight: 0.88, textTransform: 'uppercase' }}
        >
          Hər set
          <br />
          <Box component="span" sx={{ color: t.red }}>
            sayılır.
          </Box>
        </Typography>
      )}
      <Typography sx={{ fontSize: 14, color: 'rgba(242,239,232,0.55)' }}>
        {register ? 'Eyni hesab Android tətbiqində də işləyir.' : 'Qaldığınız yerdən davam edin.'}
      </Typography>
    </Box>
  );
}

/** `admin` turns this into the admin panel sign-in: login only, and only accounts with `admin.access` get in. */
export default function AuthPage({ mode, admin = false }: { mode: 'login' | 'register'; admin?: boolean }) {
  const isLogin = mode === 'login';
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = isLogin
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password);
      if (admin && !res.user.permissions.includes('admin.access')) {
        setError('Bu hesabın admin panelə giriş səlahiyyəti yoxdur');
        return;
      }
      setAuth(res.accessToken, res.user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const title = admin ? 'Admin panel' : isLogin ? 'Daxil olun' : 'Hesab yaradın';
  const lead = admin
    ? 'İdarəetmə üçün administrator hesabı ilə daxil olun.'
    : isLogin
      ? 'Email və şifrənizi yazın.'
      : 'Ad, email və şifrə — başqa heç nə soruşulmur.';

  return (
    <Box
      minHeight="100vh"
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: admin ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)' } }}
    >
      <Stack sx={{ px: { xs: 2, sm: 5, lg: 8 }, py: { xs: 2.5, sm: 4 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Brand suffix={admin ? 'Admin' : undefined} />
          <ThemeToggle />
        </Stack>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', py: { xs: 6, md: 4 } }}>
          <Box width="100%" maxWidth={400} mx={admin ? 'auto' : { xs: 0, md: 'auto' }}>
            <Typography variant="h1" sx={{ fontSize: { xs: 48, sm: 60 } }}>
              {title}
            </Typography>
            <Typography color="text.secondary" mt={1.5} mb={4}>
              {lead}
            </Typography>
            <Stack component="form" onSubmit={submit} gap={2.25}>
              {error && <Alert severity="error">{error}</Alert>}
              {!isLogin && (
                <TextField label="Ad" value={form.name} onChange={set('name')} required autoFocus autoComplete="name" />
              )}
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                autoFocus={isLogin}
                autoComplete="email"
              />
              <TextField
                label="Şifrə"
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                helperText={!isLogin ? 'Ən azı 6 simvol' : undefined}
              />
              <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ mt: 0.5 }}>
                {isLogin ? 'Daxil ol' : 'Qeydiyyatdan keç'}
              </Button>
            </Stack>
            {!admin && (
              <Typography variant="body2" color="text.secondary" mt={3}>
                {isLogin ? 'Hesabınız yoxdur? ' : 'Artıq hesabınız var? '}
                <Link component={RouterLink} to={isLogin ? '/register' : '/login'} color="text.primary" fontWeight={600}>
                  {isLogin ? 'Qeydiyyatdan keçin' : 'Daxil olun'}
                </Link>
              </Typography>
            )}
          </Box>
        </Box>

        {!admin && (
          <Link component={RouterLink} to="/" variant="body2" color="text.secondary" underline="hover">
            ← Ana səhifəyə qayıt
          </Link>
        )}
      </Stack>
      {!admin && <Aside register={!isLogin} />}
    </Box>
  );
}
