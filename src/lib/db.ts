import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function db(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('mandarcut.db');
  return _db;
}

const SCHEMA_VERSION = 1;

export async function migrate(): Promise<void> {
  const d = db();
  await d.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await d.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const v = row?.user_version ?? 0;
  if (v < 1) {
    await d.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        age INTEGER, sex TEXT, height_cm REAL,
        start_weight_kg REAL NOT NULL,
        target_weight_kg REAL NOT NULL,
        start_date TEXT NOT NULL,
        kcal_target INTEGER NOT NULL,
        protein_min INTEGER NOT NULL,
        protein_max INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS daily_log (
        date TEXT PRIMARY KEY,
        weight_kg REAL, weight_time TEXT, weight_note TEXT,
        steps INTEGER, steps_source TEXT,
        sleep_hours REAL, sleep_source TEXT,
        energy INTEGER,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS meal_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, meal TEXT NOT NULL,
        name TEXT NOT NULL, calories INTEGER NOT NULL, protein_g REAL NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS meal_item_date ON meal_item(date);
      CREATE TABLE IF NOT EXISTS food_preset (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, calories INTEGER NOT NULL, protein_g REAL NOT NULL,
        special TEXT, sort INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS workout_session (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, type TEXT NOT NULL,
        started_at TEXT NOT NULL, finished_at TEXT,
        completed INTEGER NOT NULL DEFAULT 0, notes TEXT
      );
      CREATE TABLE IF NOT EXISTS exercise_set (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
        exercise TEXT NOT NULL, set_number INTEGER NOT NULL,
        weight_kg REAL, reps INTEGER, rir INTEGER,
        done INTEGER NOT NULL DEFAULT 0, pain INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS exercise_set_session ON exercise_set(session_id);
      CREATE INDEX IF NOT EXISTS exercise_set_ex ON exercise_set(exercise);
      CREATE TABLE IF NOT EXISTS measurement (
        date TEXT PRIMARY KEY,
        waist_cm REAL, neck_cm REAL, chest_cm REAL, arm_cm REAL, thigh_cm REAL
      );
      CREATE TABLE IF NOT EXISTS photo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, angle TEXT NOT NULL, uri TEXT NOT NULL, note TEXT
      );
    `);
  }
  if (v < SCHEMA_VERSION) await d.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// ---- change notification so screens refresh after writes ----
type Listener = () => void;
const listeners = new Set<Listener>();
export function onChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function emitChange(): void {
  listeners.forEach((l) => l());
}

export const ALL_TABLES = ['profile', 'kv', 'daily_log', 'meal_item', 'food_preset', 'workout_session', 'exercise_set', 'measurement', 'photo'] as const;
