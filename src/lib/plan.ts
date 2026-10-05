// The static plan: a 6-day push / pull / legs split, run twice a week, built to keep muscle on a hard cut.

export { EXERCISES, EXERCISE_LIST, GROUPS } from './exercises';
export type { ExerciseDef, Group, Equip, Unit } from './exercises';
import { EXERCISES } from './exercises';

/** The six training days of the current program. */
export type DayKey = 'push_a' | 'pull_a' | 'legs_a' | 'push_b' | 'pull_b' | 'legs_b';
/** What a stored session's `type` column holds: a DayKey for new sessions, 'A' / 'B' for old full body sessions. */
export type WorkoutType = string;

export const DAY_KEYS: DayKey[] = ['push_a', 'pull_a', 'legs_a', 'push_b', 'pull_b', 'legs_b'];

export type PlanItem = { key: string; sets: number; repMin: number; repMax: number; rest?: number };
export type WorkoutPlan = Record<DayKey, PlanItem[]>;

export type DayInfo = {
  key: DayKey;
  name: string;
  short: 'PUSH' | 'PULL' | 'LEGS';
  subtitle: string;
  weekday: number;
  focus: string[];
  finisher: string | null;
  finisherKey: string | null;
  finisherMin: number;
  why: string;
  items: (PlanItem & { note?: string })[];
  minutes: number;
};

/** Multi-joint lifts. Everything else counts as isolation work. */
export const COMPOUND = new Set([
  'squat', 'front_squat', 'goblet_squat', 'db_squat', 'leg_press', 'hack_squat', 'bulgarian_split_squat', 'walking_lunge', 'reverse_lunge', 'step_up',
  'rdl', 'db_rdl', 'deadlift', 'sumo_deadlift', 'good_morning', 'hip_thrust', 'kb_swing', 'rack_pull',
  'bench', 'incline_bench', 'decline_bench', 'db_bench', 'incline_db_press', 'chest_press_machine', 'pushup', 'dips', 'close_grip_bench',
  'lat_pulldown', 'close_grip_pulldown', 'pullup', 'chinup', 'assisted_pullup', 'seated_row', 'bent_over_row', 'one_arm_db_row', 'tbar_row',
  'chest_supported_row', 'inverted_row', 'shoulder_press', 'barbell_ohp', 'arnold_press', 'upright_row', 'thruster', 'clean_press',
]);

export function isCompound(key: string): boolean {
  return COMPOUND.has(key);
}
/** Rest between sets in seconds: heavy compounds 150, up to 12 reps 90, lighter work 60. */
export function restFor(key: string, repMax: number): number {
  if (isCompound(key) && repMax <= 8) return 150;
  if (repMax <= 12) return 90;
  return 60;
}
/** Target reps in reserve: 2 on compounds, 1 on isolation work. */
export function rirFor(key: string): number {
  return isCompound(key) ? 2 : 1;
}

/** Rough session length: warm-up, every set (about 40 s of work plus rest), and the finisher. Rounded to 5 min. */
export function estMinutes(items: PlanItem[], finisherMin = 0): number {
  const sec = 5 * 60 + items.reduce((s, i) => s + i.sets * (40 + (i.rest ?? restFor(i.key, i.repMax))), 0);
  return Math.round((sec / 60 + finisherMin) / 5) * 5;
}

type RawItem = [key: string, sets: number, repMin: number, repMax: number, note?: string];
function day(d: Omit<DayInfo, 'items' | 'minutes'>, raw: RawItem[]): DayInfo {
  const items = raw.map(([key, sets, repMin, repMax, note]) => ({ key, sets, repMin, repMax, rest: restFor(key, repMax), ...(note ? { note } : {}) }));
  return { ...d, items, minutes: estMinutes(items, d.finisherMin) };
}

