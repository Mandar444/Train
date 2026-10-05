import { db, emitChange } from './db';
import { DEFAULT_PRESETS, DEFAULT_SPECIALS, EXERCISES, MealKey, PlanItem, Special, WORKOUTS, WorkoutPlan, WorkoutType } from './plan';
import { today } from './dates';

// ---------- types ----------
export type Profile = {
  id: 1; name: string; age: number | null; sex: string | null; height_cm: number | null;
  start_weight_kg: number; target_weight_kg: number; start_date: string;
  kcal_target: number; protein_min: number; protein_max: number; created_at: string;
};
export type DailyLog = {
  date: string; weight_kg: number | null; weight_time: string | null; weight_note: string | null;
  steps: number | null; steps_source: string | null; sleep_hours: number | null; sleep_source: string | null;
  energy: number | null; notes: string | null;
};
export type MealItem = { id: number; date: string; meal: MealKey; name: string; calories: number; protein_g: number; created_at: string };
export type FoodPreset = { id: number; name: string; calories: number; protein_g: number; special: Special | null; sort: number };
export type Session = { id: number; date: string; type: WorkoutType; started_at: string; finished_at: string | null; completed: number; notes: string | null };
export type ExSet = { id: number; session_id: number; exercise: string; set_number: number; weight_kg: number | null; reps: number | null; rir: number | null; done: number; pain: number };
export type Measurement = { date: string; waist_cm: number | null; neck_cm: number | null; chest_cm: number | null; arm_cm: number | null; thigh_cm: number | null };
export type Photo = { id: number; date: string; angle: 'front' | 'side' | 'back'; uri: string; note: string | null };

export type Reminders = {
  weigh: { on: boolean; hour: number; minute: number };
  workout: { on: boolean; hour: number; minute: number };
  steps: { on: boolean; hour: number; minute: number };
  meals: { on: boolean };
  review: { on: boolean; hour: number; minute: number };
};
export const DEFAULT_REMINDERS: Reminders = {
  weigh: { on: true, hour: 7, minute: 0 },
  workout: { on: true, hour: 19, minute: 0 },
  steps: { on: true, hour: 20, minute: 0 },
  meals: { on: false },
  review: { on: true, hour: 21, minute: 0 },
};

// ---------- kv ----------
export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const r = await db().getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  if (!r) return fallback;
  try { return JSON.parse(r.value) as T; } catch { return fallback; }
}
export async function setKV(key: string, value: unknown): Promise<void> {
  await db().runAsync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value));
  emitChange();
}

// ---------- profile ----------
export async function getProfile(): Promise<Profile | null> {
  return db().getFirstAsync<Profile>('SELECT * FROM profile WHERE id = 1');
}
export async function saveProfile(p: Omit<Profile, 'id' | 'created_at'> & { created_at?: string }): Promise<void> {
  await db().runAsync(
    `INSERT INTO profile (id, name, age, sex, height_cm, start_weight_kg, target_weight_kg, start_date, kcal_target, protein_min, protein_max, created_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, age=excluded.age, sex=excluded.sex, height_cm=excluded.height_cm,
       start_weight_kg=excluded.start_weight_kg, target_weight_kg=excluded.target_weight_kg, start_date=excluded.start_date,
       kcal_target=excluded.kcal_target, protein_min=excluded.protein_min, protein_max=excluded.protein_max`,
    p.name, p.age, p.sex, p.height_cm, p.start_weight_kg, p.target_weight_kg, p.start_date, p.kcal_target, p.protein_min, p.protein_max, p.created_at ?? new Date().toISOString(),
  );
  emitChange();
}

export async function seedDefaults(): Promise<void> {
  const n = await db().getFirstAsync<{ c: number }>('SELECT COUNT(*) c FROM food_preset');
  if ((n?.c ?? 0) === 0) {
    let i = 0;
    for (const p of DEFAULT_PRESETS) {
      await db().runAsync('INSERT INTO food_preset (name, calories, protein_g, special, sort) VALUES (?, ?, ?, ?, ?)', p.name, p.calories, p.protein_g, p.special, i++);
    }
  }
}

