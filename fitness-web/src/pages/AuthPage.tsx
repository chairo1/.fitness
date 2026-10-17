import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded';
import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { ThemeToggle } from '../components/Layout';
import { useAuthStore } from '../store/auth';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
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
      setAuth(res.accessToken, res.user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center', p: 2 }}>
      <Box position="fixed" top={16} right={16}>
        <ThemeToggle />
      </Box>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" gap={1} mb={3}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
              }}
            >
              <FitnessCenterRounded />
            </Box>
            <Typography variant="h5">{isLogin ? 'Xoş gəlmisiniz' : 'Hesab yaradın'}</Typography>
            <Typography color="text.secondary" textAlign="center">
              {isLogin ? 'Nəticələrinizi izləmək üçün daxil olun' : 'İdman nəticələrinizi izləməyə başlayın'}
            </Typography>
          </Stack>
          <Stack component="form" onSubmit={submit} gap={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {!isLogin && <TextField label="Ad" value={form.name} onChange={set('name')} required autoFocus />}
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
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {isLogin ? 'Daxil ol' : 'Qeydiyyatdan keç'}
            </Button>
            <Typography textAlign="center" variant="body2" color="text.secondary">
              {isLogin ? 'Hesabınız yoxdur? ' : 'Artıq hesabınız var? '}
              <Link component={RouterLink} to={isLogin ? '/register' : '/login'} fontWeight={600}>
                {isLogin ? 'Qeydiyyat' : 'Daxil olun'}
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
