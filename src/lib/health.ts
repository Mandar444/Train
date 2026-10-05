import { Linking, Platform } from 'react-native';
import {
  aggregateGroupByPeriod,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { addDays, iso, parse, today } from './dates';
import { emitChange } from './db';
import { getKV, setKV, setSleep, setSteps } from './repo';

export type HealthState = 'unsupported' | 'needs_install' | 'needs_update' | 'available';

export async function healthAvailability(): Promise<HealthState> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    const s = await getSdkStatus();
    if (s === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs_update';
    return 'needs_install';
  } catch {
    return 'unsupported';
  }
}

export function openHealthConnectPlayStore() {
  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'),
  );
}

export function openHCSettings() {
  try { openHealthConnectSettings(); } catch { /* ignore */ }
}

export async function grantedTypes(): Promise<{ steps: boolean; sleep: boolean }> {
  try {
    if (!(await initialize())) return { steps: false, sleep: false };
    const g = await getGrantedPermissions();
    const has = (t: string) => g.some((p) => 'recordType' in p && p.recordType === t && p.accessType === 'read');
    return { steps: has('Steps'), sleep: has('SleepSession') };
  } catch {
    return { steps: false, sleep: false };
  }
}

export async function connectHealth(): Promise<{ steps: boolean; sleep: boolean }> {
  const ok = await initialize();
  if (!ok) throw new Error('Health Connect is not available on this phone.');
  await requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'SleepSession' },
  ]);
  const g = await grantedTypes();
  await setKV('health_connected', g.steps);
  if (g.steps) await syncHealth(30);
  return g;
}

export async function disconnectHealth(): Promise<void> {
  await setKV('health_connected', false);
}

/** Pull daily step totals (and last nights' sleep) for the last `days` days. */
export async function syncHealth(days = 7): Promise<{ ok: boolean; today?: number; error?: string }> {
  try {
    const enabled = await getKV('health_connected', false);
    if (!enabled) return { ok: false };
    if (!(await initialize())) return { ok: false, error: 'Health Connect unavailable' };
    const g = await grantedTypes();
    const end = new Date();
    const startDay = addDays(today(), -(days - 1));
    const start = parse(startDay);
    let todaySteps: number | undefined;
    if (g.steps) {
      const groups = await aggregateGroupByPeriod({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        timeRangeSlicer: { period: 'DAYS', length: 1 },
      });
      for (const grp of groups) {
        const d = iso(new Date(grp.startTime));
        const n = Math.round(grp.result.COUNT_TOTAL ?? 0);
        await setSteps(d, n, 'health');
        if (d === today()) todaySteps = n;
      }
    }
    if (g.sleep) {
      const sl = await readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between', startTime: addHours(start, -12).toISOString(), endTime: end.toISOString() },
      });
      const byDay: Record<string, number> = {};
      for (const r of sl.records) {
        const e = new Date(r.endTime);
        const hours = (e.getTime() - new Date(r.startTime).getTime()) / 3600000;
        const d = iso(e); // attribute sleep to the morning it ended
        byDay[d] = (byDay[d] ?? 0) + hours;
      }
      for (const [d, h] of Object.entries(byDay)) await setSleep(d, Math.round(h * 10) / 10, 'health');
    }
    await setKV('health_last_sync', new Date().toISOString());
    emitChange();
    return { ok: true, today: todaySteps };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3600000);
}
