import { addDays, diffDays, weekday } from './dates';
import { DayKey, EXERCISES, ExerciseDef, LIFT_DAYS, MILESTONES, PlanItem, restFor, rirFor, SCHEDULE } from './plan';
import type { ExSet, Profile } from './repo';
import { C } from './theme';

export type Weigh = { date: string; weight_kg: number };

export function dayNumber(p: Profile, date: string): number {
  return Math.max(1, diffDays(date, p.start_date) + 1);
}
export function weekNumber(p: Profile, date: string): number {
  return Math.ceil(dayNumber(p, date) / 7);
}

/** Average of the latest (up to) 7 weigh-ins on or before `date`. */
export function avgAt(ws: Weigh[], date: string): { avg: number; n: number } | null {
  const upto = ws.filter((w) => w.date <= date);
  if (!upto.length) return null;
  const last = upto.slice(-7);
  return { avg: last.reduce((s, w) => s + w.weight_kg, 0) / last.length, n: last.length };
}

export function avgSeries(ws: Weigh[]): { date: string; avg: number }[] {
  return ws.map((w, i) => {
    const s = ws.slice(Math.max(0, i - 6), i + 1);
    return { date: w.date, avg: s.reduce((a, b) => a + b.weight_kg, 0) / s.length };
  });
}

export function weeklyChange(ws: Weigh[], date: string): number | null {
  const now = avgAt(ws, date);
  const prev = avgAt(ws, addDays(date, -7));
  if (!now || !prev || now.n < 3) return null;
  return now.avg - prev.avg;
}

export type StatusKey = 'COLLECTING' | 'ON_TRACK' | 'AUDIT' | 'REVIEW' | 'RECOMP' | 'SLOW' | 'FAST' | 'START';
export type Status = { key: StatusKey; tag: string; line: string; detail: string; color: string; ink: string };

export function status(ws: Weigh[], date: string, strengthUp: number): Status {
  if (!ws.length) return { key: 'START', tag: 'Day one', line: 'Log your first morning weigh-in.', detail: 'Everything else builds on a reliable baseline.', color: C.lime, ink: C.bg };
  const span = diffDays(date, ws[0].date);
  if (span < 14) {
    return { key: 'COLLECTING', tag: 'Collecting data', line: 'Building your baseline. Keep logging.', detail: `${14 - span} more day${14 - span === 1 ? '' : 's'} until the trend is reliable.`, color: C.text, ink: C.bg };
  }
  const now = avgAt(ws, date)!;
  const wk = weeklyChange(ws, date) ?? 0;
  const prevWk = weeklyChange(ws, addDays(date, -7)) ?? 0;
  const two = now.avg - (avgAt(ws, addDays(date, -14))?.avg ?? now.avg);
  const pct = (-wk / now.avg) * 100;
  const prevPct = (-prevWk / now.avg) * 100;
  const loss = -wk;
  if (two > -0.3) return { key: 'AUDIT', tag: 'Audit', line: 'Almost no change for 2 weeks.', detail: 'Check portions, snacks, drinks, steps and logging first. Then cut about 150–200 kcal or add steps. Change one thing only.', color: C.text, ink: C.bg };
  if (pct > 1 && prevPct > 1) return { key: 'REVIEW', tag: 'Review', line: 'Losing fast two weeks running.', detail: 'If you feel drained or lifts are dropping, add a little food and reassess.', color: C.text, ink: C.bg };
  if (loss >= 0.35 && loss <= 0.85) return { key: 'ON_TRACK', tag: 'On track', line: 'Keep the plan unchanged.', detail: `−${loss.toFixed(1)} kg this week, inside the 0.4–0.8 kg range.`, color: C.lime, ink: C.bg };
  if (loss < 0.35 && strengthUp > 0) return { key: 'RECOMP', tag: 'Recomp', line: 'Strength up, weight slow. Don’t panic.', detail: 'Recomposition may be happening. Watch the waist.', color: C.lime, ink: C.bg };
  if (loss < 0.35) return { key: 'SLOW', tag: 'Slow week', line: 'Slower than planned. Stay the course.', detail: 'One slow week is noise. Re-check next week before changing anything.', color: C.text, ink: C.bg };
  return { key: 'FAST', tag: 'Ahead', line: 'Faster than planned this week.', detail: 'Fine if training feels good. Don’t cut food further.', color: C.lime, ink: C.bg };
}

