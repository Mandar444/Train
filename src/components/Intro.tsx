import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { C, F } from '../lib/theme';

/**
 * Opening sequence (~5.5 s): a fast sporty montage of stick-figure scenes with
 * colour cuts — jumping jacks, a basketball jump shot, a barbell clean & press,
 * a sprint — then a lime wipe that reveals the GOAL wordmark "by Mandar".
 * Tap anywhere to skip.
 */

type P = [number, number];
type Body = { head: P; sh: P; hip: P; eL: P; hL: P; eR: P; hR: P; kL: P; fL: P; kR: P; fR: P };

const SCENE = 0.95; // seconds per sport
const LOGO_AT = SCENE * 4; // 1.68 s
const END = LOGO_AT + 1.6; // hold the logo
const FADE = 0.4;

const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mix = (A: Body, B: Body, t: number): Body => {
  const o = {} as Body;
  (Object.keys(A) as (keyof Body)[]).forEach((k) => { o[k] = lerp(A[k], B[k], t); });
  return o;
};
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const back = (x: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ---- poses (200 × 200 box, ground at y = 170) ----
const JJ_A: Body = { head: [100, 52], sh: [100, 68], hip: [100, 110], eL: [94, 88], hL: [92, 108], eR: [106, 88], hR: [108, 108], kL: [97, 140], fL: [96, 170], kR: [103, 140], fR: [104, 170] };
const JJ_B: Body = { head: [100, 40], sh: [100, 56], hip: [100, 98], eL: [80, 42], hL: [70, 24], eR: [120, 42], hR: [130, 24], kL: [88, 128], fL: [76, 158], kR: [112, 128], fR: [124, 158] };

const BB_A: Body = { head: [72, 86], sh: [74, 100], hip: [68, 132], eL: [84, 116], hL: [92, 124], eR: [86, 114], hR: [94, 122], kL: [86, 148], fL: [74, 170], kR: [84, 150], fR: [70, 170] };
const BB_B: Body = { head: [78, 40], sh: [78, 56], hip: [74, 96], eL: [86, 36], hL: [92, 18], eR: [88, 38], hR: [94, 20], kL: [82, 126], fL: [76, 156], kR: [78, 128], fR: [70, 158] };

const GY_A: Body = { head: [100, 94], sh: [100, 108], hip: [100, 128], eL: [86, 126], hL: [82, 146], eR: [114, 126], hR: [118, 146], kL: [88, 148], fL: [86, 170], kR: [112, 148], fR: [114, 170] };
const GY_M: Body = { head: [100, 56], sh: [100, 72], hip: [100, 112], eL: [80, 82], hL: [80, 68], eR: [120, 82], hR: [120, 68], kL: [94, 140], fL: [90, 170], kR: [106, 140], fR: [110, 170] };
const GY_B: Body = { head: [100, 52], sh: [100, 68], hip: [100, 110], eL: [82, 50], hL: [80, 28], eR: [118, 50], hR: [120, 28], kL: [96, 140], fL: [90, 170], kR: [104, 140], fR: [110, 170] };

const RN_A: Body = { head: [108, 50], sh: [104, 66], hip: [98, 106], eL: [90, 84], hL: [80, 96], eR: [116, 78], hR: [126, 64], kL: [120, 120], fL: [112, 146], kR: [86, 132], fR: [70, 150] };
const RN_B: Body = { head: [108, 54], sh: [104, 70], hip: [98, 110], eL: [116, 82], hL: [126, 68], eR: [90, 88], hR: [80, 100], kL: [86, 136], fL: [70, 152], kR: [120, 124], fR: [112, 150] };

function Figure({ b, color, w = 1 }: { b: Body; color: string; w?: number }) {
  const L = (a: P, c: P, s: number) => <Line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke={color} strokeWidth={s * w} strokeLinecap="round" />;
  return (
    <G>
      {L(b.hip, b.kR, 9)}{L(b.kR, b.fR, 8)}
      {L(b.sh, b.eR, 6.5)}{L(b.eR, b.hR, 6)}
      {L(b.hip, b.sh, 11)}
      <Circle cx={b.head[0]} cy={b.head[1]} r={10.5} fill={color} />
      {L(b.hip, b.kL, 9)}{L(b.kL, b.fL, 8)}
      {L(b.sh, b.eL, 6.5)}{L(b.eL, b.hL, 6)}
    </G>
  );
}

export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [t, setT] = useState(0);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const s = (Date.now() - t0) / 1000;
      setT(s);
      if (s < END + FADE) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene = Math.min(4, Math.floor(t / SCENE));
  const st = clamp((t - scene * SCENE) / SCENE); // 0..1 inside scene
  const punch = 1 + 0.08 * Math.max(0, 1 - st * 4); // camera punch-in on each cut
  const size = Math.min(width, height) * 0.92;

  // ---- per-scene look ----
  let bg = C.lime, fg = C.bg, body: Body = JJ_A, extra: React.ReactNode = null, label = '';
  if (scene === 0) {
    // jumping jacks on lime, 1.5 reps
    const ph = (st * 2) % 1;
    body = mix(JJ_A, JJ_B, ease(ph < 0.5 ? ph * 2 : 2 - ph * 2));
    bg = C.lime; fg = C.bg; label = 'JUMP';
    extra = <Rect x={60} y={171} width={80} height={3} rx={1.5} fill={C.bg} opacity={0.25} />;
  } else if (scene === 1) {
    // basketball jump shot, dark court, orange ball
    const k = ease(clamp(st / 0.55));
    body = mix(BB_A, BB_B, k);
    bg = C.bg; fg = C.text; label = 'SHOOT';
    const rel = clamp((st - 0.45) / 0.55);
    const start: P = [94, 18];
    const end: P = [164, 64];
    const ball: P = st < 0.45 ? [body.hR[0] + 4, body.hR[1] - 6] : [start[0] + (end[0] - start[0]) * rel, start[1] + (end[1] - start[1]) * rel - Math.sin(rel * Math.PI) * 30];
    extra = (
      <G>
        <Line x1={182} y1={36} x2={182} y2={84} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
        <Line x1={152} y1={64} x2={178} y2={64} stroke={C.orange} strokeWidth={4} strokeLinecap="round" />
        {[156, 162, 168, 174].map((x) => <Line key={x} x1={x} y1={66} x2={x + 2} y2={82} stroke={C.muted} strokeWidth={1.5} />)}
        <Circle cx={ball[0]} cy={ball[1]} r={8} fill={C.orange} />
        {rel > 0.95 ? <Circle cx={165} cy={64} r={14 + (rel - 0.95) * 200} stroke={C.orange} strokeWidth={2} fill="none" opacity={1 - (rel - 0.95) * 20} /> : null}
      </G>
    );
  } else if (scene === 2) {
    // barbell clean & press on orange
    body = st < 0.5 ? mix(GY_A, GY_M, ease(st / 0.5)) : mix(GY_M, GY_B, ease((st - 0.5) / 0.5));
    bg = C.orange; fg = C.bg; label = 'LIFT';
    const yb = (body.hL[1] + body.hR[1]) / 2;
    extra = (
      <G>
        <Line x1={44} y1={yb} x2={156} y2={yb} stroke={C.bg} strokeWidth={4} strokeLinecap="round" />
        <Rect x={44} y={yb - 16} width={9} height={32} rx={3} fill={C.bg} />
        <Rect x={147} y={yb - 16} width={9} height={32} rx={3} fill={C.bg} />
        <Rect x={55} y={yb - 11} width={6} height={22} rx={2} fill={C.bg} />
        <Rect x={139} y={yb - 11} width={6} height={22} rx={2} fill={C.bg} />
      </G>
    );
  } else if (scene === 3) {
    // sprint on dark, lime runner with speed lines
    const ph = (st * 4) % 1;
    body = mix(RN_A, RN_B, ease(ph < 0.5 ? ph * 2 : 2 - ph * 2));
    const bob = Math.sin(st * Math.PI * 8) * 2;
    body = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, [v[0] + st * 40, v[1] + bob]])) as unknown as Body;
    bg = C.bg; fg = C.lime; label = 'RUN';
    extra = (
      <G>
        {[60, 90, 120, 145].map((y, i) => {
          const x = 200 - ((st * 520 + i * 70) % 260);
          return <Line key={y} x1={x} y1={y} x2={x + 36} y2={y} stroke={C.lime} strokeWidth={3} strokeLinecap="round" opacity={0.45} />;
        })}
        <Line x1={10} y1={171} x2={190} y2={171} stroke={C.line3} strokeWidth={2} />
      </G>
    );
  }

  // ---- logo phase ----
  const lt = t - LOGO_AT;
  const wipe = clamp(lt / 0.45);
  const letters = ['G', 'O', 'A', 'L'];
  const fade = clamp((t - END) / FADE);
  const R = Math.hypot(width, height);

  return (
    <Pressable onPress={finish} style={[StyleSheet.absoluteFill, { opacity: 1 - fade, zIndex: 999 }]} accessibilityLabel="Skip intro">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: lt >= 0 && wipe >= 1 ? C.lime : bg, alignItems: 'center', justifyContent: 'center' }]}>
        {lt < 0.45 ? (
          <View style={{ transform: [{ scale: punch }] }}>
            <Svg width={size} height={size} viewBox="0 0 200 200">
              {extra}
              <Figure b={body} color={fg} />
            </Svg>
            <Text style={{ position: 'absolute', left: 0, right: 0, bottom: size * 0.02, textAlign: 'center', fontFamily: F.display, fontSize: 32, letterSpacing: 4, color: fg, opacity: 0.9 * clamp(st * 4) }}>{label}</Text>
          </View>
        ) : null}

        {lt >= 0 ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <View style={{ position: 'absolute', width: R * 2 * wipe, height: R * 2 * wipe, borderRadius: R * wipe, backgroundColor: C.lime }} />
            {lt > 0.2 ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', transform: [{ skewX: '-12deg' }] }}>
                  {letters.map((ch, i) => {
                    const p = clamp((lt - 0.25 - i * 0.13) / 0.35);
                    const s = p === 0 ? 0 : back(p);
                    return (
                      <Text key={ch} style={{ fontFamily: 'Anton_400Regular', fontSize: Math.min(width * 0.34, 170), lineHeight: Math.min(width * 0.34, 170) * 1.25, includeFontPadding: false, color: C.bg, opacity: p > 0 ? 1 : 0, transform: [{ translateY: (1 - p) * 40 }, { scale: 0.6 + 0.4 * s }] }}>{ch}</Text>
                    );
                  })}
                </View>
                <Text style={{ marginTop: 4, fontFamily: F.bold, fontSize: 16, letterSpacing: 4, color: C.bg, opacity: clamp((lt - 0.95) / 0.3), transform: [{ translateY: (1 - clamp((lt - 0.95) / 0.3)) * 10 }] }}>BY MANDAR</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {lt < 0 ? <Text style={{ position: 'absolute', bottom: 48, left: 0, right: 0, textAlign: 'center', fontFamily: F.semibold, fontSize: 13, color: fg, opacity: 0.55 }}>Tap to skip</Text> : null}
    </Pressable>
  );
}