export const PROGRAM: Record<DayKey, DayInfo> = {
  push_a: day({
    key: 'push_a', name: 'Push A', short: 'PUSH', subtitle: 'Chest focus', weekday: 1,
    focus: ['Chest', 'Shoulders', 'Triceps'],
    finisher: '15 min incline walk', finisherKey: 'brisk_walk', finisherMin: 15,
    why: 'Heavy pressing tells your body to keep chest and shoulder muscle while you eat less.',
  }, [['bench', 4, 6, 8], ['incline_db_press', 3, 8, 10], ['shoulder_press', 3, 8, 10], ['lateral_raise', 3, 12, 15], ['rope_pushdown', 3, 10, 12], ['overhead_ext', 2, 12, 15]]),
  pull_a: day({
    key: 'pull_a', name: 'Pull A', short: 'PULL', subtitle: 'Back width', weekday: 2,
    focus: ['Lats', 'Upper back', 'Rear delts', 'Biceps'],
    finisher: '15 min stationary bike', finisherKey: 'cycling', finisherMin: 15,
    why: 'Pulldowns and rows keep your back wide, so your waist looks smaller as the fat comes off.',
  }, [['lat_pulldown', 4, 8, 10], ['bent_over_row', 3, 8, 10], ['seated_row', 3, 10, 12], ['face_pull', 3, 12, 15], ['barbell_curl', 3, 8, 12], ['hammer_curl', 2, 10, 12]]),
  legs_a: day({
    key: 'legs_a', name: 'Legs A', short: 'LEGS', subtitle: 'Quads', weekday: 3,
    focus: ['Quads', 'Hamstrings', 'Calves', 'Abs'],
    finisher: null, finisherKey: null, finisherMin: 0,
    why: 'Legs are your biggest muscles. Training them hard protects the most muscle and burns the most energy.',
  }, [['squat', 4, 6, 8], ['rdl', 3, 8, 10], ['leg_press', 3, 10, 12], ['leg_curl', 3, 10, 12], ['standing_calf_raise', 4, 12, 15], ['hanging_leg_raise', 3, 10, 15]]),
  push_b: day({
    key: 'push_b', name: 'Push B', short: 'PUSH', subtitle: 'Shoulder focus', weekday: 4,
    focus: ['Shoulders', 'Upper chest', 'Triceps'],
    finisher: '15 min incline walk', finisherKey: 'brisk_walk', finisherMin: 15,
    why: 'Same muscles as Monday from a different angle, with extra shoulder work for a wider frame.',
  }, [['barbell_ohp', 4, 6, 8], ['incline_bench', 3, 8, 10], ['pec_deck', 3, 12, 15], ['lateral_raise', 4, 12, 15], ['dips', 3, 8, 12], ['skull_crusher', 3, 10, 12]]),
  pull_b: day({
    key: 'pull_b', name: 'Pull B', short: 'PULL', subtitle: 'Back thickness', weekday: 5,
    focus: ['Mid back', 'Lats', 'Rear delts', 'Biceps'],
    finisher: '10 min rowing machine', finisherKey: 'rowing_machine', finisherMin: 10,
    why: 'Rows and pull-ups build a thicker back and help your posture.',
  }, [['pullup', 4, 6, 10, 'Use the assisted pull-up machine if you get fewer than 6 reps.'], ['one_arm_db_row', 3, 8, 12], ['close_grip_pulldown', 3, 10, 12], ['rear_delt_fly', 3, 12, 15], ['incline_db_curl', 3, 10, 12], ['cable_curl', 2, 12, 15]]),
  legs_b: day({
    key: 'legs_b', name: 'Legs B', short: 'LEGS', subtitle: 'Glutes and hamstrings', weekday: 6,
    focus: ['Glutes', 'Hamstrings', 'Quads', 'Calves', 'Abs'],
    finisher: null, finisherKey: null, finisherMin: 0,
    why: 'The back of your legs gets its own day, so nothing is skipped and Wednesday\'s quads get time to recover.',
  }, [['hack_squat', 4, 8, 10], ['bulgarian_split_squat', 3, 8, 10], ['hip_thrust', 3, 8, 12], ['seated_leg_curl', 3, 10, 12], ['leg_extension', 3, 12, 15], ['seated_calf_raise', 3, 12, 20], ['cable_crunch', 3, 12, 15]]),
};

