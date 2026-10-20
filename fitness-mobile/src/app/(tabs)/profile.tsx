import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { api, errorMessage } from '@/api/client';
import type { User } from '@/api/types';
import { LineChart } from '@/components/charts';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Button, Card, DateField, Divider, EmptyState, Grid2, IconBtn, Input, Loading, Screen, StatCard, Txt } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { bumpData } from '@/store/data';
import { DEFAULT_API_URL, useSettingsStore } from '@/store/settings';
import { notify } from '@/store/toast';
import { useTheme } from '@/theme';
import { cleanDecimal, fmtDate, fmtDateShort, fmtNum, parseNum, today } from '@/utils/format';
import { useAsync } from '@/utils/useAsync';

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'Arıq';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Artıq çəki';
  return 'Piylənmə';
}

/** Keyed by user id by the parent, so it starts from the loaded profile. */
function ProfileForm({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [profile, setProfile] = useState({
    name: user.name,
    heightCm: user.heightCm?.toString() ?? '',
    goalWeightKg: user.goalWeightKg?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setUser(
        await api.updateMe({
          name: profile.name.trim(),
          heightCm: parseNum(profile.heightCm),
          goalWeightKg: parseNum(profile.goalWeightKg),
        }),
      );
      notify('Profil yeniləndi');
      bumpData();
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Profil və hədəf">
      <View style={{ gap: 12 }}>
        <Input label="Ad" value={profile.name} onChangeText={(name) => setProfile({ ...profile, name })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Input
            label="Boy"
            suffix="sm"
            keyboardType="decimal-pad"
            value={profile.heightCm}
            onChangeText={(v) => setProfile({ ...profile, heightCm: cleanDecimal(v) })}
            containerStyle={{ flex: 1 }}
          />
          <Input
            label="Hədəf çəki"
            suffix="kg"
            keyboardType="decimal-pad"
            value={profile.goalWeightKg}
            onChangeText={(v) => setProfile({ ...profile, goalWeightKg: cleanDecimal(v) })}
            containerStyle={{ flex: 1 }}
          />
        </View>
        <Button title="Yadda saxla" variant="outlined" loading={saving} onPress={save} />
      </View>
    </Card>
  );
}

export default function ProfileScreen() {
  const t = useTheme();
  const { user, logout } = useAuthStore();
  const apiUrl = useSettingsStore((s) => s.apiUrl) ?? DEFAULT_API_URL;
  const { data, loading, refreshing, refresh } = useAsync(api.metrics);
  const [form, setForm] = useState({ date: today(), weightKg: '', bodyFatPct: '' });

  const metrics = data ?? [];
  const latest = metrics[metrics.length - 1];
  const first = metrics[0];
  const bmi = latest && user?.heightCm ? latest.weightKg / (user.heightCm / 100) ** 2 : null;
  const toGoal = latest && user?.goalWeightKg ? latest.weightKg - user.goalWeightKg : null;
  const weights = metrics.map((m) => m.weightKg);
  const goal = user?.goalWeightKg;

  const addMetric = async () => {
    const weightKg = parseNum(form.weightKg);
    if (!weightKg) return;
    try {
      await api.addMetric({ date: form.date, weightKg, bodyFatPct: parseNum(form.bodyFatPct), notes: null });
      setForm({ ...form, weightKg: '', bodyFatPct: '' });
      notify('Ölçü əlavə olundu');
      bumpData();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const del = async (id: string) => {
    try {
      await api.deleteMetric(id);
      bumpData();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const signOut = () =>
    Alert.alert('Çıxış', 'Hesabdan çıxmaq istəyirsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Çıxış', style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen title="Profil" subtitle="Bədən ölçüləri, hədəflər və ayarlar" tabs keyboard onRefresh={refresh} refreshing={refreshing}>
      <View style={{ gap: 14 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <LinearGradient
              colors={[t.primary, t.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}
            >
              <Txt variant="h2" color="#fff">
                {(user?.name ?? '?').trim().charAt(0).toUpperCase()}
              </Txt>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Txt variant="h3" numberOfLines={1}>
                {user?.name ?? '—'}
              </Txt>
              <Txt variant="body2" color="secondary" numberOfLines={1}>
                {user?.email}
              </Txt>
            </View>
            <IconBtn icon="log-out-outline" glass color={t.error} label="Çıxış" onPress={signOut} />
          </View>
        </Card>

        <Grid2>
          {[
            <StatCard
              key="w"
              icon="scale"
              label="Cari çəki"
              value={latest ? `${fmtNum(latest.weightKg, 1)} kg` : '—'}
              hint={
                latest && first && metrics.length > 1
                  ? `${latest.weightKg - first.weightKg >= 0 ? '+' : ''}${fmtNum(latest.weightKg - first.weightKg, 1)} kg başlanğıcdan`
                  : undefined
              }
            />,
            <StatCard
              key="g"
              icon="flag"
              label="Hədəfə qədər"
              value={toGoal != null ? `${fmtNum(Math.abs(toGoal), 1)} kg` : '—'}
              hint={toGoal != null ? (Math.abs(toGoal) < 0.1 ? 'Hədəfə çatdınız 🎉' : toGoal > 0 ? 'arıqlamaq' : 'kökəlmək') : 'Hədəf təyin edin'}
              color="secondary"
            />,
            <StatCard key="b" icon="pulse" label="BMI" value={bmi ? fmtNum(bmi, 1) : '—'} hint={bmi ? bmiLabel(bmi) : 'Boyunuzu daxil edin'} color="success" />,
            <StatCard
              key="f"
              icon="water"
              label="Yağ faizi"
              value={latest?.bodyFatPct != null ? `${fmtNum(latest.bodyFatPct, 1)}%` : '—'}
              color="warning"
            />,
          ]}
        </Grid2>

        <Card title="Çəki dinamikası">
          {loading && !data ? (
            <Loading />
          ) : metrics.length > 1 ? (
            <LineChart
              labels={metrics.map((m) => fmtDateShort(m.date))}
              height={220}
              format={(v) => fmtNum(v, 1)}
              min={Math.floor(Math.min(...weights, goal ?? Infinity) - 2)}
              series={[
                { data: weights, color: t.primary, area: true, label: 'Çəki' },
                ...(goal ? [{ data: weights.map(() => goal), color: t.secondary, label: 'Hədəf', dashed: true, dots: false }] : []),
              ]}
            />
          ) : (
            <EmptyState icon="analytics-outline" text="Qrafik üçün ən azı 2 ölçü əlavə edin" />
          )}
        </Card>

        <Card title="Yeni ölçü">
          <View style={{ gap: 12 }}>
            <DateField label="Tarix" value={form.date} onChange={(date) => setForm({ ...form, date })} maximumDate={new Date()} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input
                label="Çəki"
                suffix="kg"
                keyboardType="decimal-pad"
                value={form.weightKg}
                onChangeText={(v) => setForm({ ...form, weightKg: cleanDecimal(v) })}
                containerStyle={{ flex: 1 }}
              />
              <Input
                label="Yağ"
                suffix="%"
                keyboardType="decimal-pad"
                value={form.bodyFatPct}
                onChangeText={(v) => setForm({ ...form, bodyFatPct: cleanDecimal(v) })}
                containerStyle={{ flex: 1 }}
              />
            </View>
            <Button title="Əlavə et" icon="add" variant="tonal" disabled={!parseNum(form.weightKg)} onPress={addMetric} />
          </View>
        </Card>

        <Card title="Ölçü tarixçəsi">
          {metrics.length ? (
            [...metrics].reverse().map((m, i, arr) => {
              const prev = arr[i + 1];
              const diff = prev ? m.weightKg - prev.weightKg : null;
              return (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <Txt variant="body2" style={{ flex: 1 }}>
                      {fmtDate(m.date)}
                    </Txt>
                    <Txt weight="700" style={{ width: 70, textAlign: 'right' }}>
                      {fmtNum(m.weightKg, 1)} kg
                    </Txt>
                    <Txt
                      variant="body2"
                      color={diff == null ? 'disabled' : diff > 0 ? 'warning' : diff < 0 ? 'success' : 'secondary'}
                      style={{ width: 48, textAlign: 'right' }}
                    >
                      {diff == null ? '—' : `${diff > 0 ? '+' : ''}${fmtNum(diff, 1)}`}
                    </Txt>
                    <Txt variant="body2" color="secondary" style={{ width: 46, textAlign: 'right' }}>
                      {m.bodyFatPct != null ? `${fmtNum(m.bodyFatPct, 1)}%` : '—'}
                    </Txt>
                    <IconBtn icon="trash-outline" size={16} color={t.textSecondary} label="Sil" onPress={() => del(m.id)} />
                  </View>
                </View>
              );
            })
          ) : (
            <EmptyState text="Hələ ölçü əlavə olunmayıb" />
          )}
        </Card>

        {user && <ProfileForm key={user.id} user={user} />}

        <Card title="Görünüş">
          <ThemeSwitch />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <Ionicons name="server-outline" size={14} color={t.textSecondary} />
            <Txt variant="caption" color="secondary" numberOfLines={1} style={{ flex: 1 }}>
              {apiUrl}
            </Txt>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
