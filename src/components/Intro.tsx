import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { FADE, END, LOGO_AT, introFrame, IPrim, IText } from '../lib/introScene';
import { F } from '../lib/theme';

/** Opening animation (~9 s): seven sport scenes, then the GOAL logo. Tap anywhere to skip. */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [t, setT] = useState(0);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

  useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const s = (now - t0) / 1000;
      setT(s);
      if (s < END + FADE) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const f = introFrame(t);
  // "cover" the 360×640 design space onto the screen
  const s = Math.max(width / 360, height / 640);
  const ox = (width - 360 * s) / 2;
  const oy = (height - 640 * s) / 2;
  const fade = Math.max(0, Math.min(1, (t - END) / FADE));

  return (
    <Pressable onPress={finish} style={[StyleSheet.absoluteFill, { zIndex: 999, opacity: 1 - fade, backgroundColor: f.bg }]} accessibilityLabel="Skip intro">
      <Svg width={width} height={height} viewBox={`${-ox / s} ${-oy / s} ${width / s} ${height / s}`} style={StyleSheet.absoluteFill}>
        {f.prims.map((p, i) => <Prim key={i} p={p} />)}
      </Svg>
      {f.texts.map((tx, i) => <Label key={i} t={tx} s={s} ox={ox} oy={oy} />)}
      {t < LOGO_AT - 0.2 ? <Text style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontFamily: F.semibold, fontSize: 13, color: f.light ? '#0D0E0B' : '#F2F1EA', opacity: 0.5 }}>Tap to skip</Text> : null}
    </Pressable>
  );
}

function Prim({ p }: { p: IPrim }) {
  const o = p.o ?? 1;
  switch (p.k) {
    case 'line': return <Line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.c} strokeWidth={p.w} strokeLinecap="round" opacity={o} strokeDasharray={p.dash} />;
    case 'circle': return <Circle cx={p.cx} cy={p.cy} r={Math.max(0, p.r)} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.w ?? 0} opacity={o} />;
    case 'rect': return <Rect x={p.x} y={p.y} width={Math.max(0, p.w)} height={Math.max(0, p.h)} rx={p.rx ?? 0} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw ?? 0} opacity={o} />;
    case 'ellipse': return <Ellipse cx={p.cx} cy={p.cy} rx={Math.max(0, p.rx)} ry={Math.max(0, p.ry)} fill={p.fill} opacity={o} />;
    default: return <Path d={p.d} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.w ?? 0} opacity={o} strokeDasharray={p.dash} />;
  }
}

function Label({ t, s, ox, oy }: { t: IText; s: number; ox: number; oy: number }) {
  const size = t.size * s;
  const box = 900;
  const x = t.x * s + ox;
  const left = t.align === 'left' ? x : t.align === 'right' ? x - box : x - box / 2;
  const family = t.font === 'logo' ? F.logo : t.font === 'black' ? F.display : F.bold;
  const lh = size * 1.25;
  // place the text baseline on t.y (approximate ascent ≈ 0.95 em)
  const top = t.y * s + oy - size * (t.font === 'logo' ? 1.07 : 0.98);
  return (
    <Text
      pointerEvents="none"
      style={{
        position: 'absolute', left, top, width: box, textAlign: t.align ?? 'center',
        fontFamily: family, fontSize: size, lineHeight: lh, color: t.color, opacity: t.o,
        letterSpacing: (t.spacing ?? 0) * s, includeFontPadding: false,
        transform: [{ scale: t.scale ?? 1 }, ...(t.skew ? [{ skewX: '-12deg' }] : [])],
      }}
    >
      {t.text}
    </Text>
  );
}
