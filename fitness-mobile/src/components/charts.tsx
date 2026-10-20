import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Txt } from './ui';

const useWidth = () => {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
};

/** "Nice" axis maximum and 4 tick values. */
function ticks(min: number, max: number) {
  if (max === min) max = min + 1;
  const raw = (max - min) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/** Shows every n-th x label so they don't collide. */
const labelEvery = (count: number, width: number, labelW = 44) => Math.max(1, Math.ceil(count / Math.max(1, width / labelW)));

export function BarChart({
  labels,
  values,
  color,
  height = 200,
  format = (v: number) => String(v),
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  format?: (v: number) => string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const c = color ?? t.primary;
  const left = 46;
  const bottom = 22;
  const top = 22;
  const ys = ticks(0, Math.max(...values, 1));
  const yMax = ys[ys.length - 1];
  const plotW = Math.max(0, w - left - 4);
  const plotH = height - bottom - top;
  const slot = plotW / Math.max(1, values.length);
  const barW = Math.min(26, slot * 0.62);
  const every = labelEvery(values.length, plotW);
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c} stopOpacity={1} />
              <Stop offset="1" stopColor={c} stopOpacity={0.45} />
            </LinearGradient>
          </Defs>
          {ys.map((v) => {
            const y = top + plotH - (v / yMax) * plotH;
            return (
              <G key={v}>
                <Line x1={left} x2={w} y1={y} y2={y} stroke={t.divider} strokeWidth={1} />
                <SvgText x={left - 6} y={y + 4} fontSize={10} fill={t.textSecondary} textAnchor="end">
                  {format(v)}
                </SvgText>
              </G>
            );
          })}
          {values.map((v, i) => {
            const bh = (v / yMax) * plotH;
            const x = left + slot * i + (slot - barW) / 2;
            return (
              <G key={i} touchSoundDisabled onPress={() => setSel(sel === i ? null : i)}>
                <Rect x={left + slot * i} y={top} width={slot} height={plotH} fill="transparent" />
                <Rect
                  x={x}
                  y={top + plotH - bh}
                  width={barW}
                  height={Math.max(bh, v > 0 ? 2 : 0)}
                  rx={Math.min(6, barW / 2)}
                  fill="url(#bar)"
                  opacity={sel == null || sel === i ? 1 : 0.4}
                />
                {i % every === 0 && (
                  <SvgText x={x + barW / 2} y={height - 6} fontSize={10} fill={t.textSecondary} textAnchor="middle">
                    {labels[i]}
                  </SvgText>
                )}
              </G>
            );
          })}
          {sel != null && (
            <SvgText
              x={Math.min(Math.max(left + slot * sel + slot / 2, left + 30), w - 30)}
              y={Math.max(12, top + plotH - (values[sel] / yMax) * plotH - 6)}
              fontSize={11}
              fontWeight="700"
              fill={t.text}
              textAnchor="middle"
            >
              {format(values[sel])}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

export interface Series {
  data: number[];
  color: string;
  label?: string;
  area?: boolean;
  dashed?: boolean;
  dots?: boolean;
}

/** Monotone-ish smooth path through points (Catmull-Rom with low tension). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const k = 1 / 6;
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function LineChart({
  labels,
  series,
  height = 200,
  min,
  format = (v: number) => String(v),
}: {
  labels: string[];
  series: Series[];
  height?: number;
  min?: number;
  format?: (v: number) => string;
}) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const all = series.flatMap((s) => s.data);
  const ys = ticks(min ?? Math.min(...all), Math.max(...all));
  const lo = ys[0];
  const hi = ys[ys.length - 1];
  const left = 40;
  const right = 10;
  const top = 14;
  const bottom = 22;
  const plotW = Math.max(0, w - left - right);
  const plotH = height - top - bottom;
  const n = labels.length;
  const xOf = (i: number) => left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const yOf = (v: number) => top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const every = labelEvery(n, plotW);
  const legend = series.filter((s) => s.label);
  return (
    <View>
      <View onLayout={onLayout} style={{ height }}>
        {w > 0 && (
          <Svg width={w} height={height}>
            <Defs>
              {series.map((s, i) => (
                <LinearGradient key={i} id={`area${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>
            {ys.map((v) => (
              <G key={v}>
                <Line x1={left} x2={w - right} y1={yOf(v)} y2={yOf(v)} stroke={t.divider} strokeWidth={1} />
                <SvgText x={left - 6} y={yOf(v) + 4} fontSize={10} fill={t.textSecondary} textAnchor="end">
                  {format(v)}
                </SvgText>
              </G>
            ))}
            {labels.map((l, i) =>
              i % every === 0 ? (
                <SvgText key={i} x={xOf(i)} y={height - 6} fontSize={10} fill={t.textSecondary} textAnchor="middle">
                  {l}
                </SvgText>
              ) : null,
            )}
            {series.map((s, si) => {
              const pts = s.data.map((v, i) => [xOf(i), yOf(v)] as [number, number]);
              const d = smooth(pts);
              return (
                <G key={si}>
                  {s.area && pts.length > 1 && (
                    <Path d={`${d}L${pts[pts.length - 1][0]},${top + plotH}L${pts[0][0]},${top + plotH}Z`} fill={`url(#area${si})`} />
                  )}
                  <Path
                    d={d}
                    stroke={s.color}
                    strokeWidth={s.dashed ? 1.6 : 2.6}
                    strokeDasharray={s.dashed ? '6 5' : undefined}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {(s.dots ?? !s.dashed) &&
                    pts.map(([x, y], i) => (
                      <Circle key={i} cx={x} cy={y} r={sel === i ? 5 : 3} fill={t.glassStrong} stroke={s.color} strokeWidth={2} />
                    ))}
                </G>
              );
            })}
            {sel != null && <Line x1={xOf(sel)} x2={xOf(sel)} y1={top} y2={top + plotH} stroke={t.textDisabled} strokeDasharray="3 3" />}
            {/* Tap targets: one column per point. */}
            {labels.map((_, i) => (
              <Rect
                key={i}
                x={xOf(i) - plotW / Math.max(1, n - 1) / 2}
                y={0}
                width={plotW / Math.max(1, n - 1)}
                height={height}
                fill="transparent"
                touchSoundDisabled
                onPress={() => setSel(sel === i ? null : i)}
              />
            ))}
          </Svg>
        )}
      </View>
      {(sel != null || legend.length > 1) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
          {sel != null && (
            <Txt variant="caption" weight="700">
              {labels[sel]}:
            </Txt>
          )}
          {series.map((s, i) =>
            s.label || sel != null ? (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
                <Txt variant="caption" color="secondary">
                  {s.label}
                  {sel != null ? ` ${format(s.data[sel])}` : ''}
                </Txt>
              </View>
            ) : null,
          )}
        </View>
      )}
    </View>
  );
}

export function Donut({
  data,
  size = 150,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const t = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = data.length > 1 ? 3 : 0;
  const lengths = data.map((d) => (d.value / total) * c);
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((s, l) => s + l, 0));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.hover} strokeWidth={stroke} fill="none" />
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {data.map((d, i) => (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={d.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(0, lengths[i] - gap)} ${c}`}
                strokeDashoffset={-offsets[i]}
                strokeLinecap="butt"
              />
            ))}
          </G>
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          {centerValue ? <Txt variant="h2">{centerValue}</Txt> : null}
          {centerLabel ? (
            <Txt variant="caption" color="secondary">
              {centerLabel}
            </Txt>
          ) : null}
        </View>
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color }} />
            <Txt variant="body2" style={{ flex: 1 }} numberOfLines={1}>
              {d.label}
            </Txt>
            <Txt variant="body2" weight="700">
              {d.value}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
