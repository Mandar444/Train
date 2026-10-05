import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput,
  TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { C, F } from '../lib/theme';
import { useEntrance } from '../lib/hooks';

// ---------- icons (stroke paths, 24 viewBox) ----------
export const ICONS = {
  home: 'M3 11.5L12 4l9 7.5M5.5 9.5V20h13V9.5',
  bowl: 'M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5',
  dumbbell: 'M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  calendar: 'M4 6h16v14H4zM4 10.5h16M9 3v4M15 3v4',
  check: 'M5 12l5 5 9-10',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  up: 'M12 19V5M5 12l7-7 7 7',
  steps: 'M8.5 21c-1.9 0-3-1.6-3-3.6 0-2.2 1-3.2 1-5.4 0-2 1-3.5 2.6-3.5s2.4 1.5 2.4 3.5c0 2.3-1 3.3-1 5.5 0 2-.4 3.5-2 3.5zM15.5 15c-1.6 0-2-1.5-2-3.5 0-2.2-1-3.2-1-5.5 0-2 1.3-3.5 2.9-3.5s2.6 1.5 2.6 3.5c0 2.2-1 3.2-1 5.4 0 2-.4 3.6-1.5 3.6z',
  flame: 'M12 3c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-3 1.5-4.5 3-6 0 2 1 3 2 3 0-3-1-5 1-8z',
  protein: 'M7 17c-2-2-2-5 0-7l5-5c2-2 5-2 7 0s2 5 0 7l-5 5c-2 2-5 2-7 0zM9.5 14.5l5-5',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  warn: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  camera: 'M4 8h3l2-3h6l2 3h3v12H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  phone: 'M7 3h10v18H7zM11 18h2',
  play: 'M7 4.5v15l12-7.5z',
  scale: 'M5 7h14l-2 13H7zM9 7a3 3 0 0 1 6 0',
  ruler: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  sync: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  timer: 'M12 8v5l3 2M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 2h6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = C.text, width = 2 }: { name: IconName; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={ICONS[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill={name === 'play' ? color : 'none'} />
    </Svg>
  );
}

// ---------- text ----------
export { nice } from '../lib/text';
import { nice } from '../lib/text';

type TP = { children?: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const T = {
  Label: ({ children, style }: TP) => <Text style={[s.label, style]}>{nice(children)}</Text>,
  Display: ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.display, style]}>{children}</Text>,
  Num: ({ children, style }: TP) => <Text style={[s.num, style]}>{children}</Text>,
  Body: ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>,
  Small: ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.small, style]}>{children}</Text>,
  Strong: ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.strong, style]}>{children}</Text>,
  Mono: ({ children, style }: TP) => <Text style={[s.mono, style]}>{children}</Text>,
};

// ---------- layout ----------
export function Screen({ children, scroll = true, bottomPad = 110, refresh }: { children: ReactNode; scroll?: boolean; bottomPad?: number; refresh?: ReactNode }) {
  const ins = useSafeAreaInsets();
  if (!scroll) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 20, paddingBottom: bottomPad + ins.bottom, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        overScrollMode="always"
        scrollEventThrottle={16}
        refreshControl={refresh as React.ReactElement<any> | undefined}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Enter({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const a = useEntrance(delay);
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

const OUTER_KEYS = new Set(['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'position', 'left', 'right', 'top', 'bottom', 'zIndex', 'width', 'minWidth', 'maxWidth']);

/** Pressable with a native-driver spring: shrinks on touch, springs back on release (UI thread, no JS per frame). */
export function Press({ onPress, onLongPress, style, children, scaleTo = 0.965, disabled, accessibilityLabel, accessibilityRole = 'button', hitSlop }: {
  onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; children: ReactNode; scaleTo?: number; disabled?: boolean;
  accessibilityLabel?: string; accessibilityRole?: 'button' | 'tab' | 'switch' | 'link'; hitSlop?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: x === 1 ? 22 : 60, bounciness: x === 1 ? 7 : 0 }).start();
  // layout props belong on the outer touch target so flex/width/margins behave like a plain View
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : inner)[k] = val;
  if (outer.flex != null || outer.flexGrow != null) inner.flexGrow = 1;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={disabled} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)}
      accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} hitSlop={hitSlop} style={outer as ViewStyle}>
      <Animated.View style={[inner as ViewStyle, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Card({ children, style, onPress, tone = 'base' }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'base' | 'orange' | 'lime' | 'green' }) {
  const toneStyle = tone === 'orange' ? s.cardOrange : tone === 'lime' ? s.cardLime : tone === 'green' ? s.cardGreen : null;
  if (onPress) {
    return (
      <Press onPress={() => { haptic(); onPress(); }} scaleTo={0.98} style={[s.card, toneStyle, style]}>
        {children}
      </Press>
    );
  }
  return <View style={[s.card, toneStyle, style]}>{children}</View>;
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Header({ title, kicker, back = true, right }: { title: string; kicker?: string; back?: boolean; right?: ReactNode }) {
  return (
    <Row style={{ marginBottom: 4 }} gap={12}>
      {back && <IconBtn name="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      <View style={{ flex: 1, gap: 2 }}>
        {kicker ? <T.Label>{kicker}</T.Label> : null}
        <T.Display style={{ fontSize: 26 }} numberOfLines={1}>{title}</T.Display>
      </View>
      {right}
    </Row>
  );
}

// ---------- controls ----------
export function haptic(kind: 'light' | 'success' | 'warn' = 'light') {
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warn') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* no haptics */ }
}

export function Btn({ title, onPress, kind = 'primary', icon, style, disabled, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'light' | 'ghost' | 'orange' | 'danger'; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean; small?: boolean;
}) {
  const bg = { primary: C.lime, light: C.text, ghost: 'transparent', orange: C.orange, danger: 'transparent' }[kind];
  const fg = { primary: C.bg, light: C.bg, ghost: C.text, orange: C.bg, danger: C.danger }[kind];
  const border = kind === 'ghost' ? C.line2 : kind === 'danger' ? '#4A2420' : 'transparent';
  return (
    <Press
      disabled={disabled}
      onPress={() => { haptic(); onPress(); }}
      style={[{
        height: small ? 44 : 54, borderRadius: small ? 12 : 16, backgroundColor: bg, borderWidth: 1, borderColor: border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16,
        opacity: disabled ? 0.4 : 1,
      }, style]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} width={2.2} /> : null}
      <Text style={{ color: fg, fontFamily: F.bold, fontSize: small ? 13 : 15 }}>{title}</Text>
    </Press>
  );
}

export function IconBtn({ name, onPress, label, size = 44, color = C.text, bg = '#1C1D18' }: { name: IconName; onPress: () => void; label: string; size?: number; color?: string; bg?: string }) {
  return (
    <Press accessibilityLabel={label} onPress={() => { haptic(); onPress(); }} scaleTo={0.88}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={20} color={color} />
    </Press>
  );
}

export function Pill({ text, tone = 'muted', style }: { text: string; tone?: 'lime' | 'muted' | 'orange' | 'solid'; style?: StyleProp<ViewStyle> }) {
  const bg = { lime: C.limeSoft, muted: C.card2, orange: 'rgba(255,138,61,0.14)', solid: C.lime }[tone];
  const fg = { lime: C.lime, muted: C.text2, orange: C.orange, solid: C.bg }[tone];
  return (
    <View style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: bg, alignSelf: 'flex-start' }, style]}>
      <Text style={{ color: fg, fontFamily: F.bold, fontSize: 13 }}>{nice(text)}</Text>
    </View>
  );
}

