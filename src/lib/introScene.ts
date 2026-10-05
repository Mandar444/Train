// Opening animation — pure frame builder (no React), drawn in a 360 × 640 design space.
// Four sport scenes with full environments, then the GOAL logo slam.

export type IPrim =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; c: string; o?: number; dash?: string }
  | { k: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; w?: number; o?: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: string; stroke?: string; sw?: number; o?: number }
  | { k: 'path'; d: string; stroke?: string; fill?: string; w?: number; o?: number; dash?: string }
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string; o?: number };
export type IText = { text: string; x: number; y: number; size: number; font: 'logo' | 'bold' | 'black'; color: string; o: number; align?: 'center' | 'left' | 'right'; scale?: number; skew?: boolean; spacing?: number };
export type IFrame = { bg: string; prims: IPrim[]; texts: IText[]; done: boolean };

const LIME = '#D4FF4F', INK = '#0D0E0B', ORANGE = '#FF8A3D', WHITE = '#F2F1EA', COURT = '#14130F', TRACK = '#101411';

export const SCENE = 1.15;
export const LOGO_AT = SCENE * 4;      // 4.6 s
export const END = LOGO_AT + 1.9;      // 6.5 s
export const FADE = 0.45;
export const TOTAL = END + FADE;

type P = [number, number];
type Body = { head: P; sh: P; hip: P; eL: P; hL: P; eR: P; hR: P; kL: P; fL: P; kR: P; fR: P };

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const out = (x: number) => 1 - Math.pow(1 - x, 3);
const back = (x: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mix = (A: Body, B: Body, t: number): Body => {
  const o = {} as Body;
  (Object.keys(A) as (keyof Body)[]).forEach((k) => { o[k] = lerp(A[k], B[k], t); });
  return o;
};
const rand = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---- poses (200 × 200 box, ground y = 170) ----
const JJ_A: Body = { head: [100, 52], sh: [100, 68], hip: [100, 110], eL: [94, 88], hL: [92, 108], eR: [106, 88], hR: [108, 108], kL: [97, 140], fL: [96, 170], kR: [103, 140], fR: [104, 170] };
const JJ_B: Body = { head: [100, 40], sh: [100, 56], hip: [100, 98], eL: [80, 42], hL: [70, 24], eR: [120, 42], hR: [130, 24], kL: [88, 128], fL: [76, 158], kR: [112, 128], fR: [124, 158] };
const BB_A: Body = { head: [72, 86], sh: [74, 100], hip: [68, 132], eL: [84, 116], hL: [92, 124], eR: [86, 114], hR: [94, 122], kL: [86, 148], fL: [74, 170], kR: [84, 150], fR: [70, 170] };
const BB_B: Body = { head: [78, 40], sh: [78, 56], hip: [74, 96], eL: [86, 36], hL: [92, 18], eR: [88, 38], hR: [94, 20], kL: [82, 126], fL: [76, 156], kR: [78, 128], fR: [70, 158] };
const GY_A: Body = { head: [100, 94], sh: [100, 108], hip: [100, 128], eL: [86, 126], hL: [82, 146], eR: [114, 126], hR: [118, 146], kL: [88, 148], fL: [86, 170], kR: [112, 148], fR: [114, 170] };
const GY_M: Body = { head: [100, 56], sh: [100, 72], hip: [100, 112], eL: [80, 82], hL: [80, 68], eR: [120, 82], hR: [120, 68], kL: [94, 140], fL: [90, 170], kR: [106, 140], fR: [110, 170] };
const GY_B: Body = { head: [100, 52], sh: [100, 68], hip: [100, 110], eL: [82, 50], hL: [80, 28], eR: [118, 50], hR: [120, 28], kL: [96, 140], fL: [90, 170], kR: [104, 140], fR: [110, 170] };
const RN_A: Body = { head: [108, 50], sh: [104, 66], hip: [98, 106], eL: [90, 84], hL: [80, 96], eR: [116, 78], hR: [126, 64], kL: [120, 120], fL: [112, 146], kR: [86, 132], fR: [70, 150] };
const RN_B: Body = { head: [108, 54], sh: [104, 70], hip: [98, 110], eL: [116, 82], hL: [126, 68], eR: [90, 88], hR: [80, 100], kL: [86, 136], fL: [70, 152], kR: [120, 124], fR: [112, 150] };

// figure box → screen
const FS = 1.5, FX = 30, FY = 132; // ground at 132 + 170*1.5 = 387
const GROUND = FY + 170 * FS;
const tp = (p: P, dx = 0): P => [FX + (p[0] + dx) * FS, FY + p[1] * FS];

function figure(P: IPrim[], b: Body, color: string, o = 1, dx = 0) {
  const L = (a: P, c: P, w: number) => { const A = tp(a, dx), B = tp(c, dx); P.push({ k: 'line', x1: A[0], y1: A[1], x2: B[0], y2: B[1], w: w * FS, c: color, o }); };
  L(b.hip, b.kR, 9); L(b.kR, b.fR, 8); L(b.sh, b.eR, 6.5); L(b.eR, b.hR, 6);
  L(b.hip, b.sh, 12);
  const h = tp(b.head, dx);
  P.push({ k: 'circle', cx: h[0], cy: h[1], r: 11 * FS, fill: color, o });
  L(b.hip, b.kL, 9); L(b.kL, b.fL, 8); L(b.sh, b.eL, 6.5); L(b.eL, b.hL, 6);
}

function shadow(P: IPrim[], b: Body, c: string, dx = 0) {
  const x = tp([(b.fL[0] + b.fR[0]) / 2, 0], dx)[0];
  const lift = clamp((170 - Math.max(b.fL[1], b.fR[1])) / 20);
  P.push({ k: 'ellipse', cx: x, cy: GROUND + 4, rx: 46 - lift * 14, ry: 7 - lift * 2, fill: c, o: 0.28 - lift * 0.12 });
}

function sparks(P: IPrim[], cx: number, cy: number, t: number, color: string, n = 10, seed = 0, spread = 70) {
  if (t <= 0 || t >= 1) return;
  for (let i = 0; i < n; i++) {
    const a = rand(seed + i) * Math.PI * 2;
    const d = out(t) * spread * (0.5 + rand(seed + i + 50));
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    P.push({ k: 'line', x1: x, y1: y, x2: x + Math.cos(a) * 9 * (1 - t), y2: y + Math.sin(a) * 9 * (1 - t), w: 3, c: color, o: 1 - t });
  }
}

function hud(P: IPrim[], T: IText[], scene: number, st: number, fg: string, label: string, sub: string) {
  // segmented progress at top
  for (let i = 0; i < 4; i++) {
    const x = 24 + i * 80, w = 72;
    P.push({ k: 'rect', x, y: 54, w, h: 4, rx: 2, fill: fg, o: 0.18 });
    const f = i < scene ? 1 : i === scene ? st : 0;
    if (f > 0) P.push({ k: 'rect', x, y: 54, w: w * f, h: 4, rx: 2, fill: fg, o: 0.95 });
  }
  T.push({ text: 'GOAL', x: 24, y: 72, size: 22, font: 'logo', color: fg, o: 0.9, align: 'left', skew: true });
  T.push({ text: `0${scene + 1} / 04`, x: 336, y: 76, size: 13, font: 'bold', color: fg, o: 0.7, align: 'right' });
  // big kinetic word behind, sliding
  const slide = (1 - out(clamp(st * 2.2))) * 120 - st * 30;
  T.push({ text: label, x: 180 + slide, y: 150, size: 132, font: 'logo', color: fg, o: 0.1, align: 'center', skew: true });
  // caption bottom
  const ci = out(clamp((st - 0.08) * 4));
  T.push({ text: label, x: 180, y: 446 + (1 - ci) * 18, size: 44, font: 'logo', color: fg, o: ci, align: 'center', skew: true, spacing: 2 });
  T.push({ text: sub, x: 180, y: 500 + (1 - ci) * 12, size: 15, font: 'bold', color: fg, o: ci * 0.75, align: 'center' });
}

export function introFrame(t: number): IFrame {
  const P: IPrim[] = [];
  const T: IText[] = [];
  const scene = Math.min(4, Math.floor(t / SCENE));
  const st = clamp((t - scene * SCENE) / SCENE);
  let bg = LIME;

  if (scene === 0) {
    // ---------- JUMPING JACKS on lime, with floor grid and rep counter ----------
    bg = LIME;
    const reps = 2.5;
    const ph = (st * reps) % 1;
    const k = ease(ph < 0.5 ? ph * 2 : 2 - ph * 2);
    const body = mix(JJ_A, JJ_B, k);
    for (let i = 0; i < 7; i++) P.push({ k: 'line', x1: 0, y1: GROUND + 8 + i * i * 4, x2: 360, y2: GROUND + 8 + i * i * 4, w: 1.5, c: INK, o: 0.12 });
    for (let i = -6; i <= 6; i++) P.push({ k: 'line', x1: 180 + i * 18, y1: GROUND + 8, x2: 180 + i * 70, y2: 640, w: 1.5, c: INK, o: 0.1 });
    // motion arcs for the arms
    P.push({ k: 'path', d: `M${tp([70, 110])[0]},${tp([70, 110])[1]} Q${tp([40, 40])[0]},${tp([40, 40])[1]} ${tp([96, 14])[0]},${tp([96, 14])[1]}`, stroke: INK, w: 3, o: 0.25 * k, dash: '6 8' });
    P.push({ k: 'path', d: `M${tp([130, 110])[0]},${tp([130, 110])[1]} Q${tp([160, 40])[0]},${tp([160, 40])[1]} ${tp([104, 14])[0]},${tp([104, 14])[1]}`, stroke: INK, w: 3, o: 0.25 * k, dash: '6 8' });
    shadow(P, body, INK);
    const prev = mix(JJ_A, JJ_B, ease(((st - 0.04) * reps % 1) < 0.5 ? ((st - 0.04) * reps % 1) * 2 : 2 - ((st - 0.04) * reps % 1) * 2));
    figure(P, prev, INK, 0.18);
    figure(P, body, INK);
    const rep = Math.min(3, Math.floor(st * reps) + 1);
    T.push({ text: `REP ${rep}`, x: 300, y: 300, size: 18, font: 'black', color: INK, o: 0.8, align: 'center' });
    hud(P, T, 0, st, INK, 'JUMP', 'Warm up the whole body');
  } else if (scene === 1) {
    // ---------- BASKETBALL court at night ----------
    bg = COURT;
    // spotlight cone
    P.push({ k: 'path', d: `M150,0 L210,0 L330,${GROUND + 10} L30,${GROUND + 10} Z`, fill: '#F2F1EA', o: 0.05 });
    // court floor with lines in perspective
    P.push({ k: 'rect', x: 0, y: GROUND + 6, w: 360, h: 640 - GROUND, fill: '#1E1A12', o: 1 });
    for (let i = 0; i < 9; i++) P.push({ k: 'line', x1: 0, y1: GROUND + 14 + i * 26, x2: 360, y2: GROUND + 14 + i * 26, w: 1, c: '#3A3122', o: 0.6 });
    P.push({ k: 'path', d: `M40,${GROUND + 6} Q180,${GROUND + 130} 320,${GROUND + 6}`, stroke: ORANGE, w: 3, o: 0.55 });
    P.push({ k: 'rect', x: 230, y: GROUND + 6, w: 100, h: 60, stroke: ORANGE, sw: 3, o: 0.55 });
    // crowd dots
    for (let i = 0; i < 46; i++) P.push({ k: 'circle', cx: (i * 37) % 360 + rand(i) * 10, cy: 168 + (i % 3) * 16 + rand(i + 9) * 6, r: 3.5, fill: '#F2F1EA', o: 0.06 + 0.06 * Math.sin(t * 6 + i) });
    // hoop
    const hx = 308, hy = 238;
    P.push({ k: 'rect', x: hx + 22, y: hy - 64, w: 8, h: 230, fill: '#3A3B33' });
    P.push({ k: 'rect', x: hx + 6, y: hy - 58, w: 12, h: 70, rx: 3, fill: WHITE });
    P.push({ k: 'line', x1: hx - 30, y1: hy, x2: hx + 8, y2: hy, w: 5, c: ORANGE });
    const swish = clamp((st - 0.78) / 0.15);
    for (let i = 0; i < 5; i++) {
      const x = hx - 28 + i * 8.5;
      P.push({ k: 'line', x1: x, y1: hy + 2, x2: x + 3 - swish * 4 * Math.sin(i), y2: hy + 30 + swish * 8, w: 1.6, c: WHITE, o: 0.7 });
    }
    // player
    const k = ease(clamp(st / 0.5));
    const body = mix(BB_A, BB_B, k);
    shadow(P, body, '#000');
    figure(P, mix(BB_A, BB_B, ease(clamp((st - 0.05) / 0.5))), WHITE, 0.15);
    figure(P, body, WHITE);
    // ball with trail
    const rel = clamp((st - 0.42) / 0.38);
    const sx = tp([96, 16])[0], sy = tp([96, 16])[1];
    const bxy = (r: number): P => [sx + (hx - 12 - sx) * r, sy + (hy - 8 - sy) * r - Math.sin(r * Math.PI) * 90];
    if (st < 0.42) {
      const h = tp([body.hR[0] + 4, body.hR[1] - 7]);
      P.push({ k: 'circle', cx: h[0], cy: h[1], r: 12, fill: ORANGE });
    } else if (st < 0.95) {
      for (let j = 6; j >= 1; j--) { const q = bxy(clamp(rel - j * 0.035)); P.push({ k: 'circle', cx: q[0], cy: q[1], r: 12 - j, fill: ORANGE, o: 0.08 * (7 - j) }); }
      const b = rel < 1 ? bxy(rel) : [hx - 12, hy + 10 + (st - 0.8) * 120] as P;
      P.push({ k: 'circle', cx: b[0], cy: b[1], r: 12, fill: ORANGE });
      P.push({ k: 'path', d: `M${b[0] - 12},${b[1]} L${b[0] + 12},${b[1]} M${b[0]},${b[1] - 12} L${b[0]},${b[1] + 12}`, stroke: INK, w: 1.5, o: 0.6 });
    }
    sparks(P, hx - 12, hy, clamp((st - 0.8) / 0.2), ORANGE, 12, 3, 60);
    if (st > 0.8) T.push({ text: '+2', x: hx - 18, y: hy - 70 - (st - 0.8) * 60, size: 34, font: 'logo', color: ORANGE, o: 1 - clamp((st - 0.9) / 0.1), align: 'center', skew: true });
    hud(P, T, 1, st, WHITE, 'SHOOT', 'Have fun moving');
  } else if (scene === 2) {
    // ---------- BARBELL in a gym, orange ----------
    bg = ORANGE;
    // rack + mirror + platform
    P.push({ k: 'rect', x: 22, y: 150, w: 316, h: GROUND - 140, rx: 6, fill: INK, o: 0.08 });
    P.push({ k: 'rect', x: 40, y: 170, w: 10, h: GROUND - 170, fill: INK, o: 0.35 });
    P.push({ k: 'rect', x: 310, y: 170, w: 10, h: GROUND - 170, fill: INK, o: 0.35 });
    P.push({ k: 'rect', x: 30, y: 168, w: 300, h: 8, fill: INK, o: 0.35 });
    // plates stacked on the side
    for (let i = 0; i < 4; i++) P.push({ k: 'rect', x: 330 - i * 3, y: GROUND - 22 - i * 16, w: 12, h: 14, rx: 3, fill: INK, o: 0.5 });
    P.push({ k: 'rect', x: 0, y: GROUND + 6, w: 360, h: 640 - GROUND, fill: INK, o: 0.1 });
    P.push({ k: 'rect', x: 40, y: GROUND + 4, w: 280, h: 14, rx: 4, fill: INK, o: 0.25 });
    const body = st < 0.45 ? mix(GY_A, GY_M, ease(st / 0.45)) : mix(GY_M, GY_B, ease(clamp((st - 0.45) / 0.4)));
    const yb = (body.hL[1] + body.hR[1]) / 2;
    shadow(P, body, INK);
    figure(P, body, INK);
    const bl = tp([20, yb]), br = tp([180, yb]);
    P.push({ k: 'line', x1: bl[0], y1: bl[1], x2: br[0], y2: br[1], w: 6, c: INK });
    for (const [x, h, w] of [[20, 52, 13], [34, 40, 10], [180 - 13, 52, 13], [180 - 23, 40, 10]] as [number, number, number][]) {
      const p = tp([x, yb]);
      P.push({ k: 'rect', x: p[0] - (x > 100 ? 0 : 0), y: p[1] - h / 2, w, h, rx: 3, fill: INK });
    }
    // chalk puff at lockout
    const lock = clamp((st - 0.86) / 0.14);
    sparks(P, tp([body.hL[0], body.hL[1]])[0], tp([body.hL[0], body.hL[1]])[1], lock, WHITE, 9, 21, 40);
    sparks(P, tp([body.hR[0], body.hR[1]])[0], tp([body.hR[0], body.hR[1]])[1], lock, WHITE, 9, 41, 40);
    T.push({ text: '80 KG', x: 180, y: 204, size: 20, font: 'black', color: INK, o: 0.75, align: 'center' });
    hud(P, T, 2, st, INK, 'LIFT', 'Get stronger every week');
  } else if (scene === 3) {
    // ---------- SPRINT on a track ----------
    bg = TRACK;
    P.push({ k: 'rect', x: 0, y: GROUND + 6, w: 360, h: 640 - GROUND, fill: '#2A1A14' });
    for (let i = 0; i < 5; i++) {
      const y = GROUND + 10 + i * 34;
      P.push({ k: 'line', x1: 0, y1: y, x2: 360, y2: y, w: 2, c: WHITE, o: 0.35 });
    }
    // moving lane markers + finish line
    for (let i = 0; i < 8; i++) {
      const x = ((i * 70 - st * 900) % 560 + 560) % 560 - 100;
      P.push({ k: 'rect', x, y: GROUND + 22, w: 30, h: 4, fill: WHITE, o: 0.5 });
    }
    const fx = 420 - st * 380;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) P.push({ k: 'rect', x: fx + c * 10, y: GROUND + 8 + r * 12, w: 10, h: 12, fill: (r + c) % 2 ? WHITE : INK, o: 0.9 });
    // stadium lights
    for (let i = 0; i < 6; i++) P.push({ k: 'circle', cx: 30 + i * 60, cy: 160, r: 5, fill: LIME, o: 0.4 + 0.3 * Math.sin(t * 8 + i) });
    // speed lines
    for (let i = 0; i < 9; i++) {
      const y = 220 + i * 18;
      const x = ((360 - ((st * 1400 + i * 97) % 520)) + 520) % 520 - 80;
      P.push({ k: 'line', x1: x, y1: y, x2: x + 50 + rand(i) * 40, y2: y, w: 3, c: LIME, o: 0.4 });
    }
    const ph = (st * 4.5) % 1;
    const body = mix(RN_A, RN_B, ease(ph < 0.5 ? ph * 2 : 2 - ph * 2));
    const bob = Math.sin(st * Math.PI * 9) * 2;
    const b2 = Object.fromEntries(Object.entries(body).map(([kk, v]) => [kk, [v[0], v[1] + bob]])) as unknown as Body;
    shadow(P, b2, '#000');
    figure(P, b2, LIME, 0.12, -14);
    figure(P, b2, LIME, 0.25, -7);
    figure(P, b2, LIME);
    const secs = (st * 9.8).toFixed(1).padStart(4, '0');
    T.push({ text: `00:${secs}`, x: 300, y: 220, size: 20, font: 'black', color: LIME, o: 0.85, align: 'center' });
    hud(P, T, 3, st, LIME, 'RUN', 'Walk 9,000 steps a day');
  } else {
    // ---------- LOGO ----------
    const lt = t - LOGO_AT;
    const wipe = out(clamp(lt / 0.45));
    bg = wipe >= 1 ? LIME : TRACK;
    if (wipe < 1) P.push({ k: 'circle', cx: 180, cy: 330, r: 760 * wipe, fill: LIME });
    // diagonal stripes for depth
    if (lt > 0.2) for (let i = -4; i < 10; i++) {
      const x = i * 60 + ((lt * 40) % 60);
      P.push({ k: 'path', d: `M${x},0 L${x + 24},0 L${x - 136},640 L${x - 160},640 Z`, fill: INK, o: 0.04 });
    }
    const slam = clamp((lt - 0.3) / 0.6);
    sparks(P, 180, 300, clamp((lt - 0.75) / 0.5), INK, 18, 77, 170);
    const letters = ['G', 'O', 'A', 'L'];
    const shake = lt > 0.75 && lt < 0.9 ? Math.sin(lt * 120) * 4 : 0;
    letters.forEach((ch, i) => {
      const p = clamp((lt - 0.18 - i * 0.12) / 0.32);
      if (p <= 0) return;
      T.push({ text: ch, x: 180 + (i - 1.5) * 74 + shake, y: 350 - (1 - p) * 60, size: 140, font: 'logo', color: INK, o: 1, align: 'center', scale: 0.55 + 0.45 * back(p), skew: true });
    });
    const by = out(clamp((lt - 1.0) / 0.35));
    T.push({ text: 'BY MANDAR', x: 180, y: 400 + (1 - by) * 12, size: 17, font: 'black', color: INK, o: by, align: 'center', spacing: 5 });
    const tag = out(clamp((lt - 1.25) / 0.35));
    T.push({ text: 'Your 12-week cut starts now', x: 180, y: 440 + (1 - tag) * 10, size: 15, font: 'bold', color: INK, o: tag * 0.75, align: 'center' });
    void slam;
  }

  return { bg, prims: P, texts: T, done: t >= TOTAL };
}
