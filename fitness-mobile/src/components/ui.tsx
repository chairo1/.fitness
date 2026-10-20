import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useToastStore } from '@/store/toast';
import { alpha, radius, useBlurTarget, useTheme, type ColorKey, type Theme } from '@/theme';
import { fmtDate } from '@/utils/format';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const tap = () => Haptics.selectionAsync().catch(() => {});

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const VARIANTS: Record<string, TextStyle> = {
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15 },
  body2: { fontSize: 13.5 },
  caption: { fontSize: 12 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
};

type TxtColor = 'text' | 'secondary' | 'disabled' | ColorKey | (string & {});

export function Txt({
  variant = 'body',
  color = 'text',
  weight,
  center,
  style,
  ...rest
}: TextProps & {
  variant?: keyof typeof VARIANTS;
  color?: TxtColor;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}) {
  const t = useTheme();
  const c =
    color === 'text'
      ? t.text
      : color === 'secondary'
        ? t.textSecondary
        : color === 'disabled'
          ? t.textDisabled
          : ((t as unknown as Record<string, string>)[color] ?? color);
  return (
    <Text
      style={[VARIANTS[variant], { color: c }, weight ? { fontWeight: weight } : null, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}

export const colorOf = (t: Theme, c: ColorKey) => t[c];

// ---------------------------------------------------------------------------
// Glass surfaces
// ---------------------------------------------------------------------------

/**
 * Frosted panel. `blur` renders a real backdrop blur (Android 12+ via RenderNode); plain panels
 * use a translucent fill over the soft background, which looks the same and scrolls much cheaper.
 */
export function Glass({
  children,
  style,
  contentStyle,
  blur = false,
  strong = false,
  padding = 16,
  onPress,
  onLongPress,
  radius: r = radius.lg,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  blur?: boolean;
  strong?: boolean;
  padding?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  radius?: number;
}) {
  const t = useTheme();
  const target = useBlurTarget();
  const shell: ViewStyle = { borderRadius: r, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.glassBorder };
  const inner = (
    <>
      {blur ? (
        <>
          <BlurView
            blurTarget={target}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={60}
            tint={t.blurTint}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? t.glassStrong : t.glass }]} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? t.glassStrong : t.glass }]} />
      )}
      <LinearGradient
        colors={t.sheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
        pointerEvents="none"
      />
      <View style={[{ padding }, contentStyle]}>{children}</View>
    </>
  );
  if (onPress || onLongPress)
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [shell, style, pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] }]}
      >
        {inner}
      </Pressable>
    );
  return <View style={[shell, style]}>{inner}</View>;
}