/** Training day by JS weekday (0 = Sunday, rest). */
export const SCHEDULE: (DayKey | null)[] = [null, 'push_a', 'pull_a', 'legs_a', 'push_b', 'pull_b', 'legs_b'];

/** Lifting days: Mon to Sat (JS weekday numbers). */
export const LIFT_DAYS = [1, 2, 3, 4, 5, 6];

/** Default exercise keys per day. The user's editable copy lives in the database (repo.getWorkouts). */
export const WORKOUTS: Record<DayKey, string[]> = Object.fromEntries(DAY_KEYS.map((k) => [k, PROGRAM[k].items.map((i) => i.key)])) as Record<DayKey, string[]>;

export const REST_DAY = {
  name: 'Rest day',
  short: 'REST',
  why: 'Muscle is rebuilt between sessions, not during them. On a big calorie deficit one full day off keeps your joints, sleep and strength in good shape for the next six.',
  todo: ['Walk to your step goal', '10 min mobility: hips, hamstrings, upper back', 'Prep food and protein for the week', 'Weekly review: weight average, waist, photos', 'Get to bed on time'],
};

export const WARMUP = '5 min light cardio, then 2 ramp-up sets on the first lift.';
export function warmupFor(firstKey: string | undefined): string {
  const n = firstKey ? EXERCISES[firstKey]?.name : null;
  return n ? `5 min light cardio, then 2 ramp-up sets on ${n.toLowerCase()}: about half your working weight for 8 reps, then about three quarters for 4.` : WARMUP;
}

/** Swap options offered during a live session when a machine is busy or a lift does not feel right. */
export const SWAPS: Record<string, string[]> = {
  bench: ['db_bench', 'chest_press_machine'], incline_bench: ['incline_db_press'], incline_db_press: ['incline_bench'],
  barbell_ohp: ['shoulder_press'], shoulder_press: ['arnold_press', 'barbell_ohp'], dips: ['close_grip_bench'],
  pec_deck: ['cable_crossover', 'db_fly'], lateral_raise: ['cable_lateral_raise'], skull_crusher: ['overhead_ext'],
  rope_pushdown: ['triceps'], overhead_ext: ['skull_crusher'],
  lat_pulldown: ['assisted_pullup'], bent_over_row: ['chest_supported_row', 'tbar_row'], seated_row: ['chest_supported_row'],
  face_pull: ['reverse_pec_deck'], rear_delt_fly: ['reverse_pec_deck'], pullup: ['assisted_pullup', 'lat_pulldown'], assisted_pullup: ['pullup', 'lat_pulldown'],
  one_arm_db_row: ['chest_supported_row'], close_grip_pulldown: ['seated_row'], barbell_curl: ['ez_curl'], cable_curl: ['db_curl'],
  squat: ['hack_squat', 'leg_press'], hack_squat: ['leg_press', 'squat'], leg_press: ['hack_squat'], rdl: ['db_rdl'],
  leg_curl: ['seated_leg_curl'], seated_leg_curl: ['leg_curl'], bulgarian_split_squat: ['walking_lunge'], hip_thrust: ['glute_bridge'],
  hanging_leg_raise: ['lying_leg_raise'], cable_crunch: ['crunch'], standing_calf_raise: ['seated_calf_raise'], seated_calf_raise: ['standing_calf_raise'],
};

export function isDayKey(t: string | null | undefined): t is DayKey {
  return !!t && (DAY_KEYS as string[]).includes(t);
}
/** Display name for any stored session type, including old full body sessions. */
export function workoutName(type: WorkoutType | null | undefined): string {
  if (!type) return REST_DAY.name;
  if (isDayKey(type)) return PROGRAM[type].name;
  if (type === 'A' || type === 'B') return `Full body ${type}`;
  return type;
}
/** PUSH / PULL / LEGS / REST, or FULL for old sessions. */
export function shortLabel(type: WorkoutType | null | undefined): string {
  if (!type) return REST_DAY.short;
  if (isDayKey(type)) return PROGRAM[type].short;
  return 'FULL';
}
/** Exercises of a day in the user's plan. Empty for unknown or old types. */
export function planFor(plan: WorkoutPlan | null | undefined, type: WorkoutType | null | undefined): PlanItem[] {
  return plan && isDayKey(type) ? plan[type] : [];
}

