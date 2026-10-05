// The static plan from "Mandar Cut + Muscle Plan".

export type WorkoutType = 'A' | 'B';

export type ExerciseDef = {
  key: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  increment: number; // kg to add when progression triggers
  anim: AnimKey;
  cues: string[];
};

export type AnimKey = 'legpress' | 'squat' | 'bench' | 'pulldown' | 'rdl' | 'curl' | 'triceps' | 'ohp' | 'row' | 'preacher';

export const EXERCISES: Record<string, ExerciseDef> = {
  leg_press: { key: 'leg_press', name: 'Leg press', sets: 3, repMin: 8, repMax: 12, increment: 2.5, anim: 'legpress', cues: ['Lower back stays on the pad', 'Knees track over toes', "Don't lock out hard at the top"] },
  squat: { key: 'squat', name: 'Squat', sets: 3, repMin: 8, repMax: 12, increment: 2.5, anim: 'squat', cues: ['Brace before each rep', 'Knees follow toes', 'Hips and chest rise together'] },
  bench: { key: 'bench', name: 'Bench press', sets: 3, repMin: 8, repMax: 12, increment: 2.5, anim: 'bench', cues: ['Shoulder blades pinched', 'Bar to lower chest', 'Feet planted'] },
  lat_pulldown: { key: 'lat_pulldown', name: 'Lat pulldown', sets: 3, repMin: 8, repMax: 12, increment: 2.5, anim: 'pulldown', cues: ['Pull elbows down to ribs', 'Chest up, slight lean', 'Control the way up'] },
  rdl: { key: 'rdl', name: 'Romanian deadlift', sets: 2, repMin: 8, repMax: 12, increment: 2.5, anim: 'rdl', cues: ['Hips push back', 'Bar close to legs', 'Feel the hamstrings, flat back'] },
  db_curl: { key: 'db_curl', name: 'Dumbbell curl', sets: 2, repMin: 10, repMax: 15, increment: 1, anim: 'curl', cues: ['Elbows pinned', 'No swinging', 'Slow on the way down'] },
  triceps: { key: 'triceps', name: 'Triceps pushdown', sets: 2, repMin: 10, repMax: 15, increment: 2.5, anim: 'triceps', cues: ['Elbows by your sides', 'Full lockout', 'Control up'] },
  shoulder_press: { key: 'shoulder_press', name: 'Shoulder press', sets: 3, repMin: 8, repMax: 12, increment: 1, anim: 'ohp', cues: ['Ribs down, glutes tight', 'Press straight up', "Don't arch the lower back"] },
  seated_row: { key: 'seated_row', name: 'Seated row', sets: 3, repMin: 8, repMax: 12, increment: 2.5, anim: 'row', cues: ['Chest tall', 'Squeeze shoulder blades', 'No rocking'] },
  preacher_curl: { key: 'preacher_curl', name: 'Preacher curl', sets: 2, repMin: 10, repMax: 15, increment: 2.5, anim: 'preacher', cues: ['Arm flat on the pad', "Don't fully relax at the bottom", 'Slow negatives'] },
};

export const WORKOUTS: Record<WorkoutType, string[]> = {
  A: ['leg_press', 'bench', 'lat_pulldown', 'rdl', 'db_curl', 'triceps'],
  B: ['leg_press', 'shoulder_press', 'seated_row', 'rdl', 'preacher_curl', 'triceps'],
};

/** Lifting days: Mon, Wed, Fri (JS weekday numbers). */
export const LIFT_DAYS = [1, 3, 5];

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
  { key: 'workout', label: 'Do Full Body A if it’s a training day' },
  { key: 'meals', label: 'Log every meal and snack' },
  { key: 'bed', label: 'Set a bedtime for 7–9 hours of sleep' },
];