/** Card with a title row. */
export function Card({
  title,
  action,
  children,
  style,
  padding = 16,
}: {
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  return (
    <Glass style={style} padding={padding}>
      {(title || action) && (
        <View style={[styles.row, { marginBottom: 12, minHeight: 28 }]}>
          <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </Txt>
          {action}
        </View>
      )}
      {children}
    </Glass>
  );
}

/** Soft colour blobs the glass floats over. */
export function GlassBackground() {
  const t = useTheme();
  const { width: w, height: h } = useWindowDimensions();
  // Radial gradients fading to transparent read like the web's CSS-blurred blobs.
  const blobs = [
    { cx: w * 0.05, cy: h * 0.05, r: w * 0.95 },
    { cx: w * 1.0, cy: h * 0.45, r: w * 0.9 },
    { cx: w * 0.3, cy: h * 1.0, r: w * 0.95 },
  ];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          {blobs.map((_, i) => (
            <RadialGradient key={i} id={`blob${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={t.blobs[i]} stopOpacity={t.blobOpacity} />
              <Stop offset="0.55" stopColor={t.blobs[i]} stopOpacity={t.blobOpacity * 0.35} />
              <Stop offset="1" stopColor={t.blobs[i]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((b, i) => (
          <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#blob${i})`} />
        ))}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function Screen({
  title,
  subtitle,
  action,
  back,
  children,
  refreshing,
  onRefresh,
  tabs = false,
  scroll = true,
  keyboard = false,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /** Shows a back button. */
  back?: boolean;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Leaves room for the floating tab bar. */
  tabs?: boolean;
  scroll?: boolean;
  keyboard?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const header = (title || back || action) && (
    <View style={[styles.row, { gap: 10, marginBottom: 18 }]}>
      {back && <IconBtn icon="chevron-back" glass onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      <View style={{ flex: 1 }}>
        {title ? (
          <Txt variant="h1" numberOfLines={2}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt variant="body2" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {action}
    </View>
  );
  const pad: ViewStyle = {
    paddingTop: insets.top + 12,
    paddingHorizontal: 16,
    paddingBottom: insets.bottom + (tabs ? 110 : 32),
  };
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            colors={[t.primary]}
            tintColor={t.primary}
            progressBackgroundColor={t.glassStrong}
            progressViewOffset={insets.top}
          />
        ) : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad]}>
      {header}
      {children}
    </View>
  );
  return keyboard ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Button({
  title,
  onPress,
  variant = 'contained',
  color = 'primary',
  icon,
  iconRight,
  size = 'md',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'contained' | 'outlined' | 'text' | 'tonal';
  color?: ColorKey;
  icon?: IconName;
  iconRight?: IconName;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const c = t[color];
  const h = size === 'sm' ? 34 : size === 'lg' ? 52 : 44;
  const fg = variant === 'contained' ? '#fff' : c;
  const off = disabled || loading;
  const content = (
    <View style={[styles.row, { justifyContent: 'center', gap: 6, height: h, paddingHorizontal: size === 'sm' ? 12 : 18 }]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={fg} />
      ) : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: size === 'sm' ? 13.5 : size === 'lg' ? 16.5 : 15 }} numberOfLines={1}>
        {title}
      </Text>
      {iconRight && <Ionicons name={iconRight} size={size === 'sm' ? 16 : 19} color={fg} />}
    </View>
  );
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={off}
      style={({ pressed }) => [
        { borderRadius: radius.md, overflow: 'hidden', opacity: off ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'outlined' && { borderWidth: 1.2, borderColor: alpha(c, 0.55) },
        variant === 'tonal' && { backgroundColor: alpha(c, t.mode === 'dark' ? 0.18 : 0.12) },
        variant === 'contained' && color !== 'primary' && { backgroundColor: c },
        style,
      ]}
    >
      {variant === 'contained' && color === 'primary' ? (
        <LinearGradient colors={[t.primary, t.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

export function IconBtn({
  icon,
  onPress,
  color,
  size = 20,
  glass,
  disabled,
  label,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  glass?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const t = useTheme();
  const box = size + 20;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        { width: box, height: box, borderRadius: box / 2, alignItems: 'center', justifyContent: 'center' },
        glass && { backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassBorder },
        pressed && { backgroundColor: t.hover },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

export function Input({
  label,
  suffix,
  error,
  style,
  containerStyle,
  ...rest
}: TextInputProps & { label?: string; suffix?: string; error?: string | null; containerStyle?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={containerStyle}>
      {label ? (
        <Txt variant="caption" color="secondary" weight="600" style={{ marginBottom: 6, marginLeft: 2 }}>
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.row,
          {
            backgroundColor: t.input,
            borderWidth: 1.2,
            borderColor: error ? t.error : focus ? t.primary : t.inputBorder,
            borderRadius: radius.md,
            paddingHorizontal: 12,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={t.textDisabled}
          selectionColor={t.primary}
          cursorColor={t.primary}
          {...rest}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          style={[
            { flex: 1, color: t.text, fontSize: 15.5, paddingVertical: rest.multiline ? 10 : 0, minHeight: 46 },
            rest.multiline && { textAlignVertical: 'top', minHeight: 72 },
            style,
          ]}
        />
        {suffix ? (
          <Txt variant="body2" color="secondary" style={{ marginLeft: 6 }}>
            {suffix}
          </Txt>
        ) : null}
      </View>
      {error ? (
        <Txt variant="caption" color="error" style={{ marginTop: 4, marginLeft: 2 }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  color,
  selected,
  onPress,
  icon,
  small,
  variant = 'soft',
  style,
}: {
  label: string;
  color?: ColorKey | null;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  small?: boolean;
  variant?: 'soft' | 'outlined' | 'filled';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const c = color ? t[color] : t.textSecondary;
  const filled = variant === 'filled' || selected;
  const fg = filled ? '#fff' : color ? c : t.text;
  const bg = filled
    ? selected && !color
      ? t.primary
      : c
    : variant === 'soft'
      ? color
        ? alpha(c, t.mode === 'dark' ? 0.18 : 0.12)
        : t.hover
      : 'transparent';
  const body = (
    <View
      style={[
        styles.row,
        {
          gap: 4,
          height: small ? 24 : 32,
          paddingHorizontal: small ? 9 : 13,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: variant === 'outlined' && !filled ? 1 : 0,
          borderColor: color ? alpha(c, 0.5) : t.inputBorder,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 12 : 15} color={fg} />}
      <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 11.5 : 13 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function ProgressBar({ value, color = 'primary', height = 8 }: { value: number; color?: ColorKey; height?: number }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: alpha(t[color], 0.16), overflow: 'hidden' }}>
      {color === 'primary' ? (
        <LinearGradient
          colors={[t.primary, t.primary2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${v}%`, height: '100%', borderRadius: height }}
        />
      ) : (
        <View style={{ width: `${v}%`, height: '100%', borderRadius: height, backgroundColor: t[color] }} />
      )}
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: t.hover, borderRadius: radius.md, padding: 4, gap: 4 }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[
              styles.row,
              {
                flex: 1,
                justifyContent: 'center',
                gap: 5,
                height: 36,
                borderRadius: radius.sm,
                backgroundColor: on ? t.glassStrong : 'transparent',
              },
            ]}
          >
            {o.icon && <Ionicons name={o.icon} size={15} color={on ? t.primary : t.textSecondary} />}
            <Text style={{ color: on ? t.text : t.textSecondary, fontWeight: on ? '700' : '600', fontSize: 13.5 }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  color = 'primary',
  style,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  hint?: string;
  color?: ColorKey;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Glass style={style} padding={14}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(t[color], t.mode === 'dark' ? 0.2 : 0.14),
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={19} color={t[color]} />
      </View>
      <Txt variant="caption" color="secondary">
        {label}
      </Txt>
      <Txt variant="h2" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
      {hint ? (
        <Txt variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {hint}
        </Txt>
      ) : null}
    </Glass>
  );
}

/** Two-column grid of children. */
export function Grid2({ children, gap = 12 }: { children: ReactNode[]; gap?: number }) {
  const rows: ReactNode[][] = [];
  children.forEach((c, i) => (i % 2 ? rows[rows.length - 1].push(c) : rows.push([c])));
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r.map((c, j) => (
            <View key={j} style={{ flex: 1 }}>
              {c}
            </View>
          ))}
          {r.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ icon = 'sparkles-outline', text, action }: { icon?: IconName; text: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12, gap: 10 }}>
      <Ionicons name={icon} size={38} color={t.textDisabled} />
      <Txt color="secondary" center>
        {text}
      </Txt>
      {action}
    </View>
  );
}

export function Loading({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ paddingVertical: 48, alignItems: 'center' }, style]}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );
}

export function ErrorBox({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.row,
        { gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: alpha(t.error, 0.12), borderWidth: 1, borderColor: alpha(t.error, 0.3) },
      ]}
    >
      <Ionicons name="alert-circle" size={18} color={t.error} />
      <Txt variant="body2" color="error" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

export function InfoBox({ text, icon = 'information-circle' }: { text: string; icon?: IconName }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: alpha(t.info, 0.12) }]}>
      <Ionicons name={icon} size={18} color={t.info} />
      <Txt variant="body2" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: t.divider }, style]} />;
}

// ---------------------------------------------------------------------------
// Date field
// ---------------------------------------------------------------------------

export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  style,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const date = dayjs(value).toDate();
  const set = (d?: Date) => d && onChange(dayjs(d).format('YYYY-MM-DD'));
  const open = () => {
    tap();
    if (Platform.OS === 'android')
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        maximumDate,
        onChange: (e, d) => e.type === 'set' && set(d),
      });
    else setIosOpen((o) => !o);
  };
  return (
    <View style={style}>
      {label ? (
        <Txt variant="caption" color="secondary" weight="600" style={{ marginBottom: 6, marginLeft: 2 }}>
          {label}
        </Txt>
      ) : null}
      <Pressable
        onPress={open}
        style={[
          styles.row,
          { height: 48, gap: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1.2, borderColor: t.inputBorder, backgroundColor: t.input },
        ]}
      >
        <Ionicons name="calendar-outline" size={18} color={t.primary} />
        <Txt style={{ flex: 1 }}>{fmtDate(value)}</Txt>
      </Pressable>
      {iosOpen && (
        <DateTimePicker value={date} mode="date" display="inline" maximumDate={maximumDate} onChange={(_, d) => set(d)} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------

export function Sheet({
  open,
  onClose,
  title,
  children,
  height,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fraction of the screen, e.g. 0.8. Omit to size to content. */
  height?: number;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,20,0.45)' }]} onPress={onClose} />
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View
          style={{
            height: height ? `${height * 100}%` : undefined,
            maxHeight: '92%',
            backgroundColor: t.glassStrong,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderWidth: 1,
            borderColor: t.glassBorder,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4.5, borderRadius: 3, backgroundColor: t.inputBorder }} />
          </View>
          {title ? (
            <View style={[styles.row, { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6 }]}>
              <Txt variant="h2" style={{ flex: 1 }}>
                {title}
              </Txt>
              <IconBtn icon="close" onPress={onClose} />
            </View>
          ) : null}
          <View style={{ flexShrink: 1, flexGrow: height ? 1 : 0 }}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Toast + confirm
// ---------------------------------------------------------------------------

export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { toast, clear } = useToastStore();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    if (toast.kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    const timer = setTimeout(
      () => Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => clear()),
      2600,
    );
    return () => clearTimeout(timer);
  }, [toast, anim, clear]);

  if (!toast) return null;
  const c = toast.kind === 'error' ? t.error : toast.kind === 'info' ? t.info : t.success;
  const icon: IconName = toast.kind === 'error' ? 'alert-circle' : toast.kind === 'info' ? 'information-circle' : 'checkmark-circle';
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
      }}
    >
      <Glass blur strong padding={14} contentStyle={[styles.row, { gap: 10 }]}>
        <Ionicons name={icon} size={22} color={c} />
        <Txt weight="600" style={{ flex: 1 }}>
          {toast.message}
        </Txt>
      </Glass>
    </Animated.View>
  );
}

export function confirm(title: string, message: string, okLabel: string, onOk: () => void) {
  Alert.alert(title, message, [
    { text: 'Ləğv et', style: 'cancel' },
    { text: okLabel, style: 'destructive', onPress: onOk },
  ]);
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
