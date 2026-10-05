// Side-view stick-figure animation engine (pure TS, no React) — forward kinematics.
// Angles in degrees: 0 = straight up, 90 = facing direction (right), 180 = down, 270 = behind (left).

export type Pt = [number, number];

export type Pose = {
  t: number;    // torso: hip → shoulder
  th: number;   // thigh: hip → knee
  sh: number;   // shin: knee → ankle
  ua: number;   // upper arm: shoulder → elbow
  fa: number;   // forearm: elbow → hand
  th2?: number; sh2?: number; ua2?: number; fa2?: number; // far-side limbs (default = near side)
  ft?: number; ft2?: number; // foot direction (default 90)
  hd?: number;  // head tilt relative to torso
  sl?: number;  // shoulder lift (px, along torso) — shrugs
  dx?: number; dy?: number; // whole-body offset for this pose (jumps, travel)
};

export type JointName = 'hip' | 'knee' | 'ankle' | 'toe' | 'shoulder' | 'elbow' | 'hand' | 'knee2' | 'ankle2' | 'hand2';

export type Gear =
  | { k: 'barbell'; at?: 'hand' | 'shoulder' | 'hip' }
  | { k: 'pad' }
  | { k: 'dumbbell'; both?: boolean }
  | { k: 'kettlebell' }
  | { k: 'cable'; from: Pt; both?: boolean }
  | { k: 'ball' }
  | { k: 'wheel' }
  | { k: 'sled' }
  | { k: 'battlerope'; to: Pt }
  | { k: 'jumprope' }
  | { k: 'plateFoot' }
  | { k: 'handle' };

export type Static = [number, number, number, number, number]; // x1,y1,x2,y2,width

export type AnimSpec = {
  a: Pose;
  b: Pose;
  c?: Pose;            // optional third key pose (a → b → c → a)
  anchor: { j: JointName; x: number; y: number };
  ab?: number;         // seconds a → b
  ba?: number;         // seconds b → a (or c → a)
  bc?: number;         // seconds b → c
  labels?: [string, string] | [string, string, string];
  gear?: Gear[];
  statics?: Static[];
  hold?: boolean;      // isometric: gentle breathing only
  scale?: number;      // shrink the figure (overhead / hanging moves) around the anchor
};

export const L = { thigh: 42, shin: 40, foot: 12, torso: 46, neck: 15, head: 10, ua: 29, fa: 27 };
export const GROUND = 160;

const rad = (d: number) => (d * Math.PI) / 180;
const vecRaw = (deg: number, len: number): Pt => [Math.sin(rad(deg)) * len, -Math.cos(rad(deg)) * len];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

export type Skeleton = Record<JointName | 'head' | 'toe2', Pt>;

export function solve(p: Pose, anchor: AnimSpec['anchor'], k = 1): Skeleton {
  const vec = (deg: number, len: number): Pt => vecRaw(deg, len * k);
  const hip: Pt = [0, 0];
  const knee = add(hip, vec(p.th, L.thigh));
  const ankle = add(knee, vec(p.sh, L.shin));
  const toe = add(ankle, vec(p.ft ?? 90, L.foot));
  const knee2 = add(hip, vec(p.th2 ?? p.th, L.thigh));
  const ankle2 = add(knee2, vec(p.sh2 ?? p.sh, L.shin));
  const toe2 = add(ankle2, vec(p.ft2 ?? p.ft ?? 90, L.foot));
  const shoulder = add(hip, vec(p.t, L.torso + (p.sl ?? 0)));
  const head = add(shoulder, vec(p.t + (p.hd ?? 0), L.neck));
  const elbow = add(shoulder, vec(p.ua, L.ua));
  const hand = add(elbow, vec(p.fa, L.fa));
  const elbow2 = add(shoulder, vec(p.ua2 ?? p.ua, L.ua));
  const hand2 = add(elbow2, vec(p.fa2 ?? p.fa, L.fa));
  const s: Skeleton = { hip, knee, ankle, toe, shoulder, head, elbow, hand, knee2, ankle2, toe2, hand2 } as Skeleton;
  (s as Record<string, Pt>).elbow2 = elbow2;
  const ref = s[anchor.j];
  const ox = anchor.x - ref[0] + (p.dx ?? 0);
  const oy = anchor.y - ref[1] + (p.dy ?? 0);
  for (const k of Object.keys(s)) {
    const v = (s as Record<string, Pt>)[k];
    (s as Record<string, Pt>)[k] = [v[0] + ox, v[1] + oy];
  }
  return s;
}