export function Bar({ pct, color = C.lime, height = 8, marker, delay = 0 }: { pct: number; color?: string; height?: number; marker?: number; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, pct)), duration: 900, delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start();
  }, [pct, v, delay]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: C.line, overflow: 'visible' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      {marker !== undefined ? <View style={{ position: 'absolute', left: `${Math.min(100, marker * 100)}%`, top: -4, width: 2, height: height + 8, backgroundColor: C.text }} /> : null}
    </View>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6, flex: (style as ViewStyle)?.flex as number | undefined }}>
      {label ? <T.Label>{label}</T.Label> : null}
      <TextInput
        placeholderTextColor={C.faint}
        selectionColor={C.lime}
        {...rest}
        style={[{ height: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line2, backgroundColor: C.card, color: C.text, fontFamily: F.medium, fontSize: 15 }, style]}
      />
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => { Animated.spring(x, { toValue: idx, useNativeDriver: true, speed: 24, bounciness: 4 }).start(); }, [idx, x]);
  const seg = w > 0 ? (w - 8 - 4 * (options.length - 1)) / options.length : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
      {seg > 0 ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: seg, borderRadius: 12, backgroundColor: C.text, transform: [{ translateX: Animated.multiply(x, seg + 4) }] }} />
      ) : null}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => { if (!on) { haptic(); onChange(o.key); } }} style={{ flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on && seg === 0 ? C.text : 'transparent' }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: on ? C.bg : C.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const v = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.spring(v, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 8 }).start(); }, [value, v]);
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => { haptic(); onChange(!value); }} hitSlop={8}>
      <Animated.View style={{ width: 52, height: 32, borderRadius: 16, padding: 4, backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [C.line2, C.lime] }) }}>
        <Animated.View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value ? C.bg : C.dim, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
      </Animated.View>
    </Pressable>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} /></Pressable>
        <View style={{ backgroundColor: '#121310', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.line2, padding: 20, paddingBottom: 20 + ins.bottom, gap: 14, maxHeight: '88%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line3 }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <T.Display style={{ fontSize: 22 }}>{title}</T.Display>
            <IconBtn name="close" label="Close" onPress={onClose} />
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Stat({ label, value, sub, subColor = C.muted }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <Card style={{ flex: 1, padding: 14, gap: 6 }}>
      <T.Label style={{ fontSize: 13 }}>{label}</T.Label>
      <T.Num style={{ fontSize: 24 }}>{value}</T.Num>
      {sub ? <T.Small style={{ color: subColor }}>{sub}</T.Small> : null}
    </Card>
  );
}

export function ListRow({ title, sub, right, onPress, first }: { title: string; sub?: string; right?: ReactNode; onPress?: () => void; first?: boolean }) {
  const inner = (
    <Row style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: '#21221C' }} gap={12}>
      <View style={{ flex: 1, gap: 2 }}>
        <T.Body>{title}</T.Body>
        {sub ? <T.Small style={{ color: C.dim }}>{sub}</T.Small> : null}
      </View>
      {right}
    </Row>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: C.card2 }}>{inner}</Pressable> : inner;
}

const s = StyleSheet.create({
  label: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  display: { fontFamily: F.display, fontSize: 30, color: C.text, letterSpacing: -0.5 },
  num: { fontFamily: F.display, fontSize: 32, color: C.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  body: { fontFamily: F.body, fontSize: 16, color: C.text, lineHeight: 23 },
  small: { fontFamily: F.medium, fontSize: 14, color: C.muted, lineHeight: 20 },
  strong: { fontFamily: F.bold, fontSize: 16, color: C.text },
  mono: { fontFamily: F.semibold, fontSize: 14, color: C.text2, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 18, gap: 12 },
  cardOrange: { backgroundColor: C.orangeSoft, borderColor: C.orangeLine },
  cardLime: { backgroundColor: C.lime, borderColor: C.lime },
  cardGreen: { backgroundColor: '#161A10', borderColor: '#2C3320' },
});