export function nextMilestone(avg: number) {
  const ms = MILESTONES.slice(1);
  const next = ms.find((m) => m.kg < avg - 0.05) ?? ms[ms.length - 1];
  const idx = MILESTONES.indexOf(next);
  const from = MILESTONES[idx - 1].kg;
  return { ...next, from, pct: Math.max(0, Math.min(1, (from - avg) / (from - next.kg))) };
}

export function isLiftDay(date: string): boolean {
  return LIFT_DAYS.includes(weekday(date));
}

/** The workout scheduled on a date, or null on Sunday (rest). */
export function scheduledDay(date: string): DayKey | null {
  return SCHEDULE[weekday(date)];
}

/** The first training day after `date` (or from `date` itself when includeToday is set). */
export function nextTrainingDay(date: string, includeToday = false): { date: string; key: DayKey; daysAway: number } {
  for (let i = includeToday ? 0 : 1; i <= 7; i++) {
    const d = addDays(date, i);
    const k = SCHEDULE[weekday(d)];
    if (k) return { date: d, key: k, daysAway: i };
  }
  return { date: addDays(date, 1), key: 'push_a', daysAway: 1 };
}

export type Suggestion = { weight: number | null; up: boolean; note: string };
export function suggest(def: ExerciseDef, last: ExSet[]): Suggestion {
  if (!last.length) return { weight: null, up: false, note: `First time: pick a weight you could lift ${def.repMax} times with 2 reps left. Write it down and build from there.` };
  const w = Math.max(...last.map((s) => s.weight_kg ?? 0));
  const pain = last.some((s) => s.pain);
  const top = last.length >= def.sets && last.every((s) => (s.reps ?? 0) >= def.repMax);
  if (pain) return { weight: w, up: false, note: 'Pain or form was flagged last time. Same weight, focus on clean reps.' };
  if (top) return { weight: +(w + def.increment).toFixed(2), up: true, note: `All sets hit ${def.repMax} last time. Add ${def.increment} kg.` };
  return { weight: w, up: false, note: def.increment > 0 ? `Same weight. Once all ${def.sets} sets reach ${def.repMax} reps with good form, add ${def.increment} kg.` : `Same as last time. Try to add a rep or two across your sets.` };
}

export function e1rm(w: number, reps: number): number {
  return w * (1 + reps / 30);
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function exName(key: string): string {
  return EXERCISES[key]?.name ?? key;
}

/** Library definition with the user's sets / rep range applied. */
export function itemDef(item: PlanItem | string): ExerciseDef {
  if (typeof item === 'string') return EXERCISES[item];
  const d = EXERCISES[item.key];
  return { ...d, sets: item.sets, repMin: item.repMin, repMax: item.repMax };
}

/** Rest seconds and target RIR for a plan item (falls back to the program rule when not set). */
export function restOf(item: PlanItem | ExerciseDef): number {
  return ('rest' in item && item.rest) ? item.rest : restFor(item.key, item.repMax);
}
export function rirOf(key: string): number {
  return rirFor(key);
}
export function restLabel(sec: number): string {
  return sec % 60 === 0 ? `${sec / 60} min` : sec > 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} min` : `${sec} s`;
}

export function scheme(d: { sets: number; repMin: number; repMax: number; unit?: string }): string {
  const u = d.unit === 'sec' ? ' s' : d.unit === 'min' ? ' min' : '';
  return `${d.sets} × ${d.repMin === d.repMax ? d.repMin : `${d.repMin}–${d.repMax}`}${u}`;
}
