import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { api, errorMessage } from '@/api/client';
import type { ProgramInput, ProgramType } from '@/api/types';
import { ExerciseField } from '@/components/ExercisePicker';
import { Button, Card, DateField, ErrorBox, Glass, IconBtn, Input, Loading, Screen, Segmented, tap, Txt } from '@/components/ui';
import { bumpData } from '@/store/data';
import { notify } from '@/store/toast';
import { alpha, radius, useTheme } from '@/theme';
import { cleanDecimal, cleanInt, fmtDateShort, ordinal, parseNum, today, weekday, weekdayShort } from '@/utils/format';

interface ExRow {
  key: number;
  exerciseId: string | null;
  sets: string;
  reps: string;
  targetWeightKg: string;
}
interface DayDraft {
  title: string;
  exercises: ExRow[];
}

let seq = 0;
const exRow = (p: Partial<ExRow> = {}): ExRow => ({ key: ++seq, exerciseId: null, sets: '3', reps: '10', targetWeightKg: '', ...p });
const dayKey = (week: number, day: number) => `${week}-${day}`;
const WEEKS: Record<ProgramType, number> = { weekly: 1, monthly: 4 };
const clampInt = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(parseNum(v) ?? min)));

export default function ProgramEditorScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProgramType>('weekly');
  const [startDate, setStartDate] = useState(() => {
    // default: next Monday (or today if it's Monday)
    const d = dayjs();
    return d.add((8 - d.day()) % 7, 'day').format('YYYY-MM-DD');
  });
  const [days, setDays] = useState<Record<string, DayDraft>>({});
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (!id) return;
    api
      .program(id)
      .then((p) => {
        setName(p.name);
        setDescription(p.description ?? '');
        setType(p.type);
        setStartDate(p.startDate);
        const map: Record<string, DayDraft> = {};
        for (const d of p.days ?? []) {
          map[dayKey(d.week, d.dayIndex)] = {
            title: d.title,
            exercises: d.exercises.map((e) =>
              exRow({
                exerciseId: e.exerciseId,
                sets: String(e.sets),
                reps: String(e.reps),
                targetWeightKg: e.targetWeightKg == null ? '' : String(e.targetWeightKg),
              }),
            ),
          };
        }
        setDays(map);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const weeks = WEEKS[type];
  const dateOf = (w: number, d: number) => dayjs(startDate).add((w - 1) * 7 + d - 1, 'day').format('YYYY-MM-DD');
  const k = dayKey(week, day);
  const current = days[k];
  const date = dateOf(week, day);

  const updateDay = (key: string, fn: (d: DayDraft) => DayDraft) =>
    setDays((all) => ({ ...all, [key]: fn(all[key] ?? { title: '', exercises: [] }) }));
  const updateEx = (rowKey: number, patch: Partial<ExRow>) =>
    updateDay(k, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === rowKey ? { ...e, ...patch } : e)) }));

  const copyWeekToAll = () =>
    Alert.alert('Planı köçür', `${ordinal(week)} həftənin planı digər həftələrə köçürülsün? Onların mövcud planı əvəz olunacaq.`, [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Köçür',
        onPress: () => {
          setDays((all) => {
            const next = { ...all };
            for (let w = 1; w <= weeks; w++) {
              if (w === week) continue;
              for (let d = 1; d <= 7; d++) {
                const src = all[dayKey(week, d)];
                if (src) next[dayKey(w, d)] = { title: src.title, exercises: src.exercises.map(({ key: _, ...e }) => exRow(e)) };
                else delete next[dayKey(w, d)];
              }
            }
            return next;
          });
          notify('Plan bütün həftələrə köçürüldü', 'info');
        },
      },
    ]);

  const save = async () => {
    if (!name.trim()) return setError('Proqramın adını daxil edin');
    const payloadDays: ProgramInput['days'] = [];
    for (let w = 1; w <= weeks; w++) {
      for (let d = 1; d <= 7; d++) {
        const dd = days[dayKey(w, d)];
        const exercises = (dd?.exercises ?? []).filter((e) => e.exerciseId);
        if (!exercises.length) continue;
        payloadDays.push({
          week: w,
          dayIndex: d,
          title: dd!.title.trim() || `${ordinal(d)} gün`,
          exercises: exercises.map((e) => ({
            exerciseId: e.exerciseId!,
            sets: clampInt(e.sets, 1, 20),
            reps: clampInt(e.reps, 1, 200),
            targetWeightKg: parseNum(e.targetWeightKg),
          })),
        });
      }
    }
    if (!payloadDays.length) return setError('Ən azı bir günə hərəkət əlavə edin');
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveProgram({ name: name.trim(), description: description.trim() || null, type, startDate, days: payloadDays }, id);
      notify(id ? 'Proqram yeniləndi' : 'Proqram yaradıldı');
      bumpData();
      if (id) router.back();
      else router.replace(`/program/${saved.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <Screen back title="Proqram">
        <Loading />
      </Screen>
    );

  const plannedInWeek = Array.from({ length: 7 }, (_, i) => days[dayKey(week, i + 1)]?.exercises.length ?? 0).filter(Boolean).length;

  return (
    <Screen
      back
      keyboard
      title={id ? 'Proqramı redaktə et' : 'Yeni proqram'}
      subtitle="Hərəkətsiz günlər istirahət sayılır"
      action={<IconBtn icon="checkmark" glass color={t.primary} label="Yadda saxla" onPress={save} disabled={busy} />}
    >
      <View style={{ gap: 14 }}>
        {error && <ErrorBox text={error} />}
        <Card>
          <View style={{ gap: 12 }}>
            <Input label="Proqramın adı" placeholder="məs. Güc proqramı — Oktyabr" value={name} onChangeText={setName} />
            <Segmented
              value={type}
              onChange={(v) => {
                setType(v);
                if (week > WEEKS[v]) setWeek(1);
              }}
              options={[
                { value: 'weekly', label: 'Həftəlik (7 gün)' },
                { value: 'monthly', label: 'Aylıq (4 həftə)' },
              ]}
            />
            <DateField label="Başlama tarixi" value={startDate} onChange={(v) => setStartDate(v || today())} />
            <Input label="Təsvir (istəyə bağlı)" value={description} onChangeText={setDescription} multiline />
          </View>
        </Card>

        {weeks > 1 && (
          <View style={{ gap: 8 }}>
            <Segmented value={week} onChange={setWeek} options={Array.from({ length: weeks }, (_, i) => ({ value: i + 1, label: `${ordinal(i + 1)} h.` }))} />
            <Button title="Bu həftəni digərlərinə köçür" icon="copy-outline" variant="text" size="sm" style={{ alignSelf: 'flex-end' }} onPress={copyWeekToAll} />
          </View>
        )}
        <Txt variant="body2" color="secondary">
          {plannedInWeek} məşq günü · {7 - plannedInWeek} istirahət
        </Txt>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = i + 1;
            const on = d === day;
            const planned = !!days[dayKey(week, d)]?.exercises.length;
            const dt = dateOf(week, d);
            return (
              <Pressable
                key={d}
                onPress={() => {
                  tap();
                  setDay(d);
                }}
                style={{
                  width: 58,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: radius.md,
                  borderWidth: 1.2,
                  borderColor: on ? t.primary : t.glassBorder,
                  backgroundColor: on ? alpha(t.primary, t.mode === 'dark' ? 0.22 : 0.14) : t.glass,
                  gap: 2,
                }}
              >
                <Txt variant="caption" color={on ? 'primary' : 'secondary'} weight="600">
                  {weekdayShort(dt)}
                </Txt>
                <Txt variant="h3" color={on ? 'primary' : 'text'}>
                  {dayjs(dt).date()}
                </Txt>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: planned ? t.success : 'transparent' }} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Card
          title={`${ordinal(day)} gün · ${weekday(date)}`}
          action={
            <Txt variant="body2" color="secondary">
              {fmtDateShort(date)}
            </Txt>
          }
        >
          {!current?.exercises.length ? (
            <View style={{ alignItems: 'center', gap: 6, paddingVertical: 14 }}>
              <Ionicons name="bed-outline" size={26} color={t.textSecondary} />
              <Txt variant="body2" color="secondary">
                İstirahət günü
              </Txt>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Input
                label="Günün adı"
                placeholder="məs. Ayaq günü"
                value={current.title}
                onChangeText={(title) => updateDay(k, (x) => ({ ...x, title }))}
              />
              {current.exercises.map((e) => (
                <View key={e.key} style={{ padding: 12, borderRadius: radius.md, backgroundColor: t.hover, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ExerciseField value={e.exerciseId} onChange={(v) => updateEx(e.key, { exerciseId: v })} />
                    <IconBtn
                      icon="close"
                      size={18}
                      color={t.textSecondary}
                      label="Sil"
                      onPress={() => updateDay(k, (x) => ({ ...x, exercises: x.exercises.filter((y) => y.key !== e.key) }))}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Input
                      label="Set"
                      keyboardType="number-pad"
                      value={e.sets}
                      onChangeText={(v) => updateEx(e.key, { sets: cleanInt(v).slice(0, 2) })}
                      containerStyle={{ flex: 1 }}
                    />
                    <Input
                      label="Təkrar"
                      keyboardType="number-pad"
                      value={e.reps}
                      onChangeText={(v) => updateEx(e.key, { reps: cleanInt(v).slice(0, 3) })}
                      containerStyle={{ flex: 1 }}
                    />
                    <Input
                      label="Hədəf"
                      suffix="kg"
                      keyboardType="decimal-pad"
                      value={e.targetWeightKg}
                      onChangeText={(v) => updateEx(e.key, { targetWeightKg: cleanDecimal(v) })}
                      containerStyle={{ flex: 1.3 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <Button
              title="Hərəkət əlavə et"
              icon="add"
              variant="tonal"
              size="sm"
              onPress={() => updateDay(k, (x) => ({ ...x, exercises: [...x.exercises, exRow()] }))}
            />
            {!!current?.exercises.length && (
              <Button
                title="İstirahət et"
                icon="bed-outline"
                variant="text"
                color="error"
                size="sm"
                onPress={() =>
                  setDays((all) => {
                    const next = { ...all };
                    delete next[k];
                    return next;
                  })
                }
              />
            )}
          </View>
        </Card>

        <Glass blur padding={12}>
          <Button title="Yadda saxla" icon="checkmark" size="lg" loading={busy} onPress={save} />
        </Glass>
      </View>
    </Screen>
  );
}