const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function val(P: Pose, k: keyof Pose): number {
  const v = P[k];
  if (v !== undefined) return v as number;
  if (k === 'ft2') return P.ft ?? 90;
  if (k === 'ft') return 90;
  if (k === 'th2') return P.th;
  if (k === 'sh2') return P.sh;
  if (k === 'ua2') return P.ua;
  if (k === 'fa2') return P.fa;
  return 0;
}

export function blend(A: Pose, B: Pose, t: number): Pose {
  const keys = new Set([...Object.keys(A), ...Object.keys(B)]) as Set<keyof Pose>;
  const o: Partial<Pose> = {};
  for (const k of keys) {
    const av = val(A, k), bv = val(B, k);
    (o as Record<string, number>)[k] = k === 'dx' || k === 'dy' || k === 'hd' || k === 'sl' ? lerp(av, bv, t) : lerpAngle(av, bv, t);
  }
  return o as Pose;
}

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** Pose at time `sec`, plus which phase label is active and overall cycle progress. */
export function poseAt(spec: AnimSpec, sec: number): { pose: Pose; phase: number; progress: number } {
  if (spec.hold) {
    const k = (Math.sin(sec * 2) + 1) / 2;
    return { pose: blend(spec.a, spec.b, k * 0.5), phase: 0, progress: (sec % 3) / 3 };
  }
  const ab = spec.ab ?? 1.2;
  const bc = spec.c ? spec.bc ?? 1 : 0;
  const ba = spec.ba ?? 1.2;
  const cycle = ab + bc + ba;
  const c = sec % cycle;
  if (c < ab) return { pose: blend(spec.a, spec.b, ease(c / ab)), phase: 0, progress: c / cycle };
  if (spec.c && c < ab + bc) return { pose: blend(spec.b, spec.c, ease((c - ab) / bc)), phase: 1, progress: c / cycle };
  const from = spec.c ?? spec.b;
  return { pose: blend(from, spec.a, ease((c - ab - bc) / ba)), phase: spec.c ? 2 : 1, progress: c / cycle };
}

// ---------- scene description shared by the app component and tooling ----------
export type Prim =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; c: Ink; o?: number }
  | { k: 'circle'; cx: number; cy: number; r: number; fill?: Ink; stroke?: Ink; w?: number; o?: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill: Ink }
  | { k: 'path'; d: string; stroke: Ink; w: number; o?: number };
export type Ink = 'body' | 'body2' | 'arm' | 'arm2' | 'accent' | 'gear' | 'static' | 'static2' | 'muted';

