import React, { memo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import { AnimSpec, Ink, Prim, scene } from '../lib/anim';
import { useClock } from '../lib/hooks';
import { C, F } from '../lib/theme';

const INK: Record<Ink, string> = {
  body: C.text, body2: '#8F8F83', arm: C.text2, arm2: '#77776D', accent: C.lime, gear: C.lime,
  static: C.line3, static2: C.faint, muted: C.faint,
};

function draw(prims: Prim[], ink = INK) {
  return prims.map((p, i) => {
    if (p.k === 'line') return <Line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={ink[p.c]} strokeWidth={p.w} strokeLinecap="round" opacity={p.o ?? 1} />;
    if (p.k === 'circle') return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill ? ink[p.fill] : 'none'} stroke={p.stroke ? ink[p.stroke] : undefined} strokeWidth={p.w ?? 0} opacity={p.o ?? 1} />;
    if (p.k === 'rect') return <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={ink[p.fill]} />;
    return <Path key={i} d={p.d} stroke={ink[p.stroke]} strokeWidth={p.w} fill="none" opacity={p.o ?? 1} />;
  });
}

function Frame({ spec, sec, width, labels = true, grid = true }: { spec: AnimSpec; sec: number; width: number; labels?: boolean; grid?: boolean }) {
  const h = 180;
  const scale = width / 312;
  const { prims, phase, progress } = scene(spec, sec);
  const lab = spec.labels ?? [];
  return (
    <View style={{ width, height: h * scale, borderRadius: Math.max(10, 18 * scale), overflow: 'hidden', backgroundColor: '#0F100D', borderWidth: 1, borderColor: '#21221C' }}>
      <Svg width={width} height={h * scale} viewBox={`0 0 312 ${h}`}>
        {grid ? (
          <>
            <Defs>
              <Pattern id="g" width={16} height={16} patternUnits="userSpaceOnUse">
                <Path d="M16 0H0V16" stroke="#1A1B16" strokeWidth={1} fill="none" />
              </Pattern>
            </Defs>
            <Rect width={312} height={h} fill="url(#g)" />
          </>
        ) : null}
        <Line x1={16} y1={160} x2={296} y2={160} stroke={C.line2} strokeWidth={2} />
        {draw(prims)}
      </Svg>
      {labels && lab.length ? (
        <>
          <View style={{ position: 'absolute', left: 10, top: 10, flexDirection: 'row', gap: 6 }}>
            {lab.map((l, i) => (
              <Text key={i} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(13,14,11,0.85)', fontFamily: F.monoBold, fontSize: 10, letterSpacing: 0.8, color: i === lab.length - 1 && lab.length > 1 ? C.lime : C.text, opacity: spec.hold || phase === i ? 1 : 0.3 }}>{l}</Text>
            ))}
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: '#1A1B16' }}>
            <View style={{ height: 3, width: `${progress * 100}%`, backgroundColor: C.lime }} />
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Live, looping posture animation. */
export function ExerciseAnim({ spec, width = 312 }: { spec: AnimSpec; width?: number }) {
  const t = useClock(true);
  return <Frame spec={spec} sec={t} width={width} />;
}

/** Static thumbnail (bottom / turnaround position) — cheap for long lists. */
export const ExerciseThumb = memo(function ExerciseThumb({ spec, width = 96 }: { spec: AnimSpec; width?: number }) {
  return <Frame spec={spec} sec={(spec.ab ?? 1.2) - 0.001} width={width} labels={false} grid={false} />;
});
