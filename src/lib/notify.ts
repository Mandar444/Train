import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { LIFT_DAYS, PROGRAM, SCHEDULE } from './plan';
import { getReminders } from './repo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android locks a channel's sound when it is first created, so the custom sound needs a new channel id.
const CHANNEL = 'goal-reminders';
const SOUND = 'goal.wav';
const STEP_NUDGE_ID = 'step-nudge';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.deleteNotificationChannelAsync('reminders').catch(() => {});
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'GOAL reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND,
      vibrationPattern: [0, 120, 80, 120],
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
  const r = await getReminders();
  const ok = await ensurePermission();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!ok) return;
  const T = Notifications.SchedulableTriggerInputTypes;
  if (r.weigh.on) {
    await Notifications.scheduleNotificationAsync({
      content: { sound: SOUND, title: 'Morning weigh-in', body: 'Record your morning weight after the bathroom, before food.' },
      trigger: { type: T.DAILY, hour: r.weigh.hour, minute: r.weigh.minute, channelId: CHANNEL },
    });
  }
  if (r.workout.on) {
    // Mon to Sat, one reminder per training day with that day's workout
    for (const d of LIFT_DAYS) {
      const day = SCHEDULE[d];
      const name = day ? PROGRAM[day].name : 'Training';
      await Notifications.scheduleNotificationAsync({
        content: { sound: SOUND, title: `${name} today`, body: `${day ? PROGRAM[day].subtitle + '. ' : ''}Your last numbers and today's weights are in the Workout tab.` },
        trigger: { type: T.WEEKLY, weekday: d + 1, hour: r.workout.hour, minute: r.workout.minute, channelId: CHANNEL },
      });
    }
  }
  if (r.meals.on) {
    for (const [h, m] of [[9, 30], [14, 30], [21, 30]] as const) {
      await Notifications.scheduleNotificationAsync({
        content: { sound: SOUND, title: 'Meal log', body: 'Log the meal if you haven’t already. Approximate is fine.' },
        trigger: { type: T.DAILY, hour: h, minute: m, channelId: CHANNEL },
      });
    }
  }
  if (r.review.on) {
    await Notifications.scheduleNotificationAsync({
      content: { sound: SOUND, title: 'Weekly review', body: 'Review weight average, waist, steps and gym progress.' },
      trigger: { type: T.WEEKLY, weekday: 1, hour: r.review.hour, minute: r.review.minute, channelId: CHANNEL },
    });
  }
}

const NUDGES = { steps: 'nudge-steps', protein: 'nudge-protein', missed: 'nudge-missed' } as const;

async function nudge(id: string, on: boolean, hour: number, minute: number, title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  if (!on) return;
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  if (at.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { sound: SOUND, title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
  });
}

/**
 * Today's smart nudges. Each one is only scheduled when it's still needed and is re-planned
 * every time today's numbers change, so it never fires after the goal is already done.
 */
export async function refreshNudges(t: {
  steps: number; stepTarget: number;
  protein: number; proteinMin: number;
  workoutName: string | null; workoutDone: boolean;
}): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const r = await getReminders();
    const stepsLeft = Math.max(0, t.stepTarget - t.steps);
    await nudge(NUDGES.steps, r.steps.on && stepsLeft > 0, r.steps.hour, r.steps.minute,
      'Steps', `${stepsLeft.toLocaleString('en-US')} steps to go today. A ${Math.ceil(stepsLeft / 110)} min walk closes it.`);
    const pLeft = Math.max(0, Math.round(t.proteinMin - t.protein));
    await nudge(NUDGES.protein, r.protein.on && pLeft > 0, r.protein.hour, r.protein.minute,
      'Protein check', `${Math.round(t.protein)} g so far, ${pLeft} g to go. Curd, milk, eggs or a whey scoop will close it.`);
    await nudge(NUDGES.missed, r.missed.on && !!t.workoutName && !t.workoutDone, r.missed.hour, r.missed.minute,
      `${t.workoutName ?? 'Workout'} not done yet`, 'Still time for a short version: the first 3 exercises take about 30 min.');
  } catch {
    // reminders are best-effort
  }
}