export function stepTarget(week: number): number {
  if (week <= 1) return 7000;
  if (week === 2) return 8000;
  if (week === 3) return 9000;
  return 9500;
}
export function stepTargetLabel(week: number): string {
  return week >= 4 ? '9,000–10,000' : stepTarget(week).toLocaleString('en-US');
}

export const MILESTONES = [
  { name: 'Start', kg: 94, what: 'Baseline weight, waist, photos, steps and gym numbers.' },
  { name: 'Checkpoint 1', kg: 90, what: 'Review waist, photos, strength and adherence.' },
  { name: 'Checkpoint 2', kg: 87, what: 'Body composition and training performance.' },
  { name: 'Checkpoint 3', kg: 85, what: 'Reassess physique and waist. Not a sacred number.' },
];

export type Special = 'chicken' | 'eggs';

/** Mess protein nights by JS weekday: Wed chicken, Fri eggs, Sun chicken. */
export const DEFAULT_SPECIALS: Record<number, Special> = { 3: 'chicken', 5: 'eggs', 0: 'chicken' };

export const DEFAULT_PRESETS: { name: string; calories: number; protein_g: number; special: Special | null }[] = [
  { name: 'Chicken portion', calories: 250, protein_g: 30, special: 'chicken' },
  { name: 'Eggs ×2', calories: 140, protein_g: 12, special: 'eggs' },
  { name: 'Dal katori', calories: 150, protein_g: 9, special: null },
  { name: 'Rajma / chana katori', calories: 210, protein_g: 11, special: null },
  { name: 'Curd bowl', calories: 100, protein_g: 6, special: null },
  { name: 'Milk glass', calories: 150, protein_g: 8, special: null },
  { name: 'Roti ×1', calories: 100, protein_g: 3, special: null },
  { name: 'Rice katori', calories: 200, protein_g: 4, special: null },
  { name: 'Sabzi katori', calories: 80, protein_g: 2, special: null },
  { name: 'Poha plate', calories: 300, protein_g: 6, special: null },
  { name: 'Chai', calories: 90, protein_g: 3, special: null },
  { name: 'Banana', calories: 90, protein_g: 1, special: null },
];

export const MEALS = [
  { key: 'breakfast', name: 'Breakfast' },
  { key: 'lunch', name: 'Lunch' },
  { key: 'snacks', name: 'Snacks' },
  { key: 'dinner', name: 'Dinner' },
] as const;
export type MealKey = (typeof MEALS)[number]['key'];

export const RULES = [
  'Never judge the plan from one weigh-in. Use the 7-day average.',
  'Don’t cut rice or roti. Control portions. Protein first, then sabzi, then carbs.',
  'No automatic second servings. Still hungry? Add dal or vegetables first.',
  'Don’t earn food with exercise. Don’t punish overeating with cardio or starving.',
  'Finish most sets with 1–3 reps in reserve. Train for repeatable progress.',
  'Change one variable at a time, then wait 1–2 weeks.',
];

export const DAY1_CHECKLIST = [
  { key: 'weigh', label: 'Weigh yourself after the bathroom' },
  { key: 'waist', label: 'Measure waist at the navel' },
  { key: 'photos', label: 'Take front, side and back photos' },
  { key: 'steps', label: 'Connect step tracking' },
  { key: 'workout', label: 'Do today’s workout if it’s a training day' },
  { key: 'meals', label: 'Log every meal and snack' },
  { key: 'bed', label: 'Set a bedtime for 7–9 hours of sleep' },
];
