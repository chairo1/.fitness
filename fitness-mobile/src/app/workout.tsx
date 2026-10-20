import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api/client';
import { ExerciseField } from '@/components/ExercisePicker';
import { Button, Card, DateField, ErrorBox, Glass, IconBtn, InfoBox, Input, Screen, Txt } from '@/components/ui';
import { bumpData, useDataStore } from '@/store/data';
import { notify } from '@/store/toast';
import { radius, useTheme } from '@/theme';
import { block, emptyDraft, type Block, type SetRow, type WorkoutDraft } from '@/utils/draft';
import { cleanDecimal, cleanInt, fmtVolume, parseNum } from '@/utils/format';

export default function WorkoutEditorScreen() {
  const t = useTheme();
  // The draft is handed over through the store; read it once so later edits stay local.
  const [d, setD] = useState<WorkoutDraft>(() => useDataStore.getState().draft ?? emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateBlock = (key: number, fn: (b: Block) => Block) =>
    setD((x) => ({ ...x, blocks: x.blocks.map((b) => (b.key === key ? fn(b) : b)) }));
  const updateSet = (key: number, i: number, patch: Partial<SetRow>) =>
    updateBlock(key, (b) => ({ ...b, sets: b.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const volume = d.blocks.reduce(
    (sum, b) => sum + b.sets.reduce((s, r) => s + (parseNum(r.reps) ?? 0) * (parseNum(r.weightKg) ?? 0), 0),
    0,
  );

  const save = async () => {
    const blocks = d.blocks.filter((b) => b.exerciseId && b.sets.length);
    if (!d.title.trim()) return setError('Məşqin adını daxil edin');
    if (!blocks.length) return setError('Ən azı bir hərəkət seçin');
    setBusy(true);
    setError(null);
    try {
      await api.saveWorkout(
        {
          date: d.date,
          title: d.title.trim(),
          notes: d.notes.trim() || null,
          durationMin: parseNum(d.durationMin),
          programDayId: d.programDayId,
          sets: blocks.flatMap((b) =>
            b.sets.map((s) => ({
              exerciseId: b.exerciseId!,
              reps: Math.round(parseNum(s.reps) ?? 0),
              weightKg: parseNum(s.weightKg) ?? 0,
            })),
          ),
        },
        d.id,
      );
      notify(d.id ? 'Məşq yeniləndi' : 'Məşq əlavə olundu 💪');
      bumpData();
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={d.id ? 'Məşqi redaktə et' : 'Yeni məşq'} back keyboard>
      <View style={{ gap: 14 }}>
        {error && <ErrorBox text={error} />}
        {d.programDayId && !d.id && <InfoBox text="Proqram planı əsasında dolduruldu — real nəticələrinizi yazın." />}

        <Card>
          <View style={{ gap: 12 }}>
            <Input label="Məşqin adı" placeholder="məs. Sinə + Triceps" value={d.title} onChangeText={(title) => setD({ ...d, title })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DateField label="Tarix" value={d.date} onChange={(date) => setD({ ...d, date })} maximumDate={new Date()} style={{ flex: 1.4 }} />
              <Input
                label="Müddət"
                suffix="dəq"
                keyboardType="number-pad"
                value={d.durationMin}
                onChangeText={(v) => setD({ ...d, durationMin: cleanInt(v) })}
                containerStyle={{ flex: 1 }}
              />
            </View>
          </View>
        </Card>

        {d.blocks.map((b, bi) => (
          <Glass key={b.key} padding={14}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Txt weight="800" color="secondary" style={{ width: 22 }}>
                {bi + 1}.
              </Txt>
              <ExerciseField value={b.exerciseId} onChange={(id) => updateBlock(b.key, (x) => ({ ...x, exerciseId: id }))} />
              <IconBtn
                icon="trash-outline"
                size={19}
                color={t.error}
                label="Hərəkəti sil"
                onPress={() => setD((x) => ({ ...x, blocks: x.blocks.filter((y) => y.key !== b.key) }))}
              />
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 52 }}>
                <Txt variant="caption" color="secondary" style={{ flex: 1 }}>
                  Təkrar
                </Txt>
                <Txt variant="caption" color="secondary" style={{ flex: 1.2 }}>
                  Çəki
                </Txt>
                <View style={{ width: 36 }} />
              </View>
              {b.sets.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 44,
                      height: 34,
                      borderRadius: radius.sm,
                      backgroundColor: t.hover,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt variant="caption" weight="700" color="secondary">
                      Set {i + 1}
                    </Txt>
                  </View>
                  <Input
                    keyboardType="number-pad"
                    value={s.reps}
                    onChangeText={(v) => updateSet(b.key, i, { reps: cleanInt(v) })}
                    selectTextOnFocus
                    containerStyle={{ flex: 1 }}
                    style={{ minHeight: 40 }}
                  />
                  <Input
                    keyboardType="decimal-pad"
                    suffix="kg"
                    value={s.weightKg}
                    onChangeText={(v) => updateSet(b.key, i, { weightKg: cleanDecimal(v) })}
                    selectTextOnFocus
                    containerStyle={{ flex: 1.2 }}
                    style={{ minHeight: 40 }}
                  />
                  <IconBtn
                    icon="close"
                    size={16}
                    color={t.textSecondary}
                    disabled={b.sets.length === 1}
                    onPress={() => updateBlock(b.key, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                    label="Seti sil"
                  />
                </View>
              ))}
              <Button
                title="Set əlavə et"
                icon="add"
                variant="text"
                size="sm"
                style={{ alignSelf: 'flex-start' }}
                onPress={() => updateBlock(b.key, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}
              />
            </View>
          </Glass>
        ))}

        <Button title="Hərəkət əlavə et" icon="add-circle-outline" variant="outlined" onPress={() => setD((x) => ({ ...x, blocks: [...x.blocks, block()] }))} />

        <Card>
          <Input label="Qeydlər" multiline value={d.notes} onChangeText={(notes) => setD({ ...d, notes })} placeholder="Hiss, yuxu, ağrı..." />
        </Card>

        <Glass blur padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt variant="caption" color="secondary">
                Ümumi həcm
              </Txt>
              <Txt variant="h3">{fmtVolume(volume)}</Txt>
            </View>
            <Button title="Yadda saxla" icon="checkmark" loading={busy} onPress={save} />
          </View>
        </Glass>
      </View>
    </Screen>
  );
}
