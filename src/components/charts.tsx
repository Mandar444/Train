import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { C, F } from '../lib/theme';
import { useProgress } from '../lib/hooks';

type Pt = { x: number; y: number };
const pts = (a: Pt[]) => a.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Reveal the first fraction `p` of a polyline (smooth draw-in). */
function partial(a: Pt[], p: number): Pt[] {
  if (a.length < 2 || p >= 1) return a;
  const f = p * (a.length - 1);
  const i = Math.floor(f);
  const out = a.slice(0, i + 1);
  const t = f - i;
  if (i + 1 < a.length) out.push({ x: a[i].x + (a[i + 1].x - a[i].x) * t, y: a[i].y + (a[i + 1].y - a[i].y) * t });
  return out;
}

export function TrendChart({ daily, avg, width, height = 90, target, band, showGrid = false, animKey }: {
  daily: number[]; avg: number[]; width: number; height?: number; target?: number; band?: { startKg: number; slowPerDay: number; fastPerDay: number }; showGrid?: boolean; animKey?: unknown;
}) {
  const p = useProgress(1300, animKey);
  if (daily.length === 0) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' }}>
        <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 12 }}>Your trend line appears after the first weigh-ins</Text>
      </View>
    );
  }
  const all = [...daily, ...avg, ...(target ? [target] : [])];
  const top = Math.max(...all) + 0.4;
  const bot = Math.min(...all) - 0.4;
  const padL = showGrid ? 30 : 4;
  const W = width - padL - 6;
  const y = (v: number) => ((top - v) / (top - bot || 1)) * (height - 8) + 4;
  const x = (i: number) => padL + (daily.length === 1 ? W / 2 : (i / (daily.length - 1)) * W);
  const d = daily.map((v, i) => ({ x: x(i), y: y(v) }));
  const a = avg.map((v, i) => ({ x: x(i), y: y(v) }));
  const ap = partial(a, p);
  const last = ap[ap.length - 1];
  const area = a.length > 1 ? `${pts(ap)} ${last.x},${height} ${a[0].x},${height}` : '';
  const grid: number[] = [];
  if (showGrid) for (let g = Math.ceil(bot); g <= Math.floor(top); g++) grid.push(g);
  const n = daily.length - 1;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="af" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.lime} stopOpacity="0.28" />
          <Stop offset="1" stopColor={C.lime} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {grid.map((g) => (
        <React.Fragment key={g}>
          <Line x1={padL} x2={width} y1={y(g)} y2={y(g)} stroke="#21221C" />
          <SvgText x={0} y={y(g) + 3} fill={C.dim} fontSize={10} fontFamily={F.mono}>{g}</SvgText>
        </React.Fragment>
      ))}
      {band && n > 0 ? (
        <Polygon points={`${x(0)},${y(band.startKg)} ${x(n)},${y(band.startKg - band.slowPerDay * n)} ${x(n)},${y(band.startKg - band.fastPerDay * n)}`} fill="rgba(212,255,79,0.07)" />
      ) : null}
      {target !== undefined ? (
        <>
          <Line x1={padL} x2={width} y1={y(target)} y2={y(target)} stroke={C.line3} strokeDasharray="3 4" />
          <SvgText x={width - 2} y={y(target) - 5} fill={C.dim} fontSize={10} fontFamily={F.mono} textAnchor="end">{`${target} KG`}</SvgText>
        </>
      ) : null}
      {area ? <Polygon points={area} fill="url(#af)" opacity={p} /> : null}
      {showGrid
        ? d.map((q, i) => <Circle key={i} cx={q.x} cy={q.y} r={3} fill="#6A6B60" opacity={i / n <= p || n === 0 ? 1 : 0} />)
        : <Polyline points={pts(partial(d, p))} fill="none" stroke={C.faint} strokeWidth={1.5} strokeLinejoin="round" />}
      <Polyline points={pts(ap)} fill="none" stroke={C.lime} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      {last ? <Circle cx={last.x} cy={last.y} r={5} fill={C.lime} stroke={C.card} strokeWidth={3} /> : null}
    </Svg>
  );
}

export function Bars({ values, labels, target, width, height = 140, highlightLast = true, format, max: maxIn }: {
  values: (number | null)[]; labels: string[]; target?: number; width: number; height?: number; highlightLast?: boolean; format?: (v: number) => string; max?: number;
}) {
  const p = useProgress(900, values.join(','));
  const max = maxIn ?? (Math.max(target ?? 0, ...values.map((v) => v ?? 0)) * 1.12 || 1);
  const labelH = 16;
  const H = height - labelH - 18;
  const gap = 8;
  const bw = (width - gap * (values.length - 1)) / values.length;
  return (
    <Svg width={width} height={height}>
      {target ? <Line x1={0} x2={width} y1={18 + H - (target / max) * H} y2={18 + H - (target / max) * H} stroke={C.faint} strokeDasharray="4 4" /> : null}
      {values.map((v, i) => {
        const val = v ?? 0;
        const h = Math.max(v ? 4 : 0, (val / max) * H * p);
        const isLast = highlightLast && i === values.length - 1;
        const hit = target ? val >= target : true;
        const x = i * (bw + gap);
        return (
          <React.Fragment key={i}>
            {v != null ? (
              <SvgText x={x + bw / 2} y={18 + H - h - 5} fill={C.muted} fontSize={10} fontFamily={F.mono} textAnchor="middle">
                {format ? format(val) : String(Math.round(val))}
              </SvgText>
            ) : null}
            <Rect x={x} y={18 + H - h} width={bw} height={h} rx={Math.min(8, bw / 3)}
              fill={isLast ? 'transparent' : hit ? C.lime : C.line3}
              stroke={isLast ? C.lime : 'none'} strokeWidth={isLast ? 2 : 0} strokeDasharray={isLast ? '5 4' : undefined} />
            <SvgText x={x + bw / 2} y={height - 2} fill={isLast ? C.text : C.dim} fontSize={11} fontFamily={F.body} textAnchor="middle">{labels[i]}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function Ring({ size, stroke = 16, pct, color = C.lime, track = C.card2, children }: { size: number; stroke?: number; pct: number; color?: string; track?: string; children?: React.ReactNode }) {
  const p = useProgress(1100, pct);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, pct)) * p;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ * v} ${circ}`} />
      </Svg>
      {children}
    </View>
  );
}

export function LineChart({ values, width, height = 150, color = C.lime }: { values: number[]; width: number; height?: number; color?: string }) {
  const p = useProgress(1100, values.join(','));
  if (!values.length) return <View style={{ width, height }} />;
  const top = Math.max(...values), bot = Math.min(...values);
  const pad = (top - bot) * 0.15 || 2;
  const y = (v: number) => ((top + pad - v) / (top - bot + 2 * pad)) * (height - 16) + 8;
  const x = (i: number) => (values.length === 1 ? width / 2 : 8 + (i / (values.length - 1)) * (width - 16));
  const a = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const ap = partial(a, p);
  return (
    <Svg width={width} height={height}>
      {[0.15, 0.5, 0.85].map((f) => <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="#21221C" />)}
      <Polyline points={pts(ap)} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {a.map((q, i) => (i / Math.max(1, a.length - 1) <= p + 0.001 ? <Circle key={i} cx={q.x} cy={q.y} r={4.5} fill={C.bg} stroke={color} strokeWidth={2.5} /> : null))}
    </Svg>
  );
}
