import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { Box, Button, IconButton, InputAdornment, Stack, TextField, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import { EmptyState, ListRow, Loading, Num, Panel, Screen, StatStrip } from '../components/common';
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
    <Screen title="Bədən" purpose="Çəki, yağ faizi və hədəf. Ölçünü sağda yazın — qrafik solda yenilənir.">
      <Box
        sx={{
          height: { md: '100%' },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 8fr) minmax(300px, 4fr)' },
          gap: 2,
        }}
      >
        <Stack gap={2} minHeight={0}>
          <Box flexShrink={0}>
            <StatStrip
              dense
              items={[
                {
                  label: 'Cari çəki',
                  value: latest ? fmtNum(latest.weightKg, 1) : '—',
                  unit: latest ? 'kg' : undefined,
                  hint:
                    latest && first && metrics.length > 1
                      ? `${latest.weightKg - first.weightKg > 0 ? '+' : ''}${fmtNum(latest.weightKg - first.weightKg, 1)} kg başlanğıcdan`
                      : latest
                        ? fmtDate(latest.date)
                        : 'ilk ölçünü yazın',
                },
                {
                  label: 'Hədəfə qədər',
                  value: toGoal != null ? fmtNum(Math.abs(toGoal), 1) : '—',
                  unit: toGoal != null ? 'kg' : undefined,
                  hint: toGoal != null ? (Math.abs(toGoal) < 0.1 ? 'hədəfə çatmısınız' : toGoal > 0 ? 'arıqlamaq' : 'kökəlmək') : 'hədəf təyin edin',
                  accent: toGoal != null,
                },
                { label: 'BMI', value: bmi ? fmtNum(bmi, 1) : '—', hint: bmi ? bmiLabel(bmi) : 'boyunuzu yazın' },
                {
                  label: 'Yağ faizi',
                  value: latest?.bodyFatPct != null ? fmtNum(latest.bodyFatPct, 1) : '—',
                  unit: latest?.bodyFatPct != null ? '%' : undefined,
                  hint: latest?.bodyFatPct != null ? fmtDate(latest.date) : 'istəyə bağlı',
                },
              ]}
            />
          </Box>
          <Panel title="Çəki" meta={goal ? `Qırıq qırmızı xətt — hədəf, ${fmtNum(goal, 1)} kg` : 'Hədəf çəkini sağda yazsanız, qrafikdə görünəcək'} sx={{ flex: 1, minHeight: { xs: 340, md: 0 } }} flush>
            {loading && !data ? (
              <Loading />
            ) : metrics.length > 1 ? (
              <Box sx={{ position: 'relative', height: '100%', minHeight: 260 }}>
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <LineChart
                    xAxis={[{ scaleType: 'point', data: metrics.map((m) => fmtDateShort(m.date)) }]}
                    yAxis={[
                      {
                        min: Math.floor(Math.min(...weights, goal ?? Infinity) - 2),
                        max: Math.ceil(Math.max(...weights, goal ?? -Infinity) + 2),
                      },
                    ]}
                    series={[
                      { data: weights, label: 'Çəki (kg)', color: theme.tokens.ink, curve: 'linear' },
                      ...(goal ? [{ data: weights.map(() => goal), label: 'Hədəf', color: theme.tokens.red, showMark: false, id: 'goal' }] : []),
                    ]}
                    margin={{ left: 48, right: 20, top: 20, bottom: 28 }}
                    slotProps={{ legend: { hidden: true } }}
                    grid={{ horizontal: true }}
                    sx={{
                      '& .MuiChartsGrid-line': { stroke: theme.tokens.rule, strokeDasharray: '2 4' },
                      '& .MuiLineElement-series-goal': { strokeDasharray: '6 4' },
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <Box px={2.5}>
                <EmptyState text="Qrafik üçün ən azı iki ölçü lazımdır. Sağdakı formadan çəkinizi yazın." />
              </Box>
            )}
          </Panel>
        </Stack>

        <Stack gap={2} minHeight={0}>
          <Panel title="Yeni ölçü" sx={{ flexShrink: 0, height: 'auto' }}>
            <Stack component="form" onSubmit={addMetric} gap={1.5}>
              <Stack direction="row" gap={1}>
                <TextField
                  label="Tarix"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ flex: 1.3 }}
                />
                <TextField
                  label="Çəki"
                  type="number"
                  required
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                  inputProps={{ step: 0.1, min: 20 }}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Yağ"
                  type="number"
                  value={form.bodyFatPct}
                  onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  inputProps={{ step: 0.1 }}
                  size="small"
                  sx={{ flex: 0.9 }}
                />
              </Stack>
              <Button type="submit" variant="contained" startIcon={<AddRounded />} disabled={!form.weightKg}>
                Ölçünü yaz
              </Button>
            </Stack>
          </Panel>

          <Panel title="Profil və hədəf" sx={{ flexShrink: 0, height: 'auto' }}>
            <Stack component="form" onSubmit={saveProfile} gap={1.5}>
              <TextField label="Ad" size="small" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              <Stack direction="row" gap={1}>
                <TextField
                  label="Boy"
                  type="number"
                  size="small"
                  value={profile.heightCm}
                  onChange={(e) => setProfile({ ...profile, heightCm: e.target.value })}
                  InputProps={{ endAdornment: <InputAdornment position="end">sm</InputAdornment> }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Hədəf çəki"
                  type="number"
                  size="small"
                  value={profile.goalWeightKg}
                  onChange={(e) => setProfile({ ...profile, goalWeightKg: e.target.value })}
                  InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                  sx={{ flex: 1 }}
                />
                <Button type="submit" variant="outlined">
                  Saxla
                </Button>
              </Stack>
            </Stack>
          </Panel>

          <Panel title="Tarixçə" flush scroll sx={{ flex: 1, minHeight: { xs: 'auto', md: 0 } }}>
            {metrics.length ? (
              [...metrics].reverse().map((m, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? m.weightKg - prev.weightKg : null;
                return (
                  <ListRow key={m.id} first={i === 0}>
                    <Num sx={{ fontSize: 13, color: 'text.secondary', width: 92 }}>{fmtDate(m.date)}</Num>
                    <Num sx={{ fontWeight: 600, flex: 1 }}>{fmtNum(m.weightKg, 1)} kg</Num>
                    <Num sx={{ fontSize: 13, width: 44, textAlign: 'right', color: diff == null || diff === 0 ? 'text.secondary' : diff < 0 ? 'success.main' : 'secondary.main' }}>
                      {diff == null ? '—' : `${diff > 0 ? '+' : ''}${fmtNum(diff, 1)}`}
                    </Num>
                    <Num sx={{ fontSize: 13, width: 48, textAlign: 'right', color: 'text.secondary' }}>
                      {m.bodyFatPct != null ? `${fmtNum(m.bodyFatPct, 1)}%` : ''}
                    </Num>
                    <IconButton size="small" onClick={() => del(m.id)} aria-label="Ölçünü sil">
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </ListRow>
                );
              })
            ) : (
              <Box px={2.5}>
                <EmptyState text="Hələ ölçü yoxdur." />
              </Box>
            )}
          </Panel>
        </Stack>
      </Box>
    </Screen>
  );
}
