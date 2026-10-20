import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, errorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import { DEFAULT_API_URL, useSettingsStore } from '@/store/settings';
import { useTheme } from '@/theme';
import { Button, Chip, ErrorBox, Glass, Input, Txt } from './ui';
import { ThemeSwitch } from './ThemeSwitch';

function ServerSettings() {
  const { apiUrl, setApiUrl } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(apiUrl ?? DEFAULT_API_URL);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  const t = useTheme();

  const check = async () => {
    setStatus('checking');
    const url = value.trim().replace(/\/+$/, '');
    try {
      await api.health(url);
      setApiUrl(url === DEFAULT_API_URL ? null : url);
      setStatus('ok');
    } catch {
      setStatus('fail');
    }
  };

  return (
    <View style={{ marginTop: 14 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
        <Ionicons name="server-outline" size={15} color={t.textSecondary} />
        <Txt variant="caption" color="secondary" numberOfLines={1}>
          Server: {apiUrl ?? DEFAULT_API_URL}
        </Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={t.textSecondary} />
      </Pressable>
      {open && (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Input
            label="API ünvanı"
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setStatus('idle');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.10:3000/api"
          />
          <Txt variant="caption" color="secondary">
            Emulator: http://10.0.2.2:3000/api · Telefon: kompüterin Wi-Fi IP ünvanı
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Button title="Yoxla və saxla" size="sm" variant="tonal" loading={status === 'checking'} onPress={check} />
            {status === 'ok' && <Chip small color="success" icon="checkmark" label="Qoşuldu" />}
            {status === 'fail' && <Chip small color="error" icon="close" label="Cavab yoxdur" />}
          </View>
        </View>
      )}
    </View>
  );
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const isLogin = mode === 'login';
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.email.trim() || !form.password || (!isLogin && !form.name.trim())) {
      setError('Bütün xanaları doldurun');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = isLogin
        ? await api.login(form.email.trim(), form.password)
        : await api.register(form.name.trim(), form.email.trim(), form.password);
      setAuth(res.accessToken, res.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
          <ThemeSwitch compact />
        </View>
        <View style={{ alignItems: 'center', marginBottom: 24, gap: 10 }}>
          <LinearGradient
            colors={[t.primary, t.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="barbell" size={34} color="#fff" />
          </LinearGradient>
          <Txt variant="h1">{isLogin ? 'Xoş gəlmisiniz' : 'Hesab yaradın'}</Txt>
          <Txt color="secondary" center>
            {isLogin ? 'Nəticələrinizi izləmək üçün daxil olun' : 'İdman nəticələrinizi izləməyə başlayın'}
          </Txt>
        </View>

        <Glass blur padding={20} radius={28} contentStyle={{ gap: 14 }}>
          {error && <ErrorBox text={error} />}
          {!isLogin && <Input label="Ad" value={form.name} onChangeText={set('name')} autoComplete="name" textContentType="name" />}
          <Input
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
          <Input
            label="Şifrə"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {!isLogin && (
            <Txt variant="caption" color="secondary" style={{ marginTop: -8 }}>
              Ən azı 6 simvol
            </Txt>
          )}
          <Button title={isLogin ? 'Daxil ol' : 'Qeydiyyatdan keç'} size="lg" loading={busy} onPress={submit} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Txt variant="body2" color="secondary">
              {isLogin ? 'Hesabınız yoxdur?' : 'Artıq hesabınız var?'}
            </Txt>
            <Pressable onPress={() => (isLogin ? router.push('/register') : router.back())} hitSlop={8}>
              <Txt variant="body2" color="primary" weight="700">
                {isLogin ? 'Qeydiyyat' : 'Daxil olun'}
              </Txt>
            </Pressable>
          </View>
        </Glass>
        {isLogin && <ServerSettings />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