// ---------- daily log ----------
export async function getDay(date: string): Promise<DailyLog | null> {
  return db().getFirstAsync<DailyLog>('SELECT * FROM daily_log WHERE date = ?', date);
}
export async function getDays(from: string, to: string): Promise<DailyLog[]> {
  return db().getAllAsync<DailyLog>('SELECT * FROM daily_log WHERE date BETWEEN ? AND ? ORDER BY date', from, to);
}
export async function allWeights(): Promise<{ date: string; weight_kg: number }[]> {
  return db().getAllAsync('SELECT date, weight_kg FROM daily_log WHERE weight_kg IS NOT NULL ORDER BY date');
}
async function ensureDay(date: string) {
  await db().runAsync('INSERT OR IGNORE INTO daily_log (date) VALUES (?)', date);
}
export async function setWeight(date: string, kg: number, note: string | null): Promise<void> {
  await ensureDay(date);
  const t = new Date();
  await db().runAsync('UPDATE daily_log SET weight_kg = ?, weight_time = ?, weight_note = ? WHERE date = ?', kg, t.toISOString(), note, date);
  emitChange();
}
export async function clearWeight(date: string): Promise<void> {
  await db().runAsync('UPDATE daily_log SET weight_kg = NULL, weight_time = NULL, weight_note = NULL WHERE date = ?', date);
  emitChange();
}
export async function setSteps(date: string, steps: number, source: 'manual' | 'health'): Promise<void> {
  await ensureDay(date);
  if (source === 'health') {
    // never overwrite a manual override with synced data
    await db().runAsync("UPDATE daily_log SET steps = ?, steps_source = 'health' WHERE date = ? AND (steps_source IS NULL OR steps_source = 'health')", steps, date);
  } else {
    await db().runAsync("UPDATE daily_log SET steps = ?, steps_source = 'manual' WHERE date = ?", steps, date);
  }
}
export async function setSleep(date: string, hours: number, source: 'manual' | 'health'): Promise<void> {
  await ensureDay(date);
  if (source === 'health') {
    await db().runAsync("UPDATE daily_log SET sleep_hours = ?, sleep_source = 'health' WHERE date = ? AND (sleep_source IS NULL OR sleep_source = 'health')", hours, date);
  } else {
    await db().runAsync("UPDATE daily_log SET sleep_hours = ?, sleep_source = 'manual' WHERE date = ?", hours, date);
  }
}
export async function setEnergy(date: string, energy: number): Promise<void> {
  await ensureDay(date);
  await db().runAsync('UPDATE daily_log SET energy = ? WHERE date = ?', energy, date);
  emitChange();
}

// ---------- food ----------
export async function getPresets(): Promise<FoodPreset[]> {
  return db().getAllAsync<FoodPreset>('SELECT * FROM food_preset ORDER BY sort, id');
}
export async function savePreset(p: Partial<FoodPreset> & { name: string; calories: number; protein_g: number }): Promise<void> {
  if (p.id) {
    await db().runAsync('UPDATE food_preset SET name = ?, calories = ?, protein_g = ?, special = ? WHERE id = ?', p.name, p.calories, p.protein_g, p.special ?? null, p.id);
  } else {
    const m = await db().getFirstAsync<{ s: number }>('SELECT COALESCE(MAX(sort), 0) + 1 s FROM food_preset');
    await db().runAsync('INSERT INTO food_preset (name, calories, protein_g, special, sort) VALUES (?, ?, ?, ?, ?)', p.name, p.calories, p.protein_g, p.special ?? null, m?.s ?? 0);
  }
  emitChange();
}
export async function deletePreset(id: number): Promise<void> {
  await db().runAsync('DELETE FROM food_preset WHERE id = ?', id);
  emitChange();
}
export async function getMeals(date: string): Promise<MealItem[]> {
  return db().getAllAsync<MealItem>('SELECT * FROM meal_item WHERE date = ? ORDER BY id', date);
}
export async function addMeal(date: string, meal: MealKey, name: string, calories: number, protein: number): Promise<void> {
  await db().runAsync('INSERT INTO meal_item (date, meal, name, calories, protein_g, created_at) VALUES (?, ?, ?, ?, ?, ?)', date, meal, name, Math.round(calories), protein, new Date().toISOString());
  emitChange();
}
export async function mealDaysBetween(from: string, to: string): Promise<{ date: string; kcal: number }[]> {
  return db().getAllAsync('SELECT date, SUM(calories) kcal FROM meal_item WHERE date BETWEEN ? AND ? GROUP BY date', from, to);
}
export async function recentFoods(limit = 8): Promise<{ name: string; calories: number; protein_g: number }[]> {
  return db().getAllAsync(
    `SELECT name, calories, protein_g FROM meal_item WHERE id IN (SELECT MAX(id) FROM meal_item GROUP BY name) ORDER BY id DESC LIMIT ?`, limit);
}
export async function deleteMeal(id: number): Promise<void> {
  await db().runAsync('DELETE FROM meal_item WHERE id = ?', id);
  emitChange();
}
export async function nutritionByDay(from: string, to: string): Promise<{ date: string; kcal: number; protein: number }[]> {
  return db().getAllAsync('SELECT date, SUM(calories) kcal, SUM(protein_g) protein FROM meal_item WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date', from, to);
}
export async function getSpecials(): Promise<Record<number, Special>> {
  return getKV('mess_specials', DEFAULT_SPECIALS);
}

