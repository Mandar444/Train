import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Bar, haptic, Icon, IconName, Press, T } from './ui';
import { C, F } from '../lib/theme';

const CARD = { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22 } as const;

/** Small lime-tinted rounded square holding an icon. */
export function IconTile({ name, size = 36, dim = false, solid = false }: { name: IconName; size?: number; dim?: boolean; solid?: boolean }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.32, alignItems: 'center', justifyContent: 'center',
      backgroundColor: solid ? C.lime : dim ? C.card2 : C.limeSoft,
    }}>
      <Icon name={name} size={size * 0.52} color={solid ? C.bg : dim ? C.faint : C.lime} width={2.2} />
    </View>
  );
}

export function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
      <T.Strong style={{ fontSize: 18 }}>{title}</T.Strong>
      {sub ? <T.Small style={{ fontSize: 13, color: C.dim }}>{sub}</T.Small> : null}
    </View>
  );
}

/** Grid stat card. When `value` is null, shows `empty` as a call to action instead of a dash. */
export function StatCard({ icon, label, value, unit, sub, empty, highlight = false, onPress }: {
  icon: IconName; label: string; value: string | null; unit?: string; sub?: string; empty: string; highlight?: boolean; onPress?: () => void;
}) {
  const has = value != null;
  const body = (
    <View style={[CARD, { flex: 1, padding: 14, gap: 10, minHeight: 138 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile name={icon} dim={!has} />
        {onPress ? <Icon name="chevron" size={16} color={C.faint} /> : null}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 13, color: C.muted }}>{label}</Text>
      {has ? (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: 28, letterSpacing: -0.5, color: highlight ? C.lime : C.text, flexShrink: 1 }}>{value}</Text>
            {unit ? <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.dim }}>{unit}</Text> : null}
          </View>
          {sub ? <Text numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: C.dim }}>{sub}</Text> : null}
        </View>
      ) : (
        <Text numberOfLines={3} style={{ fontFamily: F.semibold, fontSize: 13, lineHeight: 18, color: C.text2 }}>{empty}</Text>
      )}
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{body}</View>;
  return <Press style={{ flex: 1 }} scaleTo={0.97} onPress={() => { haptic(); onPress(); }}>{body}</Press>;
}

/** Static mini line chart. No animation, so no per-frame work. */
export function Sparkline({ values, width, height }: { values: number[]; width: number; height: number }) {
  if (values.length < 2) {
    return (
      <View style={{ width, height, justifyContent: 'center' }}>
        <View style={{ height: 2, borderRadius: 1, backgroundColor: C.line2 }} />
      </View>
    );
  }
  const top = Math.max(...values);
  const bot = Math.min(...values);
  const pad = 4;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => (top === bot ? height / 2 : pad + ((top - v) / (top - bot)) * (height - pad * 2));
  const p = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lx = x(values.length - 1);
  const ly = y(values[values.length - 1]);
  return (
    <Svg width={width} height={height}>
      <Polyline points={p} fill="none" stroke={C.lime} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lx} cy={ly} r={3.5} fill={C.lime} />
    </Svg>
  );
}

export function LiftCard({ name, best, gain, sessions, history, onPress }: {
  name: string; best: number; gain: number; sessions: number; history: number[]; onPress: () => void;
}) {
  const W = 168;
  return (
    <Press scaleTo={0.96} onPress={() => { haptic(); onPress(); }} style={{ width: W }}>
      <View style={[CARD, { padding: 14, gap: 10, height: 178 }]}>
        <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 14, lineHeight: 18, color: C.text, minHeight: 36 }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 30, letterSpacing: -0.5, color: C.text }}>{+best.toFixed(2)}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.dim }}>kg</Text>
        </View>
        <Sparkline values={history} width={W - 30} height={30} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: gain > 0 ? C.limeSoft : C.card2 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: gain > 0 ? C.lime : C.dim }}>{gain > 0 ? `+${+gain.toFixed(2)} kg` : 'Holding'}</Text>
          </View>
          <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: C.faint }}>{sessions} {sessions === 1 ? 'session' : 'sessions'}</Text>
        </View>
      </View>
    </Press>
  );
}

export type MilestoneState = 'reached' | 'current' | 'locked';

export function MilestoneCard({ name, kg, what, state, pct, note }: {
  name: string; kg: string; what: string; state: MilestoneState; pct?: number; note?: string;
}) {
  const reached = state === 'reached';
  const current = state === 'current';
  const locked = state === 'locked';
  return (
    <View style={[CARD, {
      width: 200, padding: 16, gap: 10, minHeight: 196,
      backgroundColor: reached ? '#161A10' : C.card,
      borderColor: current ? C.lime : reached ? '#2C3320' : C.line,
    }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile name={reached ? 'check' : locked ? 'lock' : 'flame'} size={32} solid={reached} dim={locked} />
        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: reached || current ? C.lime : C.faint }}>
          {reached ? 'Reached' : current ? 'Up next' : 'Locked'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 34, letterSpacing: -0.5, color: locked ? C.faint : reached ? C.lime : C.text }}>{kg}</Text>
        <Text style={{ fontFamily: F.semibold, fontSize: 13, color: locked ? C.faint : C.dim }}>kg</Text>
      </View>
      <View style={{ gap: 3, flex: 1 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: locked ? C.dim : C.text }}>{name}</Text>
        <Text numberOfLines={3} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: locked ? C.faint : C.dim }}>{what}</Text>
      </View>
      {current && pct != null ? (
        <View style={{ gap: 6 }}>
          <Bar pct={pct} height={6} delay={300} />
          {note ? <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: C.text2 }}>{note}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function ShortcutTile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Press style={{ flex: 1 }} scaleTo={0.96} onPress={() => { haptic(); onPress(); }}>
      <View style={[CARD, { padding: 14, gap: 12, minHeight: 124 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconTile name={icon} size={40} />
          <Icon name="chevron" size={16} color={C.faint} />
        </View>
        <View style={{ gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{title}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: C.dim }}>{sub}</Text>
        </View>
      </View>
    </Press>
  );
}

export function Grid2({ children }: { children: ReactNode }) {
  const items = React.Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {r}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
