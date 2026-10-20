import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Pattern, RadialGradient, Stop } from 'react-native-svg';
import type { MuscleGroup } from '@/api/types';
import { alpha, radius, useTheme } from '@/theme';
import { MUSCLE_LABELS } from '@/utils/format';
import { BODY_GROUPS, exercisesHref, MUSCLE_PARTS, musclePart, type MusclePart } from '@/utils/muscles';
import { Button, Chip, Divider, Segmented, tap, Txt } from '../ui';
import {
  BACK_LINES,
  BACK_MUSCLES,
  BACK_SHORTS,
  BASE_SHAPES,
  FACE_LINES,
  FIGURE_H,
  FIGURE_W,
  FRONT_LINES,
  FRONT_MUSCLES,
  FRONT_SHORTS,
  GLUTES,
  HAIR_BACK,
  HAIR_FRONT,
  type MuscleShape,
} from './anatomy';

type View_ = 'front' | 'back';
type State = 'idle' | 'group' | 'hot';

const RED = '#e5432b';
const ORANGE = '#f07a5c';
const FIBER_ANGLES = [...new Set([...FRONT_MUSCLES, ...BACK_MUSCLES, ...GLUTES].map((m) => m.fiber))];
const FILL: Record<State, string> = { idle: 'url(#bm-muscle)', group: 'url(#bm-group)', hot: 'url(#bm-hot)' };
const STROKE: Record<State, string> = { idle: '#676a70', group: '#a8452c', hot: '#7d1a0e' };

