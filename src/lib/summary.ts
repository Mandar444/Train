import { addDays, range, weekday } from './dates';
import { avgAt, dayNumber, isLiftDay, nextMilestone, scheduledDay, status, Status, weekNumber, weeklyChange, Weigh } from './logic';
import { DayKey, Special, stepTarget } from './plan';
import * as repo from './repo';

export type DayMark = 'all' | 'some' | 'none' | 'today' | 'future';

export type Summary = {
  profile: repo.Profile;
  date: string;
  day: number;
  week: number;
  weights: Weigh[];
  avg: number | null;
  avgN: number;
  todayWeight: number | null;
  change: number | null;
  status: Status;
  milestone: ReturnType<typeof nextMilestone> | null;
  lostKg: number;
  steps: number;
  stepsSource: string | null;
  stepTarget: number;
  stepAvg7: number | null;
  sleep: number | null;
  kcal: number;
  protein: number;
  special: Special | null;
  liftDay: boolean;
  /** Today's scheduled workout, or null on a rest day. */
  nextWorkout: DayKey | null;
  todaySession: repo.Session | null;
  openSession: repo.Session | null;
  marks: { date: string; mark: DayMark }[];
  loggedStreak: number;
  strengthUp: number;
  sessionsDone: number;
};

/** Number of lifts whose best set (e1RM-ish) went up in the last 14 days vs before. */
export async function strengthTrend(date: string): Promise<{ up: number; rows: { exercise: string; from: number; to: number }[] }> {
  const all = await repo.sessions();
  const done = all.filter((s) => s.completed);
  const cut = addDays(date, -14);
  const best: Record<string, { before: number; recent: number }> = {};
  for (const s of done) {
    const sets = await repo.setsFor(s.id);
    for (const x of sets) {
      if (!x.done || x.weight_kg == null) continue;
      const b = (best[x.exercise] ??= { before: 0, recent: 0 });
      if (s.date < cut) b.before = Math.max(b.before, x.weight_kg);
      else b.recent = Math.max(b.recent, x.weight_kg);
    }
  }
  const firsts: Record<string, number> = {};
  const tops: Record<string, number> = {};
  for (const s of done) {
    const sets = (await repo.setsFor(s.id)).filter((x) => x.done && x.weight_kg != null);
    const perEx: Record<string, number> = {};
    for (const x of sets) perEx[x.exercise] = Math.max(perEx[x.exercise] ?? 0, x.weight_kg as number);
    for (const [k, w] of Object.entries(perEx)) {
      if (firsts[k] === undefined) firsts[k] = w;
      tops[k] = Math.max(tops[k] ?? 0, w);
    }
  }
  const up = Object.values(best).filter((b) => b.before > 0 && b.recent > b.before).length;
  const rows = Object.keys(firsts).map((k) => ({ exercise: k, from: firsts[k], to: tops[k] }));
  return { up, rows };
}

export async function loadSummary(date: string): Promise<Summary | null> {
  const profile = await repo.getProfile();
  if (!profile) return null;
  const weights = await repo.allWeights();
  const a = avgAt(weights, date);
  const todayLog = await repo.getDay(date);
  const week = weekNumber(profile, date);
  const strength = await strengthTrend(date);
  const st = status(weights, date, strength.up);

  const from7 = addDays(date, -6);
  const days7 = await repo.getDays(from7, date);
  const stepVals = days7.filter((d) => d.steps != null).map((d) => d.steps as number);
  const meals = await repo.getMeals(date);
  const specials = await repo.getSpecials();
  const open = await repo.openSession();
  const todaySession = await repo.sessionOn(date);

  // consistency marks: from the Monday of week 1 through end of current week (max 4 weeks shown)
  const firstWeek = Math.max(1, week - 3);
  const gridStart = addDays(profile.start_date, (firstWeek - 1) * 7);
  const gridEnd = addDays(profile.start_date, week * 7 - 1);
  const logs = await repo.getDays(gridStart, gridEnd);
  const nut = await repo.nutritionByDay(gridStart, gridEnd);
  const sess = await repo.sessionsBetween(gridStart, gridEnd);
  const marks = range(gridStart, gridEnd).map((d) => {
    if (d > date) return { date: d, mark: 'future' as DayMark };
    const l = logs.find((x) => x.date === d);
    const n = nut.find((x) => x.date === d);
    const wk = weekNumber(profile, d);
    const checks = [
      l?.weight_kg != null,
      (n?.kcal ?? 0) > 0,
      (l?.steps ?? 0) >= stepTarget(wk),
      !isLiftDay(d) || sess.some((s) => s.date === d && s.completed),
    ];
    const c = checks.filter(Boolean).length;
    if (d === date) return { date: d, mark: 'today' as DayMark };
    return { date: d, mark: (c === checks.length ? 'all' : c > 0 ? 'some' : 'none') as DayMark };
  });

  // logging streak: consecutive days back from yesterday/today with weight or food logged
  let streak = 0;
  const allLogs = await repo.getDays(profile.start_date, date);
  const allNut = await repo.nutritionByDay(profile.start_date, date);
  for (let d = date; d >= profile.start_date; d = addDays(d, -1)) {
    const has = allLogs.some((x) => x.date === d && x.weight_kg != null) || allNut.some((x) => x.date === d && x.kcal > 0);
    if (has) streak++;
    else if (d !== date) break;
  }

  const allSessions = await repo.sessions();

  return {
    profile,
    date,
    day: dayNumber(profile, date),
    week,
    weights,
    avg: a?.avg ?? null,
    avgN: a?.n ?? 0,
    todayWeight: todayLog?.weight_kg ?? null,
    change: weeklyChange(weights, date),
    status: st,
    milestone: a ? nextMilestone(a.avg) : null,
    lostKg: a ? profile.start_weight_kg - a.avg : 0,
    steps: todayLog?.steps ?? 0,
    stepsSource: todayLog?.steps_source ?? null,
    stepTarget: stepTarget(week),
    stepAvg7: stepVals.length ? stepVals.reduce((x, y) => x + y, 0) / stepVals.length : null,
    sleep: todayLog?.sleep_hours ?? null,
    kcal: meals.reduce((s, m) => s + m.calories, 0),
    protein: meals.reduce((s, m) => s + m.protein_g, 0),
    special: specials[weekday(date)] ?? null,
    liftDay: isLiftDay(date),
    nextWorkout: scheduledDay(date),
    todaySession,
    openSession: open,
    marks,
    loggedStreak: streak,
    strengthUp: strength.up,
    sessionsDone: allSessions.filter((s) => s.completed).length,
  };
}