export function scene(spec: AnimSpec, sec: number): { prims: Prim[]; phase: number; progress: number } {
  const { pose, phase, progress } = poseAt(spec, sec);
  const K = spec.scale ?? 1;
  const s = solve(pose, spec.anchor, K);
  const P: Prim[] = [];
  const ln = (a: Pt, b: Pt, w: number, c: Ink, o?: number) => P.push({ k: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], w, c, o });
  const sk = s as unknown as Record<string, Pt>;

  for (const st of spec.statics ?? []) ln([st[0], st[1]], [st[2], st[3]], st[4], 'static');

  const gear = spec.gear ?? [];
  const has2arm = pose.ua2 !== undefined || pose.fa2 !== undefined;
  const has2leg = pose.th2 !== undefined || pose.sh2 !== undefined;

  // cables first (behind body)
  for (const g of gear) {
    if (g.k === 'cable') {
      ln(g.from, s.hand, 2, 'muted');
      if (g.both && has2arm) ln([312 - g.from[0], g.from[1]], s.hand2, 2, 'muted');
      P.push({ k: 'circle', cx: g.from[0], cy: g.from[1], r: 5, fill: 'static2' });
    }
    if (g.k === 'battlerope') {
      const ph = sec * 18;
      for (const [h, o] of [[s.hand, 0], [s.hand2, Math.PI]] as [Pt, number][]) {
        let d = `M${h[0].toFixed(1)},${h[1].toFixed(1)}`;
        for (let i = 1; i <= 12; i++) {
          const f = i / 12;
          const x = h[0] + (g.to[0] - h[0]) * f;
          const y = h[1] + (g.to[1] - h[1]) * f + Math.sin(ph + o + f * 9) * 9 * (1 - f * 0.6);
          d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        }
        P.push({ k: 'path', d, stroke: 'gear', w: 3 });
      }
    }
    if (g.k === 'jumprope') {
      const a = (sec / 0.5) * Math.PI * 2;
      const cx = s.hip[0], cy = (s.head[1] + 160) / 2, rx = 34, ry = (160 - s.head[1]) / 2 + 12;
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
      P.push({ k: 'path', d: `M${s.hand[0]},${s.hand[1]} Q${px},${py} ${s.hand2[0] + 2},${s.hand2[1]}`, stroke: 'gear', w: 2 });
    }
  }

  // far-side limbs
  if (has2leg) { ln(s.hip, s.knee2, 9, 'body2'); ln(s.knee2, s.ankle2, 8, 'body2'); ln(s.ankle2, sk.toe2, 5, 'body2'); }
  if (has2arm) { ln(s.shoulder, sk.elbow2, 6.5, 'arm2'); ln(sk.elbow2, s.hand2, 6, 'arm2'); }

  // leg-press sled under the feet
  for (const g of gear) {
    if (g.k === 'plateFoot') {
      const dir: Pt = [0.78, -0.62];
      const n: Pt = [0.62, 0.78];
      const a = s.ankle;
      ln([a[0] + 6 - n[0] * 22, a[1] - 2 - n[1] * 22], [a[0] + 6 + n[0] * 22, a[1] - 2 + n[1] * 22], 7, 'static2');
      ln([a[0] + 8, a[1] - 3], [a[0] + 8 + dir[0] * 34, a[1] - 3 + dir[1] * 34], 5, 'muted');
      const pc: Pt = [a[0] + 8 + dir[0] * 40, a[1] - 3 + dir[1] * 40];
      P.push({ k: 'circle', cx: pc[0], cy: pc[1], r: 16, stroke: 'gear', w: 4 });
      P.push({ k: 'circle', cx: pc[0], cy: pc[1], r: 8, stroke: 'gear', w: 3, o: 0.6 });
    }
  }

  // body
  ln(s.hip, s.shoulder, 11, 'body');
  P.push({ k: 'circle', cx: s.head[0], cy: s.head[1], r: L.head * K, fill: 'body' });
  ln(s.hip, s.knee, 11, 'body');
  ln(s.knee, s.ankle, 9, 'body');
  ln(s.ankle, s.toe, 6, 'accent');
  ln(s.shoulder, s.elbow, 7, 'arm');
  ln(s.elbow, s.hand, 6, 'arm');

  // gear in front
  for (const g of gear) {
    if (g.k === 'barbell') {
      const at = g.at === 'shoulder' ? s.shoulder : g.at === 'hip' ? [s.hip[0] + 2, s.hip[1] - 8] as Pt : s.hand;
      P.push({ k: 'circle', cx: at[0], cy: at[1], r: 15, stroke: 'gear', w: 4 });
      P.push({ k: 'circle', cx: at[0], cy: at[1], r: 7.5, stroke: 'gear', w: 3, o: 0.6 });
    } else if (g.k === 'dumbbell') {
      for (const h of g.both && has2arm ? [s.hand, s.hand2] : [s.hand]) {
        ln([h[0] - 9, h[1]], [h[0] + 9, h[1]], 4, 'gear');
        P.push({ k: 'rect', x: h[0] - 13, y: h[1] - 7, w: 6, h: 14, rx: 2, fill: 'gear' });
        P.push({ k: 'rect', x: h[0] + 7, y: h[1] - 7, w: 6, h: 14, rx: 2, fill: 'gear' });
      }
    } else if (g.k === 'kettlebell') {
      P.push({ k: 'circle', cx: s.hand[0], cy: s.hand[1] + 9, r: 8, fill: 'gear' });
      P.push({ k: 'circle', cx: s.hand[0], cy: s.hand[1] + 1, r: 4, stroke: 'gear', w: 2.5 });
    } else if (g.k === 'ball') {
      P.push({ k: 'circle', cx: s.hand[0], cy: s.hand[1], r: 11, fill: 'gear' });
    } else if (g.k === 'wheel') {
      P.push({ k: 'circle', cx: s.hand[0], cy: s.hand[1] + 2, r: 10, stroke: 'gear', w: 4 });
    } else if (g.k === 'handle') {
      ln([s.hand[0] - 9, s.hand[1]], [s.hand[0] + 9, s.hand[1]], 5, 'gear');
    } else if (g.k === 'pad') {
      P.push({ k: 'circle', cx: s.ankle[0], cy: s.ankle[1], r: 7, fill: 'gear' });
    } else if (g.k === 'sled') {
      const h = s.hand;
      ln([h[0], h[1]], [h[0] + 8, 150], 5, 'static2');
      P.push({ k: 'rect', x: h[0] + 4, y: 126, w: 40, h: 26, rx: 4, fill: 'gear' });
    }
  }
  return { prims: P, phase, progress };
}