function Defs_() {
  const radial = (id: string, stops: [number, string][]) => (
    <RadialGradient id={id} cx="42%" cy="36%" r="78%">
      {stops.map(([o, c]) => (
        <Stop key={o} offset={o} stopColor={c} />
      ))}
    </RadialGradient>
  );
  return (
    <Defs>
      {radial('bm-muscle', [[0, '#fafafa'], [0.55, '#e2e3e6'], [1, '#a7aab0']])}
      {radial('bm-group', [[0, '#ffd2c4'], [0.55, '#f5967b'], [1, '#c8573c']])}
      {radial('bm-hot', [[0, '#ff9f86'], [0.55, '#e8472e'], [1, '#9e2213']])}
      {radial('bm-shorts', [[0, '#4a4b50'], [0.6, '#2b2c30'], [1, '#141518']])}
      <LinearGradient id="bm-skin" x1="0" x2="1" y1="0" y2="0">
        <Stop offset="0" stopColor="#b9bbc0" />
        <Stop offset="0.45" stopColor="#e4e5e8" />
        <Stop offset="1" stopColor="#b3b6bb" />
      </LinearGradient>
      <LinearGradient id="bm-hair" x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor="#4a4747" />
        <Stop offset="1" stopColor="#262424" />
      </LinearGradient>
      {FIBER_ANGLES.map((a) => (
        <Pattern key={a} id={`bm-fib-${a}`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform={`rotate(${a})`}>
          <Line x1="0" y1="1.7" x2="3.4" y2="1.7" stroke="#2a2c30" strokeWidth="0.7" />
        </Pattern>
      ))}
    </Defs>
  );
}

function MusclePath({ m, state, onPick }: { m: MuscleShape; state: State; onPick: (part: string) => void }) {
  return (
    <G touchSoundDisabled onPress={() => onPick(m.part)}>
      <Path d={m.d} fill={FILL[state]} stroke={STROKE[state]} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d={m.d} fill={`url(#bm-fib-${m.fiber})`} opacity={state === 'idle' ? 0.16 : 0.22} />
    </G>
  );
}

function Figure({ view, stateOf, onPick }: { view: View_; stateOf: (p: string) => State; onPick: (p: string) => void }) {
  const front = view === 'front';
  const muscles = front ? FRONT_MUSCLES : BACK_MUSCLES;
  return (
    <G>
      {/* Thick stroke pass under a fill pass leaves one clean outline around the union. */}
      {BASE_SHAPES.map((d, i) => (
        <Path key={`o${i}`} d={d} fill="none" stroke="#45484d" strokeWidth={4.2} strokeLinejoin="round" />
      ))}
      {BASE_SHAPES.map((d, i) => (
        <Path key={`f${i}`} d={d} fill="url(#bm-skin)" />
      ))}
      {front && FRONT_LINES.map((d, i) => <Path key={i} d={d} fill="none" stroke="#7d8086" strokeWidth={1.1} />)}
      {!front && BACK_LINES.map((d, i) => <Path key={i} d={d} fill="none" stroke="#5f6267" strokeWidth={1.4} />)}

      {muscles.map((m, i) => (
        <MusclePath key={i} m={m} state={stateOf(m.part)} onPick={onPick} />
      ))}

      <Path d={front ? FRONT_SHORTS : BACK_SHORTS} fill="url(#bm-shorts)" stroke="#0d0e10" strokeWidth={1.4} />
      {!front &&
        GLUTES.map((m, i) => {
          const st = stateOf(m.part);
          return st === 'idle' ? (
            // At rest the glutes are just the shape of the shorts fabric.
            <G key={i} touchSoundDisabled onPress={() => onPick(m.part)}>
              <Path d={m.d} fill="url(#bm-shorts)" stroke="#08090a" strokeWidth={1.2} />
            </G>
          ) : (
            <MusclePath key={i} m={m} state={st} onPick={onPick} />
          );
        })}

      <Path d={front ? HAIR_FRONT : HAIR_BACK} fill="url(#bm-hair)" />
      {front &&
        FACE_LINES.map((d, i) => (
          <Path key={i} d={d} fill={d.endsWith('Z') ? '#6d7076' : 'none'} stroke="#6d7076" strokeWidth={1.1} strokeLinecap="round" />
        ))}
    </G>
  );
}

/**
 * Tap a muscle to select it (its group lights up); tap again or use the button to open the
 * matching exercises. Below the figure: groups with the last 30 days' set counts.
 */
export default function BodyMap({ sets = {} }: { sets?: Partial<Record<MuscleGroup, number>> }) {
  const t = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [view, setView] = useState<View_>('front');

  const part = musclePart(selected);
  const activeGroup = part?.group ?? group;
  const stateOf = (id: string): State =>
    id === part?.id ? 'hot' : activeGroup && musclePart(id)?.group === activeGroup ? 'group' : 'idle';

  const open = (p: MusclePart) => router.push(exercisesHref(p.group, p.id));
  const onPick = (id: string) => {
    const p = musclePart(id);
    if (!p) return;
    tap();
    setGroup(null);
    if (selected === id) open(p);
    else setSelected(id);
  };

  return (
    <View>
      <View
        style={{
          minHeight: 56,
          borderRadius: radius.md,
          backgroundColor: t.hover,
          paddingHorizontal: 12,
          paddingVertical: 8,
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        {part ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED }} />
            <View style={{ flex: 1 }}>
              <Txt weight="700" numberOfLines={1}>
                {part.name}
              </Txt>
              <Txt variant="caption" color="secondary" style={{ fontStyle: 'italic' }}>
                {part.latin} · {MUSCLE_LABELS[part.group]}
              </Txt>
            </View>
            <Button title="Hərəkətlər" size="sm" iconRight="arrow-forward" onPress={() => open(part)} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="hand-left-outline" size={18} color={t.textSecondary} />
            <Txt variant="body2" color="secondary" style={{ flex: 1 }}>
              Əzələyə toxunun — uyğun hərəkətlər açılacaq.
            </Txt>
          </View>
        )}
      </View>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'front', label: 'Ön' },
          { value: 'back', label: 'Arxa' },
        ]}
        style={{ alignSelf: 'center', width: 200, marginBottom: 8 }}
      />

      <Pressable onPress={() => setSelected(null)} style={{ alignItems: 'center' }}>
        <View
          style={{
            position: 'absolute',
            top: '15%',
            width: '70%',
            height: '70%',
            borderRadius: 999,
            backgroundColor: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
          }}
        />
        <Svg viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`} width="100%" height={460}>
          <Defs_ />
          <Figure view={view} stateOf={stateOf} onPick={onPick} />
        </Svg>
      </Pressable>

      <Divider style={{ marginVertical: 12 }} />
      <Txt variant="overline" color="secondary" style={{ marginBottom: 6 }}>
        Əzələ qrupları · son 30 gün
      </Txt>
      {BODY_GROUPS.map((g) => {
        const parts = MUSCLE_PARTS.filter((p) => p.group === g);
        const on = activeGroup === g;
        return (
          <Pressable
            key={g}
            onPress={() => {
              tap();
              if (group === g) router.push(exercisesHref(g));
              else {
                setSelected(null);
                setGroup(g);
              }
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 10,
              borderRadius: radius.md,
              backgroundColor: on ? alpha(ORANGE, 0.16) : pressed ? t.hover : 'transparent',
            })}
          >
            <View style={{ flex: 1 }}>
              <Txt weight="600">{MUSCLE_LABELS[g]}</Txt>
              <Txt variant="caption" color="secondary" numberOfLines={1}>
                {parts.map((p) => p.name).join(', ')}
              </Txt>
            </View>
            <Chip small label={`${sets[g] ?? 0} set`} />
            <Ionicons name="chevron-forward" size={18} color={t.textDisabled} />
          </Pressable>
        );
      })}
    </View>
  );
}
