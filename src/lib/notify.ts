import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { LIFT_DAYS } from './plan';
import { DEFAULT_REMINDERS, getKV, Reminders } from './repo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'reminders';
const STEP_NUDGE_ID = 'step-nudge';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#D4FF4F',
    });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Rebuild every recurring reminder from settings. Messages never shame. */
export async function scheduleAll(): Promise<void> {
  const r = await getKV<Reminders>('reminders', DEFAULT_REMINDERS);
  const ok = await ensurePermission();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!ok) return;
  const T = Notifications.SchedulableTriggerInputTypes;
  if (r.weigh.on) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Morning weigh-in', body: 'Record your morning weight when convenient — after the bathroom, before food.' },
      trigger: { type: T.DAILY, hour: r.weigh.hour, minute: r.weigh.minute, channelId: CHANNEL },
    });
  }
  if (r.workout.on) {
    for (const d of LIFT_DAYS) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Training day', body: 'Today’s full-body session is ready. Previous numbers are waiting in the app.' },
        trigger: { type: T.WEEKLY, weekday: d + 1, hour: r.workout.hour, minute: r.workout.minute, channelId: CHANNEL },
      });
    }
  }
  if (r.meals.on) {
    for (const [h, m] of [[9, 30], [14, 30], [21, 30]] as const) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Meal log', body: 'Log the meal if you haven’t already. Approximate is fine.' },
        trigger: { type: T.DAILY, hour: h, minute: m, channelId: CHANNEL },
      });
    }
  }
  if (r.review.on) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Weekly review', body: 'Review weight average, waist, steps and gym progress.' },
      trigger: { type: T.WEEKLY, weekday: 1, hour: r.review.hour, minute: r.review.minute, channelId: CHANNEL },
    });
  }
}

/** Evening step nudge — only scheduled when today's steps are below target. */
export async function refreshStepNudge(steps: number, target: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STEP_NUDGE_ID);
    const r = await getKV<Reminders>('reminders', DEFAULT_REMINDERS);
    if (!r.steps.on || steps >= target) return;
    const at = new Date();
    at.setHours(r.steps.hour, r.steps.minute, 0, 0);
    if (at.getTime() <= Date.now()) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: STEP_NUDGE_ID,
      content: { title: 'Steps', body: 'You’re below today’s step target; a short walk could close the gap.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  } catch {
    // reminders are best-effort
  }
}
