import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import HeightRounded from '@mui/icons-material/HeightRounded';
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded';
import ScaleRounded from '@mui/icons-material/ScaleRounded';
import {
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import { EmptyState, GlassCard, Loading, PageHeader, StatCard } from '../components/common';
import { useAuthStore } from '../store/auth';
import { notify } from '../store/ui';
import { fmtDate, fmtDateShort, fmtNum, today } from '../utils/format';
import { useAsync } from '../utils/useAsync';

const optNum = (v: string) => (v === '' ? null : Number(v));

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'Arıq';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Artıq çəki';
  return 'Piylənmə';
}

export default function BodyPage() {
  const theme = useTheme();
  const { user, setUser } = useAuthStore();
  const { data, loading, reload } = useAsync(api.metrics);
  const [form, setForm] = useState({ date: today(), weightKg: '', bodyFatPct: '' });
  const [profile, setProfile] = useState({ name: '', heightCm: '', goalWeightKg: '' });

  useEffect(() => {
    if (user)
      setProfile({
        name: user.name,
        heightCm: user.heightCm?.toString() ?? '',
        goalWeightKg: user.goalWeightKg?.toString() ?? '',
      });
  }, [user]);

  const metrics = data ?? [];
  const latest = metrics[metrics.length - 1];
  const first = metrics[0];
  const bmi = latest && user?.heightCm ? latest.weightKg / (user.heightCm / 100) ** 2 : null;
  const toGoal = latest && user?.goalWeightKg ? latest.weightKg - user.goalWeightKg : null;

  const addMetric = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.addMetric({
        date: form.date,
        weightKg: Number(form.weightKg),
        bodyFatPct: optNum(form.bodyFatPct),
        notes: null,
      });
      setForm({ ...form, weightKg: '', bodyFatPct: '' });
      notify('Ölçü əlavə olundu');
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setUser(
        await api.updateMe({
          name: profile.name.trim(),
          heightCm: optNum(profile.heightCm),
          goalWeightKg: optNum(profile.goalWeightKg),
        }),
      );
      notify('Profil yeniləndi');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const del = async (id: string) => {
    try {
      await api.deleteMetric(id);
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const weights = metrics.map((m) => m.weightKg);
  const goal = user?.goalWeightKg;

  return (
    <>
      <PageHeader title="Bədən ölçüləri" subtitle="Çəki, yağ faizi və hədəflərinizi izləyin" />

      <Grid container spacing={2.5}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<ScaleRounded />}
            label="Cari çəki"
            value={latest ? `${fmtNum(latest.weightKg, 1)} kg` : '—'}
            hint={
              latest && first && metrics.length > 1
                ? `${latest.weightKg - first.weightKg >= 0 ? '+' : ''}${fmtNum(latest.weightKg - first.weightKg, 1)} kg başlanğıcdan`
                : undefined
            }
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<FlagRounded />}
            label="Hədəfə qədər"
            value={toGoal != null ? `${fmtNum(Math.abs(toGoal), 1)} kg` : '—'}
            hint={toGoal != null ? (Math.abs(toGoal) < 0.1 ? 'Hədəfə çatdınız 🎉' : toGoal > 0 ? 'arıqlamaq' : 'kökəlmək') : 'Hədəf təyin edin'}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<MonitorHeartRounded />}
            label="BMI"
            value={bmi ? fmtNum(bmi, 1) : '—'}
            hint={bmi ? bmiLabel(bmi) : 'Boyunuzu daxil edin'}
            color="success.main"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<HeightRounded />}
            label="Yağ faizi"
            value={latest?.bodyFatPct != null ? `${fmtNum(latest.bodyFatPct, 1)}%` : '—'}
            color="warning.main"
          />
        </Grid>

        <Grid item xs={12} lg={8}>
          <GlassCard title="Çəki dinamikası">
            {loading && !data ? (
              <Loading />
            ) : metrics.length > 1 ? (
              <LineChart
                height={300}
                xAxis={[{ scaleType: 'point', data: metrics.map((m) => fmtDateShort(m.date)) }]}
                yAxis={[
                  {
                    min: Math.floor(Math.min(...weights, goal ?? Infinity) - 2),
                    max: Math.ceil(Math.max(...weights, goal ?? -Infinity) + 2),
                  },
                ]}
                series={[
                  {
                    data: weights,
                    label: 'Çəki (kg)',
                    color: theme.palette.primary.main,
                    area: true,
                    curve: 'monotoneX',
                  },
                  ...(goal
                    ? [{ data: weights.map(() => goal), label: 'Hədəf', color: theme.palette.secondary.main, showMark: false }]
                    : []),
                ]}
                margin={{ left: 48, right: 16, top: 48, bottom: 28 }}
                sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.12 } }}
              />
            ) : (
              <EmptyState text="Qrafik üçün ən azı 2 ölçü əlavə edin" />
            )}
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack gap={2.5} height="100%">
            <GlassCard title="Yeni ölçü">
              <Stack component="form" onSubmit={addMetric} gap={2}>
                <TextField
                  label="Tarix"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <Stack direction="row" gap={1.5}>
                  <TextField
                    label="Çəki"
                    type="number"
                    required
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                    inputProps={{ step: 0.1, min: 20 }}
                    size="small"
                  />
                  <TextField
                    label="Yağ"
                    type="number"
                    value={form.bodyFatPct}
                    onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    inputProps={{ step: 0.1 }}
                    size="small"
                  />
                </Stack>
                <Button type="submit" variant="outlined" startIcon={<AddRounded />} disabled={!form.weightKg}>
                  Əlavə et
                </Button>
              </Stack>
            </GlassCard>
            <GlassCard title="Profil və hədəf">
              <Stack component="form" onSubmit={saveProfile} gap={2}>
                <TextField
                  label="Ad"
                  size="small"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
                <Stack direction="row" gap={1.5}>
                  <TextField
                    label="Boy"
                    type="number"
                    size="small"
                    value={profile.heightCm}
                    onChange={(e) => setProfile({ ...profile, heightCm: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end">sm</InputAdornment> }}
                  />
                  <TextField
                    label="Hədəf çəki"
                    type="number"
                    size="small"
                    value={profile.goalWeightKg}
                    onChange={(e) => setProfile({ ...profile, goalWeightKg: e.target.value })}
                    InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                  />
                </Stack>
                <Button type="submit" variant="outlined">
                  Yadda saxla
                </Button>
              </Stack>
            </GlassCard>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <GlassCard title="Ölçü tarixçəsi">
            {metrics.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tarix</TableCell>
                    <TableCell align="right">Çəki</TableCell>
                    <TableCell align="right">Dəyişiklik</TableCell>
                    <TableCell align="right">Yağ %</TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...metrics].reverse().map((m, i, arr) => {
                    const prev = arr[i + 1];
                    const diff = prev ? m.weightKg - prev.weightKg : null;
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell>{fmtDate(m.date)}</TableCell>
                        <TableCell align="right">
                          <b>{fmtNum(m.weightKg, 1)} kg</b>
                        </TableCell>
                        <TableCell align="right">
                          {diff == null ? (
                            '—'
                          ) : (
                            <Typography
                              variant="body2"
                              color={diff > 0 ? 'warning.main' : diff < 0 ? 'success.main' : 'text.secondary'}
                            >
                              {diff > 0 ? '+' : ''}
                              {fmtNum(diff, 1)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{m.bodyFatPct != null ? `${fmtNum(m.bodyFatPct, 1)}%` : '—'}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => del(m.id)}>
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState text="Hələ ölçü əlavə olunmayıb" />
            )}
          </GlassCard>
        </Grid>
      </Grid>
    </>
  );
}
