import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import type { AnimKey } from '../lib/plan';
import { useClock } from '../lib/hooks';
import { C, F } from '../lib/theme';

type P = [number, number];
type Pose = { head: P; sh: P; el: P; ha: P; hip: P; kn: P; ft: P };
type Gear = { kind: 'plateHand' | 'plateFoot' | 'plateShoulder' | 'dumbbell' | 'cable'; anchor?: P };
type Def = {
  a: Pose; b: Pose;
  ab: number; ba: number; // seconds for A→B and B→A
  labels: [string, string];
  statics: [number, number, number, number, number][]; // x1,y1,x2,y2,width
  gear: Gear[];
};

const stand = (dx = 0): Pick<Pose, 'head' | 'sh' | 'hip' | 'kn' | 'ft'> => ({ head: [150 + dx, 26], sh: [148 + dx, 44], hip: [148 + dx, 92], kn: [150 + dx, 128], ft: [150 + dx, 164] });

const DEFS: Record<AnimKey, Def> = {
  legpress: {
    a: { head: [71, 69], sh: [80, 86], el: [95, 108], ha: [110, 128], hip: [110, 130], kn: [155, 104], ft: [200, 78] },
    b: { head: [71, 69], sh: [80, 86], el: [95, 108], ha: [110, 128], hip: [110, 130], kn: [123.5, 80], ft: [175, 89] },
    ab: 2, ba: 1, labels: ['LOWER · 2S', 'PUSH · 1S'],
    statics: [[150, 102, 292, 42, 6], [150, 102, 150, 164, 5], [268, 52, 268, 164, 5], [94, 140, 64, 76, 10], [94, 142, 132, 144, 10], [110, 146, 110, 164, 5]],
    gear: [{ kind: 'plateFoot' }],
  },
  squat: {
    a: { ...stand(), el: [136, 58], ha: [140, 44] },
    b: { head: [168, 64], sh: [160, 80], el: [146, 92], ha: [152, 82], hip: [124, 120], kn: [184, 128], ft: [150, 164] },
    ab: 2, ba: 1, labels: ['DOWN · 2S', 'DRIVE UP · 1S'],
    statics: [[96, 52, 96, 164, 5], [210, 52, 210, 164, 5]],
    gear: [{ kind: 'plateShoulder' }],
  },
  bench: {
    a: { head: [70, 104], sh: [94, 108], el: [96, 84], ha: [98, 58], hip: [168, 112], kn: [204, 100], ft: [222, 146] },
    b: { head: [70, 104], sh: [94, 108], el: [84, 120], ha: [104, 96], hip: [168, 112], kn: [204, 100], ft: [222, 146] },
    ab: 2, ba: 1, labels: ['LOWER · 2S', 'PRESS · 1S'],
    statics: [[56, 122, 196, 122, 9], [80, 122, 80, 164, 5], [180, 122, 180, 164, 5], [70, 40, 70, 122, 4]],
    gear: [{ kind: 'plateHand' }],
  },
  pulldown: {
    a: { head: [120, 62], sh: [122, 80], el: [130, 50], ha: [136, 24], hip: [128, 130], kn: [170, 128], ft: [172, 164] },
    b: { head: [116, 64], sh: [120, 82], el: [112, 104], ha: [142, 80], hip: [128, 130], kn: [170, 128], ft: [172, 164] },
    ab: 1, ba: 2, labels: ['PULL · 1S', 'CONTROL UP · 2S'],
    statics: [[100, 140, 160, 140, 9], [130, 140, 130, 164, 5], [156, 120, 176, 120, 7], [136, 6, 240, 6, 5], [240, 6, 240, 164, 5]],
    gear: [{ kind: 'cable', anchor: [136, 8] }],
  },
  rdl: {
    a: { ...stand(), el: [150, 66], ha: [152, 90] },
    b: { head: [198, 76], sh: [180, 82], el: [180, 106], ha: [178, 128], hip: [120, 92], kn: [156, 126], ft: [150, 164] },
    ab: 2, ba: 1, labels: ['HINGE · 2S', 'HIPS THROUGH · 1S'],
    statics: [],
    gear: [{ kind: 'plateHand' }],
  },
  curl: {
    a: { ...stand(), el: [150, 72], ha: [154, 100] },
    b: { ...stand(), el: [150, 72], ha: [168, 50] },
    ab: 1, ba: 2, labels: ['CURL · 1S', 'LOWER · 2S'],
    statics: [],
    gear: [{ kind: 'dumbbell' }],
  },
  triceps: {
    a: { ...stand(), el: [152, 74], ha: [160, 102] },
    b: { ...stand(), el: [152, 74], ha: [176, 58] },
    ab: 2, ba: 1, labels: ['UP SLOW · 2S', 'PUSH DOWN · 1S'],
    statics: [[204, 6, 204, 164, 5], [190, 6, 216, 6, 5]],
    gear: [{ kind: 'cable', anchor: [200, 10] }],
  },
  ohp: {
    a: { head: [150, 46], sh: [148, 62], el: [152, 36], ha: [152, 12], hip: [148, 108], kn: [150, 136], ft: [150, 164] },
    b: { head: [150, 46], sh: [148, 62], el: [148, 84], ha: [160, 62], hip: [148, 108], kn: [150, 136], ft: [150, 164] },
    ab: 2, ba: 1, labels: ['LOWER · 2S', 'PRESS · 1S'],
    statics: [],
    gear: [{ kind: 'dumbbell' }],
  },
  row: {
    a: { head: [116, 70], sh: [118, 88], el: [98, 106], ha: [140, 108], hip: [122, 134], kn: [160, 120], ft: [192, 130] },
    b: { head: [136, 74], sh: [132, 90], el: [160, 100], ha: [188, 108], hip: [122, 134], kn: [160, 120], ft: [192, 130] },
    ab: 2, ba: 1, labels: ['REACH · 2S', 'ROW · 1S'],
    statics: [[96, 144, 150, 144, 9], [120, 144, 120, 164, 5], [200, 118, 200, 142, 7], [252, 104, 252, 164, 5]],
    gear: [{ kind: 'cable', anchor: [250, 108] }],
  },
  preacher: {
    a: { head: [122, 52], sh: [130, 70], el: [166, 102], ha: [158, 70], hip: [126, 130], kn: [162, 140], ft: [164, 164] },
    b: { head: [122, 52], sh: [130, 70], el: [166, 102], ha: [194, 124], hip: [126, 130], kn: [162, 140], ft: [164, 164] },
    ab: 2, ba: 1, labels: ['LOWER · 2S', 'CURL · 1S'],
    statics: [[140, 86, 180, 116, 10], [176, 116, 176, 164, 5], [104, 140, 150, 140, 9], [126, 140, 126, 164, 5]],
    gear: [{ kind: 'dumbbell' }],
  },
};

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function ExerciseAnim({ kind, width = 312 }: { kind: AnimKey; width?: number }) {
  const def = DEFS[kind];
  const t = useClock(true);
  const cycle = def.ab + def.ba;
  const c = t % cycle;
  const inAB = c < def.ab;
  const k = inAB ? ease(c / def.ab) : 1 - ease((c - def.ab) / def.ba);
  const J = Object.fromEntries((Object.keys(def.a) as (keyof Pose)[]).map((j) => [j, lerp(def.a[j], def.b[j], k)])) as Pose;
  const h = 180;
  const scale = width / 312;
  const limb = (a: P, b: P, w: number, col: string) => <Line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={w} strokeLinecap="round" />;

  const gear = def.gear.map((g, i) => {
    if (g.kind === 'plateHand' || g.kind === 'plateShoulder') {
      const at = g.kind === 'plateHand' ? J.ha : J.sh;
      return (
        <React.Fragment key={i}>
          <Circle cx={at[0]} cy={at[1]} r={16} stroke={C.lime} strokeWidth={4} fill="none" />
          <Circle cx={at[0]} cy={at[1]} r={8} stroke={C.lime} strokeWidth={3} fill="none" opacity={0.6} />
        </React.Fragment>
      );
    }
    if (g.kind === 'plateFoot') {
      const f = J.ft;
      return (
        <React.Fragment key={i}>
          <Line x1={f[0] + 4} y1={f[1] - 2} x2={f[0] + 44} y2={f[1] - 19} stroke={C.faint} strokeWidth={5} strokeLinecap="round" />
          <Circle cx={f[0] + 48} cy={f[1] - 21} r={16} stroke={C.lime} strokeWidth={4} fill="none" />
          <Circle cx={f[0] + 48} cy={f[1] - 21} r={8} stroke={C.lime} strokeWidth={3} fill="none" opacity={0.6} />
          <Line x1={f[0] - 6} y1={f[1] - 22} x2={f[0] + 12} y2={f[1] + 21} stroke={C.muted} strokeWidth={7} strokeLinecap="round" />
        </React.Fragment>
      );
    }
    if (g.kind === 'dumbbell') {
      const hnd = J.ha;
      return (
        <React.Fragment key={i}>
          <Line x1={hnd[0] - 10} y1={hnd[1]} x2={hnd[0] + 10} y2={hnd[1]} stroke={C.lime} strokeWidth={4} strokeLinecap="round" />
          <Rect x={hnd[0] - 14} y={hnd[1] - 7} width={6} height={14} rx={2} fill={C.lime} />
          <Rect x={hnd[0] + 8} y={hnd[1] - 7} width={6} height={14} rx={2} fill={C.lime} />
        </React.Fragment>
      );
    }
    // cable
    const an = g.anchor!;
    return (
      <React.Fragment key={i}>
        <Circle cx={an[0]} cy={an[1]} r={6} fill={C.line3} />
        <Line x1={an[0]} y1={an[1]} x2={J.ha[0]} y2={J.ha[1]} stroke={C.faint} strokeWidth={2} />
        <Line x1={J.ha[0] - 12} y1={J.ha[1]} x2={J.ha[0] + 12} y2={J.ha[1]} stroke={C.lime} strokeWidth={5} strokeLinecap="round" />
      </React.Fragment>
    );
  });

  const phaseP = inAB ? (c / def.ab) * (def.ab / cycle) : def.ab / cycle + ((c - def.ab) / def.ba) * (def.ba / cycle);

  return (
    <View style={{ width, height: h * scale, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0F100D', borderWidth: 1, borderColor: '#21221C' }}>
      <Svg width={width} height={h * scale} viewBox={`0 0 312 ${h}`}>
        <Defs>
          <Pattern id="g" width={16} height={16} patternUnits="userSpaceOnUse">
            <Path d="M16 0H0V16" stroke="#1A1B16" strokeWidth={1} fill="none" />
          </Pattern>
        </Defs>
        <Rect width={312} height={h} fill="url(#g)" />
        <Line x1={20} y1={164} x2={292} y2={164} stroke={C.line2} strokeWidth={2} />
        {def.statics.map((s, i) => <Line key={i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} stroke={i === 0 && kind === 'legpress' ? C.line2 : C.line3} strokeWidth={s[4]} strokeLinecap="round" />)}
        {gear.filter((_, i) => def.gear[i].kind === 'plateFoot')}
        {limb(J.hip, J.sh, 11, C.text)}
        <Circle cx={J.head[0]} cy={J.head[1]} r={11} fill={C.text} />
        {limb(J.hip, J.kn, 11, C.text)}
        {limb(J.kn, J.ft, 9, C.text)}
        <Line x1={J.ft[0] - 2} y1={J.ft[1]} x2={J.ft[0] + 10} y2={J.ft[1]} stroke={C.lime} strokeWidth={6} strokeLinecap="round" />
        {limb(J.sh, J.el, 7, C.text2)}
        {limb(J.el, J.ha, 6, C.text2)}
        {gear.filter((_, i) => def.gear[i].kind !== 'plateFoot')}
      </Svg>
      <View style={{ position: 'absolute', left: 10, top: 10, flexDirection: 'row', gap: 6 }}>
        <Text style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(13,14,11,0.85)', fontFamily: F.monoBold, fontSize: 10, letterSpacing: 0.8, color: C.text, opacity: inAB ? 1 : 0.3 }}>{def.labels[0]}</Text>
        <Text style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(13,14,11,0.85)', fontFamily: F.monoBold, fontSize: 10, letterSpacing: 0.8, color: C.lime, opacity: inAB ? 0.3 : 1 }}>{def.labels[1]}</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: '#1A1B16' }}>
        <View style={{ height: 3, width: `${phaseP * 100}%`, backgroundColor: C.lime }} />
      </View>
    </View>
  );
}
