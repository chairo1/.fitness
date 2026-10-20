import { router } from 'expo-router';
import { View } from 'react-native';
import { api } from '@/api/client';
import type { Program } from '@/api/types';
import { Button, Chip, EmptyState, ErrorBox, Glass, IconBtn, Loading, ProgressBar, Screen, Txt } from '@/components/ui';
import { useTheme, type ColorKey } from '@/theme';
import { fmtDate, ordinal, today } from '@/utils/format';
import { activateProgram, deleteProgram } from '@/utils/programs';
import { useAsync } from '@/utils/useAsync';

function phase(p: Program): { label: string; color: ColorKey | null } {
  const t = today();
  if (t < p.startDate) return { label: 'Başlamayıb', color: null };
  if (t > p.endDate) return { label: 'Bitib', color: null };
  return { label: 'Davam edir', color: 'info' };
}

function ProgramCard({ p }: { p: Program }) {
  const t = useTheme();
  const ph = phase(p);
  return (
    <Glass
      padding={16}
      onPress={() => router.push(`/program/${p.id}`)}
      style={p.isActive && { borderColor: t.primary, borderWidth: 1.5 }}
    >
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <Chip small variant="outlined" color="primary" label={p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} />
        <Chip small variant="outlined" color={ph.color} label={ph.label} />
        {p.isActive && <Chip small variant="filled" color="primary" icon="checkmark-circle" label="Aktiv" />}
      </View>
      <Txt variant="h3">{p.name}</Txt>
      <Txt variant="body2" color="secondary" style={{ marginBottom: 10 }}>
        {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
      </Txt>
      {p.description ? (
        <Txt variant="body2" color="secondary" numberOfLines={2} style={{ marginBottom: 10 }}>
          {p.description}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Txt variant="body2" color="secondary">
          {p.stats.completed}/{p.stats.totalDays} gün
          {p.stats.missed > 0 && ` · ${p.stats.missed} buraxılıb`}
        </Txt>
        <Txt variant="body2" weight="700">
          {p.stats.progress}%
        </Txt>
      </View>
      <ProgressBar value={p.stats.progress} />
      {p.weekStats.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {p.weekStats.map((w) => (
            <View key={w.week} style={{ flex: 1, gap: 4 }}>
              <ProgressBar value={w.planned ? (w.completed / w.planned) * 100 : 0} color="success" height={5} />
              <Txt variant="caption" color="secondary">
                {ordinal(w.week)} həftə
              </Txt>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 }}>
        {!p.isActive && <Button title="Aktiv et" variant="tonal" size="sm" onPress={() => activateProgram(p)} />}
        <View style={{ flex: 1 }} />
        <IconBtn icon="create-outline" size={19} color={t.textSecondary} label="Redaktə" onPress={() => router.push({ pathname: '/program/edit', params: { id: p.id } })} />
        <IconBtn icon="trash-outline" size={19} color={t.textSecondary} label="Sil" onPress={() => deleteProgram(p)} />
      </View>
    </Glass>
  );
}

export default function ProgramsScreen() {
  const t = useTheme();
  const { data, loading, refreshing, error, refresh } = useAsync(api.programs);
  return (
    <Screen
      title="Proqramlar"
      subtitle="Həftəlik və aylıq məşq planları"
      tabs
      onRefresh={refresh}
      refreshing={refreshing}
      action={<IconBtn icon="add" glass color={t.primary} label="Yeni proqram" onPress={() => router.push('/program/edit')} />}
    >
      {error && <ErrorBox text={error} />}
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Glass>
          <EmptyState
            icon="calendar-outline"
            text="Hələ proqramınız yoxdur. İlk həftəlik və ya aylıq planınızı yaradın."
            action={<Button title="Proqram yarat" variant="outlined" size="sm" onPress={() => router.push('/program/edit')} />}
          />
        </Glass>
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((p) => (
            <ProgramCard key={p.id} p={p} />
          ))}
        </View>
      )}
    </Screen>
  );
}
