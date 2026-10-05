import { ReactNode } from 'react';
import { ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { haptic, Icon, Press } from './ui';
import { DAY_KEYS, DayKey, PROGRAM } from '../lib/plan';
import { C, F } from '../lib/theme';

const DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dayDow(k: DayKey): string {
  return DOW3[PROGRAM[k].weekday];
}

/** Small rounded tag. Text is shown exactly as given (no case changes). */
export function Chip({ text, tone = 'grey', style }: { text: string; tone?: 'grey' | 'lime' | 'solid' | 'outline'; style?: StyleProp<ViewStyle> }) {
  const bg = { grey: C.card2, lime: C.limeSoft, solid: C.lime, outline: 'transparent' }[tone];
  const fg = { grey: C.text2, lime: C.lime, solid: C.bg, outline: C.muted }[tone];
  return (
    <View style={[{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: bg, borderWidth: tone === 'outline' ? 1 : 0, borderColor: C.line3, alignSelf: 'flex-start' }, style]}>
      <Text style={{ color: fg, fontFamily: F.bold, fontSize: 12.5 }}>{text}</Text>
    </View>
  );
}

/** Small section heading used across the workout screens. */
export function Section({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>{children}</Text>
      {right}
    </View>
  );
}

/**
 * Horizontal chip row of the six training days.
 * Single select: pass `value`. Multi select (add to several days): pass `selected` and the chips show a tick.
 */
export function DayChips({ value, selected, onPress, padded = false }: { value?: DayKey; selected?: DayKey[]; onPress: (k: DayKey) => void; padded?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: padded ? 0 : -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      {DAY_KEYS.map((k) => {
        const d = PROGRAM[k];
        const on = value ? value === k : !!selected?.includes(k);
        const multi = !value && !!selected;
        return (
          <Press key={k} onPress={() => { haptic(); onPress(k); }} scaleTo={0.94}
            accessibilityLabel={`${dayDow(k)} ${d.name}`}
            style={{ minWidth: 92, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: on ? C.lime : C.card, borderWidth: 1, borderColor: on ? C.lime : C.line, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 12, color: on ? C.bg : C.dim }}>{dayDow(k)}</Text>
              {multi ? <Icon name={on ? 'check' : 'plus'} size={13} color={on ? C.bg : C.lime} width={2.6} /> : null}
            </View>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? C.bg : C.text }}>{d.name}</Text>
          </Press>
        );
      })}
    </ScrollView>
  );
}
