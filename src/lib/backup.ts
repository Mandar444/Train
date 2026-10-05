import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ALL_TABLES, db, emitChange } from './db';
import { today } from './dates';

async function shareText(name: string, text: string, mime: string) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(text);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(f.uri, { mimeType: mime, dialogTitle: name });
  }
}

export async function exportJSON(): Promise<void> {
  const out: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) out[t] = await db().getAllAsync(`SELECT * FROM ${t}`);
  await shareText(`mandar-cut-backup-${today()}.json`, JSON.stringify({ app: 'mandar-cut', version: 1, exported_at: new Date().toISOString(), data: out }, null, 2), 'application/json');
}

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export async function exportCSV(): Promise<void> {
  const rows = await db().getAllAsync<Record<string, unknown>>(`
    SELECT d.date, d.weight_kg, d.steps, d.sleep_hours,
      (SELECT SUM(calories) FROM meal_item m WHERE m.date = d.date) AS calories,
      (SELECT ROUND(SUM(protein_g)) FROM meal_item m WHERE m.date = d.date) AS protein_g,
      (SELECT type FROM workout_session w WHERE w.date = d.date AND w.completed = 1 LIMIT 1) AS workout,
      (SELECT waist_cm FROM measurement x WHERE x.date = d.date) AS waist_cm,
      d.notes
    FROM daily_log d ORDER BY d.date`);
  const sets = await db().getAllAsync<Record<string, unknown>>(`
    SELECT w.date, w.type AS workout, s.exercise, s.set_number, s.weight_kg, s.reps, s.rir, s.pain
    FROM exercise_set s JOIN workout_session w ON w.id = s.session_id WHERE s.done = 1 ORDER BY w.date, s.id`);
  await shareText(`mandar-cut-daily-${today()}.csv`, csv(rows), 'text/csv');
  if (sets.length) await shareText(`mandar-cut-sets-${today()}.csv`, csv(sets), 'text/csv');
}

export async function importJSON(): Promise<{ ok: boolean; message: string }> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return { ok: false, message: 'Cancelled' };
  const text = await new File(res.assets[0].uri).text();
  let parsed: { app?: string; data?: Record<string, Record<string, unknown>[]> };
  try { parsed = JSON.parse(text); } catch { return { ok: false, message: 'That file is not valid JSON.' }; }
  if (parsed.app !== 'mandar-cut' || !parsed.data) return { ok: false, message: 'Not a Mandar Cut backup.' };
  const d = db();
  await d.withTransactionAsync(async () => {
    for (const t of [...ALL_TABLES].reverse()) await d.execAsync(`DELETE FROM ${t}`);
    for (const t of ALL_TABLES) {
      for (const row of parsed.data![t] ?? []) {
        const cols = Object.keys(row);
        if (!cols.length) continue;
        await d.runAsync(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, ...cols.map((c) => row[c] as string | number | null));
      }
    }
  });
  emitChange();
  return { ok: true, message: 'Backup restored.' };
}