// ---------- workout plan (editable) ----------
export function defaultPlan(): WorkoutPlan {
  const mk = (keys: string[]): PlanItem[] => keys.map((k) => ({ key: k, sets: EXERCISES[k].sets, repMin: EXERCISES[k].repMin, repMax: EXERCISES[k].repMax }));
  return { A: mk(WORKOUTS.A), B: mk(WORKOUTS.B) };
}
export async function getWorkouts(): Promise<WorkoutPlan> {
  const p = await getKV<WorkoutPlan | null>('workouts', null);
  if (!p) return defaultPlan();
  // drop anything no longer in the library
  return { A: p.A.filter((i) => EXERCISES[i.key]), B: p.B.filter((i) => EXERCISES[i.key]) };
}
export async function saveWorkouts(p: WorkoutPlan): Promise<void> {
  await setKV('workouts', p);
}

// ---------- workouts ----------
export async function lastCompletedSession(): Promise<Session | null> {
  return db().getFirstAsync<Session>('SELECT * FROM workout_session WHERE completed = 1 ORDER BY date DESC, id DESC LIMIT 1');
}
export async function openSession(): Promise<Session | null> {
  return db().getFirstAsync<Session>('SELECT * FROM workout_session WHERE completed = 0 ORDER BY id DESC LIMIT 1');
}
export async function sessionOn(date: string): Promise<Session | null> {
  return db().getFirstAsync<Session>('SELECT * FROM workout_session WHERE date = ? ORDER BY id DESC LIMIT 1', date);
}
export async function sessions(): Promise<Session[]> {
  return db().getAllAsync<Session>('SELECT * FROM workout_session ORDER BY date, id');
}
export async function sessionsBetween(from: string, to: string): Promise<Session[]> {
  return db().getAllAsync<Session>('SELECT * FROM workout_session WHERE date BETWEEN ? AND ? ORDER BY date, id', from, to);
}
export async function setsFor(sessionId: number): Promise<ExSet[]> {
  return db().getAllAsync<ExSet>('SELECT * FROM exercise_set WHERE session_id = ? ORDER BY id', sessionId);
}
export async function startSession(date: string, type: WorkoutType, plan: { exercise: string; sets: number; weight: number | null }[]): Promise<number> {
  const r = await db().runAsync('INSERT INTO workout_session (date, type, started_at, completed) VALUES (?, ?, ?, 0)', date, type, new Date().toISOString());
  const id = Number(r.lastInsertRowId);
  for (const p of plan) {
    for (let i = 1; i <= p.sets; i++) {
      await db().runAsync('INSERT INTO exercise_set (session_id, exercise, set_number, weight_kg, done, pain) VALUES (?, ?, ?, ?, 0, 0)', id, p.exercise, i, p.weight);
    }
  }
  emitChange();
  return id;
}
export async function updateSet(id: number, patch: Partial<Pick<ExSet, 'weight_kg' | 'reps' | 'rir' | 'done' | 'pain'>>): Promise<void> {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  const sql = `UPDATE exercise_set SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
  await db().runAsync(sql, ...keys.map((k) => (patch[k] ?? null) as number | null), id);
  emitChange();
}
export async function addSet(sessionId: number, exercise: string): Promise<void> {
  const last = await db().getFirstAsync<ExSet>('SELECT * FROM exercise_set WHERE session_id = ? AND exercise = ? ORDER BY set_number DESC LIMIT 1', sessionId, exercise);
  await db().runAsync('INSERT INTO exercise_set (session_id, exercise, set_number, weight_kg, done, pain) VALUES (?, ?, ?, ?, 0, 0)', sessionId, exercise, (last?.set_number ?? 0) + 1, last?.weight_kg ?? null);
  emitChange();
}
export async function swapExercise(sessionId: number, from: string, to: string): Promise<void> {
  await db().runAsync('UPDATE exercise_set SET exercise = ? WHERE session_id = ? AND exercise = ? AND done = 0', to, sessionId, from);
  emitChange();
}
export async function finishSession(id: number, notes: string | null): Promise<void> {
  await db().runAsync('UPDATE workout_session SET completed = 1, finished_at = ?, notes = ? WHERE id = ?', new Date().toISOString(), notes, id);
  emitChange();
}
export async function discardSession(id: number): Promise<void> {
  await db().runAsync('DELETE FROM exercise_set WHERE session_id = ?', id);
  await db().runAsync('DELETE FROM workout_session WHERE id = ?', id);
  emitChange();
}
/** All completed sets for an exercise, joined with session date. */
export async function exerciseHistory(exercise: string): Promise<(ExSet & { date: string; type: WorkoutType })[]> {
  return db().getAllAsync(
    `SELECT s.*, w.date, w.type FROM exercise_set s JOIN workout_session w ON w.id = s.session_id
     WHERE s.exercise = ? AND w.completed = 1 AND s.done = 1 ORDER BY w.date, w.id, s.set_number`, exercise);
}
export async function lastSetsFor(exercise: string, excludeSession?: number): Promise<ExSet[]> {
  const s = await db().getFirstAsync<{ id: number }>(
    `SELECT w.id FROM workout_session w JOIN exercise_set s ON s.session_id = w.id
     WHERE s.exercise = ? AND w.completed = 1 AND s.done = 1 AND w.id != ? ORDER BY w.date DESC, w.id DESC LIMIT 1`, exercise, excludeSession ?? -1);
  if (!s) return [];
  return db().getAllAsync<ExSet>('SELECT * FROM exercise_set WHERE session_id = ? AND exercise = ? AND done = 1 ORDER BY set_number', s.id, exercise);
}

// ---------- measurements & photos ----------
export async function measurements(): Promise<Measurement[]> {
  return db().getAllAsync<Measurement>('SELECT * FROM measurement ORDER BY date');
}
export async function saveMeasurement(m: Measurement): Promise<void> {
  await db().runAsync(
    `INSERT INTO measurement (date, waist_cm, neck_cm, chest_cm, arm_cm, thigh_cm) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET waist_cm = COALESCE(excluded.waist_cm, waist_cm), neck_cm = COALESCE(excluded.neck_cm, neck_cm),
       chest_cm = COALESCE(excluded.chest_cm, chest_cm), arm_cm = COALESCE(excluded.arm_cm, arm_cm), thigh_cm = COALESCE(excluded.thigh_cm, thigh_cm)`,
    m.date, m.waist_cm, m.neck_cm, m.chest_cm, m.arm_cm, m.thigh_cm);
  emitChange();
}
export async function photos(): Promise<Photo[]> {
  return db().getAllAsync<Photo>('SELECT * FROM photo ORDER BY date, id');
}
export async function addPhoto(date: string, angle: Photo['angle'], uri: string): Promise<void> {
  await db().runAsync('INSERT INTO photo (date, angle, uri) VALUES (?, ?, ?)', date, angle, uri);
  emitChange();
}
export async function deletePhoto(id: number): Promise<void> {
  await db().runAsync('DELETE FROM photo WHERE id = ?', id);
  emitChange();
}

export function nowDate(): string {
  return today();
}
