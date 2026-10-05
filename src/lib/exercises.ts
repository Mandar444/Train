// Exercise library: every entry has default sets/reps, cues and a posture animation.
import type { AnimSpec, Gear, Pose, Static } from './anim';

export type Group = 'Legs' | 'Glutes' | 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Forearms' | 'Core' | 'Cardio' | 'Full body';
export type Equip = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Kettlebell' | 'Other';
export type Unit = 'reps' | 'sec' | 'min';

export type ExerciseDef = {
  key: string;
  name: string;
  group: Group;
  equip: Equip;
  sets: number;
  repMin: number;
  repMax: number;
  unit: Unit;
  increment: number;
  cues: string[];
  anim: AnimSpec;
};

export const GROUPS: Group[] = ['Legs', 'Glutes', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Cardio', 'Full body'];

// ---------- building blocks ----------
const ST: Pose = { t: 0, th: 180, sh: 180, ua: 180, fa: 180 };
const FOOT = { j: 'ankle' as const, x: 140, y: 156 };
const SEAT = { j: 'hip' as const, x: 130, y: 120 };
const BENCH = { j: 'hip' as const, x: 175, y: 98 };
const FLOOR = { j: 'hip' as const, x: 170, y: 150 };
const HANG = { j: 'hand' as const, x: 156, y: 24 };
const TOE = { j: 'toe' as const, x: 70, y: 158 };

const seatS: Static[] = [[100, 128, 160, 128, 9], [130, 128, 130, 160, 5]];
const seatBackS: Static[] = [...seatS, [116, 128, 116, 66, 7]];
const benchS: Static[] = [[60, 106, 200, 106, 9], [80, 106, 80, 160, 5], [185, 106, 185, 160, 5]];
const barS: Static[] = [[100, 22, 220, 22, 5], [104, 22, 104, 160, 5], [216, 22, 216, 160, 5]];
const rackS: Static[] = [[92, 40, 92, 160, 5], [214, 40, 214, 160, 5]];
const cableTower = (x: number): Static[] => [[x, 6, x, 160, 6]];

const ecc = (a = 'LOWER', b = 'PUSH'): Partial<AnimSpec> => ({ ab: 2, ba: 1, labels: [`${a} · 2S`, `${b} · 1S`] });
const con = (a = 'LIFT', b = 'LOWER'): Partial<AnimSpec> => ({ ab: 1, ba: 2, labels: [`${a} · 1S`, `${b} · 2S`] });
const fast = (a: string, b: string, s = 0.4): Partial<AnimSpec> => ({ ab: s, ba: s, labels: [a, b] });

const BB: Gear[] = [{ k: 'barbell' }];
const DB: Gear[] = [{ k: 'dumbbell' }];
const KB: Gear[] = [{ k: 'kettlebell' }];

type Raw = [key: string, name: string, group: Group, equip: Equip, sets: number, repMin: number, repMax: number, inc: number, cues: string[], anim: AnimSpec, unit?: Unit];

const A = (a: Pose, b: Pose, anchor: AnimSpec['anchor'], extra: Partial<AnimSpec> = {}): AnimSpec => ({ a, b, anchor, ...extra });

// shared poses
const squatTop = (ua: number, fa: number): Pose => ({ ...ST, ua, fa });
const hingeDown: Pose = { t: 80, th: 165, sh: 185, ua: 180, fa: 180 };
const rowStance = { t: 70, th: 165, sh: 190 };
const benchBody = { t: 270, th: 120, sh: 180 };
const plankA: Pose = { t: 64, th: 244, sh: 244, ua: 180, fa: 180, ft: 160 };
const plankB: Pose = { t: 71, th: 251, sh: 251, ua: 230, fa: 150, ft: 160 };
const seated = { th: 90, sh: 180 };

const RAW: Raw[] = [
  // ---------------- LEGS ----------------
  ['squat', 'Barbell back squat', 'Legs', 'Barbell', 3, 8, 12, 2.5, ['Brace before each rep', 'Knees follow toes', 'Hips and chest rise together'],
    A(squatTop(225, 20), { t: 40, th: 100, sh: 200, ua: 265, fa: 60 }, FOOT, { ...ecc('DOWN', 'DRIVE UP'), gear: [{ k: 'barbell', at: 'hand' }], statics: rackS })],
  ['front_squat', 'Front squat', 'Legs', 'Barbell', 3, 6, 10, 2.5, ['Elbows high', 'Stay tall through the torso', 'Sit between the heels'],
    A(squatTop(100, 300), { t: 20, th: 100, sh: 205, ua: 115, fa: 320 }, FOOT, { ...ecc('DOWN', 'DRIVE UP'), gear: BB, statics: rackS })],
  ['goblet_squat', 'Goblet squat', 'Legs', 'Kettlebell', 3, 10, 15, 2, ['Weight at the chest', 'Elbows inside knees at the bottom', 'Heels down'],
    A(squatTop(165, 15), { t: 25, th: 100, sh: 205, ua: 185, fa: 40 }, FOOT, { ...ecc('DOWN', 'UP'), gear: KB })],
  ['db_squat', 'Dumbbell squat', 'Legs', 'Dumbbell', 3, 10, 15, 2, ['Arms hang long', 'Chest proud', 'Full foot pressure'],
    A(ST, { t: 30, th: 100, sh: 202, ua: 190, fa: 190 }, FOOT, { ...ecc('DOWN', 'UP'), gear: DB })],
  ['leg_press', 'Leg press', 'Legs', 'Machine', 3, 8, 12, 2.5, ['Lower back stays on the pad', 'Knees track over toes', "Don't lock out hard at the top"],
    A({ t: 325, th: 60, sh: 60, ft: 330, ua: 160, fa: 120 }, { t: 325, th: 20, sh: 110, ft: 20, ua: 160, fa: 120 }, { j: 'hip', x: 110, y: 130 },
      { ...ecc('LOWER', 'PUSH'), gear: [{ k: 'plateFoot' }], statics: [[150, 112, 280, 10, 6], [104, 140, 132, 142, 10], [104, 138, 78, 94, 10], [112, 146, 112, 160, 5]] })],
  ['hack_squat', 'Hack squat', 'Legs', 'Machine', 3, 8, 12, 2.5, ['Back flat on the pad', 'Feet mid-platform', 'Control the depth'],
    A({ t: 15, th: 175, sh: 185, ua: 150, fa: 20 }, { t: 15, th: 105, sh: 215, ua: 150, fa: 20 }, FOOT, { ...ecc('DOWN', 'DRIVE UP'), statics: [[96, 160, 150, 40, 6]] })],
  ['bulgarian_split_squat', 'Bulgarian split squat', 'Legs', 'Dumbbell', 3, 8, 12, 2, ['Rear foot laces on the bench', 'Front shin near vertical', 'Drop the back knee straight down'],
    A({ t: 5, th: 170, sh: 180, th2: 205, sh2: 250, ft2: 270, ua: 180, fa: 180 }, { t: 15, th: 100, sh: 195, th2: 175, sh2: 300, ft2: 270, ua: 185, fa: 185 }, { j: 'ankle', x: 170, y: 156 },
      { ...ecc('DOWN', 'UP'), gear: DB, statics: [[78, 124, 124, 124, 8], [100, 124, 100, 160, 5]] })],
  ['walking_lunge', 'Walking lunge', 'Legs', 'Dumbbell', 3, 10, 12, 2, ['Long step', 'Torso upright', 'Push through the front heel'],
    A({ t: 0, th: 165, sh: 180, th2: 215, sh2: 220, ft2: 160, ua: 180, fa: 180 }, { t: 5, th: 100, sh: 185, th2: 178, sh2: 265, ft2: 180, ua: 182, fa: 182 }, { j: 'ankle', x: 170, y: 156 },
      { ...ecc('DOWN', 'STEP UP'), gear: DB })],
  ['reverse_lunge', 'Reverse lunge', 'Legs', 'Bodyweight', 3, 10, 12, 0, ['Step back softly', 'Front knee stays over ankle', 'Drive back up through the front heel'],
    A({ ...ST, ua: 150, fa: 90 }, { t: 5, th: 100, sh: 185, th2: 178, sh2: 265, ft2: 180, ua: 150, fa: 90 }, { j: 'ankle', x: 170, y: 156 }, ecc('STEP BACK', 'UP'))],
  ['step_up', 'Step-up', 'Legs', 'Dumbbell', 3, 10, 12, 2, ['Whole foot on the box', 'Drive through the top leg', 'Lower slowly'],
    A({ t: 10, th: 100, sh: 200, th2: 185, sh2: 185, ft2: 140, ua: 180, fa: 180 }, { t: 0, th: 180, sh: 180, th2: 110, sh2: 180, ua: 180, fa: 180 }, { j: 'ankle', x: 175, y: 116 },
      { ...con('STEP UP', 'LOWER'), gear: DB, statics: [[150, 120, 230, 120, 8], [150, 120, 150, 160, 6], [230, 120, 230, 160, 6]] })],
  ['rdl', 'Romanian deadlift', 'Legs', 'Barbell', 2, 8, 12, 2.5, ['Hips push back', 'Bar close to legs', 'Flat back, feel the hamstrings'],
    A(ST, hingeDown, FOOT, { ...ecc('HINGE', 'HIPS THROUGH'), gear: BB })],
  ['db_rdl', 'Dumbbell Romanian deadlift', 'Legs', 'Dumbbell', 3, 10, 12, 2, ['Soft knees', 'Dumbbells slide down the thighs', 'Stop when the back wants to round'],
    A(ST, hingeDown, FOOT, { ...ecc('HINGE', 'HIPS THROUGH'), gear: DB })],
  ['deadlift', 'Deadlift', 'Back', 'Barbell', 3, 5, 8, 5, ['Bar over mid-foot', 'Lats tight, chest up', 'Push the floor away'],
    A({ t: 65, th: 115, sh: 205, ua: 180, fa: 180 }, ST, FOOT, { ...con('PULL', 'LOWER'), gear: BB })],
  ['sumo_deadlift', 'Sumo deadlift', 'Legs', 'Barbell', 3, 5, 8, 5, ['Wide stance, toes out', 'Knees pushed out', 'Hips close to the bar'],
    A({ t: 45, th: 125, sh: 195, ua: 180, fa: 180 }, ST, FOOT, { ...con('PULL', 'LOWER'), gear: BB })],
  ['good_morning', 'Good morning', 'Legs', 'Barbell', 3, 10, 12, 2.5, ['Light weight', 'Hips back, soft knees', 'Neutral spine'],
    A(squatTop(225, 20), { t: 80, th: 170, sh: 185, ua: 305, fa: 100 }, FOOT, { ...ecc('HINGE', 'UP'), gear: BB })],
  ['leg_extension', 'Leg extension', 'Legs', 'Machine', 3, 10, 15, 2.5, ['Pad on the lower shin', 'Pause at the top', 'Slow on the way down'],
    A({ t: 355, th: 90, sh: 175, ua: 170, fa: 120 }, { t: 355, th: 90, sh: 92, ua: 170, fa: 120 }, SEAT, { ...con('EXTEND', 'LOWER'), gear: [{ k: 'pad' }], statics: seatBackS })],
  ['leg_curl', 'Lying leg curl', 'Legs', 'Machine', 3, 10, 15, 2.5, ['Hips pressed into the pad', 'Curl heels to glutes', 'Control the return'],
    A({ t: 90, th: 270, sh: 270, ua: 150, fa: 90, ft: 180 }, { t: 90, th: 268, sh: 20, ua: 150, fa: 90, ft: 110 }, { j: 'hip', x: 150, y: 112 },
      { ...con('CURL', 'LOWER'), gear: [{ k: 'pad' }], statics: [[60, 120, 230, 120, 9], [100, 120, 100, 160, 5], [200, 120, 200, 160, 5]] })],
  ['seated_leg_curl', 'Seated leg curl', 'Legs', 'Machine', 3, 10, 15, 2.5, ['Thigh pad snug', 'Curl under the seat', 'Squeeze, then slow return'],
    A({ t: 355, th: 90, sh: 92, ua: 170, fa: 120 }, { t: 355, th: 90, sh: 205, ua: 170, fa: 120 }, SEAT, { ...con('CURL', 'RETURN'), gear: [{ k: 'pad' }], statics: seatBackS })],
  ['standing_calf_raise', 'Standing calf raise', 'Legs', 'Machine', 3, 12, 20, 2.5, ['Full stretch at the bottom', 'Rise onto the big toe', 'Pause at the top'],
    A(ST, { ...ST, ft: 140, dy: -8 }, FOOT, con('RISE', 'LOWER'))],
  ['seated_calf_raise', 'Seated calf raise', 'Legs', 'Machine', 3, 12, 20, 2.5, ['Pad on the knees', 'Deep stretch', 'Slow reps'],
    A({ t: 0, ...seated, ua: 165, fa: 100 }, { t: 0, ...seated, ua: 165, fa: 100, ft: 135, dy: -6 }, SEAT, { ...con('RISE', 'LOWER'), statics: seatS })],
  ['wall_sit', 'Wall sit', 'Legs', 'Bodyweight', 3, 30, 60, 0, ['Thighs parallel', 'Back flat on the wall', 'Breathe steady'],
    A({ t: 0, th: 90, sh: 180, ua: 180, fa: 180 }, { t: 2, th: 92, sh: 180, ua: 180, fa: 180 }, FOOT, { hold: true, labels: ['HOLD', 'HOLD'], statics: [[92, 30, 92, 160, 6]] }), 'sec'],

  // ---------------- GLUTES ----------------
  ['hip_thrust', 'Barbell hip thrust', 'Glutes', 'Barbell', 3, 8, 12, 5, ['Shoulder blades on the bench', 'Chin tucked', 'Squeeze glutes at the top'],
    A({ t: 300, th: 60, sh: 170, ua: 150, fa: 90 }, { t: 275, th: 90, sh: 175, ua: 150, fa: 90 }, { j: 'ankle', x: 190, y: 156 },
      { ...con('THRUST', 'LOWER'), gear: [{ k: 'barbell', at: 'hip' }], statics: [[56, 120, 104, 120, 9], [80, 120, 80, 160, 5]] })],
  ['glute_bridge', 'Glute bridge', 'Glutes', 'Bodyweight', 3, 12, 15, 0, ['Feet close to glutes', 'Drive through heels', 'Ribs down'],
    A({ t: 270, th: 45, sh: 160, ua: 95, fa: 95 }, { t: 290, th: 80, sh: 170, ua: 100, fa: 100 }, { j: 'ankle', x: 185, y: 156 }, con('BRIDGE', 'LOWER'))],
  ['kb_swing', 'Kettlebell swing', 'Glutes', 'Kettlebell', 3, 15, 20, 4, ['Hike the bell back', 'Snap the hips', 'Arms are just ropes'],
    A({ t: 70, th: 160, sh: 190, ua: 195, fa: 195 }, { t: 0, th: 180, sh: 180, ua: 90, fa: 90 }, FOOT, { ab: 0.5, ba: 0.6, labels: ['SNAP HIPS', 'HIKE BACK'], gear: KB })],
  ['cable_kickback', 'Cable glute kickback', 'Glutes', 'Cable', 3, 12, 15, 2.5, ['Slight forward lean', 'Kick back from the hip', "Don't arch the lower back"],
    A({ t: 20, th: 180, sh: 180, th2: 180, sh2: 180, ua: 150, fa: 90 }, { t: 25, th: 220, sh: 200, th2: 180, sh2: 180, ua: 150, fa: 90 }, { j: 'ankle2', x: 140, y: 156 },
      { ...con('KICK', 'RETURN'), statics: cableTower(230) })],

  // ---------------- CHEST ----------------
  ['bench', 'Bench press', 'Chest', 'Barbell', 3, 8, 12, 2.5, ['Shoulder blades pinched', 'Bar to lower chest', 'Feet planted'],
    A({ ...benchBody, ua: 0, fa: 0 }, { ...benchBody, ua: 120, fa: 345 }, BENCH, { ...ecc('LOWER', 'PRESS'), gear: BB, statics: benchS })],
  ['incline_bench', 'Incline bench press', 'Chest', 'Barbell', 3, 8, 12, 2.5, ['Bench at 30–45°', 'Bar to upper chest', 'Elbows ~60° from the body'],
    A({ t: 305, th: 110, sh: 180, ua: 10, fa: 10 }, { t: 305, th: 110, sh: 180, ua: 140, fa: 0 }, { j: 'hip', x: 165, y: 104 },
      { ...ecc('LOWER', 'PRESS'), gear: BB, statics: [[150, 112, 190, 112, 9], [150, 112, 112, 86, 9], [160, 112, 160, 160, 5]] })],
  ['decline_bench', 'Decline bench press', 'Chest', 'Barbell', 3, 8, 12, 2.5, ['Legs hooked', 'Bar to lower chest', 'Control the descent'],
    A({ t: 250, th: 100, sh: 170, ua: 350, fa: 350 }, { t: 250, th: 100, sh: 170, ua: 120, fa: 345 }, { j: 'hip', x: 175, y: 96 },
      { ...ecc('LOWER', 'PRESS'), gear: BB, statics: [[180, 104, 100, 132, 9], [150, 114, 150, 160, 5]] })],
  ['db_bench', 'Dumbbell bench press', 'Chest', 'Dumbbell', 3, 8, 12, 2, ['Dumbbells over the chest', 'Lower to chest level', 'Press up and slightly in'],
    A({ ...benchBody, ua: 0, fa: 0 }, { ...benchBody, ua: 125, fa: 350 }, BENCH, { ...ecc('LOWER', 'PRESS'), gear: DB, statics: benchS })],
  ['incline_db_press', 'Incline dumbbell press', 'Chest', 'Dumbbell', 3, 8, 12, 2, ['Bench at 30°', 'Elbows under wrists', 'Squeeze at the top'],
    A({ t: 305, th: 110, sh: 180, ua: 10, fa: 10 }, { t: 305, th: 110, sh: 180, ua: 140, fa: 0 }, { j: 'hip', x: 165, y: 104 },
      { ...ecc('LOWER', 'PRESS'), gear: DB, statics: [[150, 112, 190, 112, 9], [150, 112, 112, 86, 9], [160, 112, 160, 160, 5]] })],
  ['db_fly', 'Dumbbell fly', 'Chest', 'Dumbbell', 3, 10, 15, 1, ['Slight bend in the elbows', 'Open wide like a hug', 'Stop at a deep stretch'],
    A({ ...benchBody, ua: 0, fa: 0 }, { ...benchBody, ua: 295, fa: 300, ua2: 65, fa2: 60 }, BENCH, { ...ecc('OPEN', 'HUG'), gear: [{ k: 'dumbbell', both: true }], statics: benchS })],
  ['cable_crossover', 'Cable crossover', 'Chest', 'Cable', 3, 12, 15, 2.5, ['Step forward, slight lean', 'Hands meet low in front', 'Feel the chest stretch back'],
    A({ t: 15, th: 180, sh: 180, ua: 245, fa: 235, ua2: 65, fa2: 75 }, { t: 15, th: 180, sh: 180, ua: 145, fa: 135 }, FOOT,
      { ...con('SQUEEZE', 'OPEN'), gear: [{ k: 'cable', from: [60, 24], both: true }], statics: [...cableTower(56), ...cableTower(250)] })],
  ['pec_deck', 'Pec deck', 'Chest', 'Machine', 3, 12, 15, 2.5, ['Back on the pad', 'Elbows soft', 'Squeeze for a second'],
    A({ t: 0, ...seated, ua: 255, fa: 345, ua2: 75, fa2: 20 }, { t: 0, ...seated, ua: 110, fa: 15 }, SEAT, { ...con('SQUEEZE', 'OPEN'), statics: seatBackS })],
  ['chest_press_machine', 'Machine chest press', 'Chest', 'Machine', 3, 10, 12, 2.5, ['Handles at mid-chest', 'Press without locking out', 'Shoulders down'],
    A({ t: 0, ...seated, ua: 220, fa: 80 }, { t: 0, ...seated, ua: 90, fa: 90 }, SEAT, { ...con('PRESS', 'RETURN'), gear: [{ k: 'handle' }], statics: seatBackS })],
  ['pushup', 'Push-up', 'Chest', 'Bodyweight', 3, 8, 15, 0, ['Body in one straight line', 'Elbows ~45°', 'Chest to fist height'],
    A(plankA, plankB, TOE, ecc('LOWER', 'PUSH'))],
  ['incline_pushup', 'Incline push-up', 'Chest', 'Bodyweight', 3, 10, 15, 0, ['Hands on a bench', 'Tight core', 'Lower the chest to the edge'],
    A({ t: 45, th: 225, sh: 225, ua: 180, fa: 180, ft: 160 }, { t: 55, th: 235, sh: 235, ua: 225, fa: 150, ft: 160 }, TOE, { ...ecc('LOWER', 'PUSH'), statics: [[170, 116, 230, 116, 8], [200, 116, 200, 160, 5]] })],
  ['decline_pushup', 'Decline push-up', 'Chest', 'Bodyweight', 3, 8, 12, 0, ['Feet on a box', 'Hands under shoulders', 'Hips stay level'],
    A({ t: 95, th: 275, sh: 275, ua: 180, fa: 180, ft: 160 }, { t: 103, th: 283, sh: 283, ua: 225, fa: 150, ft: 160 }, { j: 'toe', x: 60, y: 100 }, { ...ecc('LOWER', 'PUSH'), statics: [[36, 104, 86, 104, 8], [60, 104, 60, 160, 6]] })],
  ['dips', 'Chest dips', 'Chest', 'Bodyweight', 3, 6, 12, 2.5, ['Lean slightly forward', 'Lower until shoulders are below elbows', 'Press back up'],
    A({ t: 10, th: 190, sh: 220, ua: 180, fa: 180 }, { t: 25, th: 195, sh: 225, ua: 230, fa: 160 }, { j: 'hand', x: 150, y: 100 }, { ...ecc('LOWER', 'PRESS'), statics: [[118, 100, 196, 100, 6], [190, 100, 190, 160, 5]] })],

  // ---------------- BACK ----------------
  ['lat_pulldown', 'Lat pulldown', 'Back', 'Cable', 3, 8, 12, 2.5, ['Pull elbows down to ribs', 'Chest up, slight lean', 'Control the way up'],
    A({ t: 352, th: 85, sh: 170, ua: 5, fa: 5 }, { t: 345, th: 85, sh: 170, ua: 195, fa: 15 }, SEAT,
      { ...con('PULL', 'CONTROL UP'), gear: [{ k: 'cable', from: [130, 6] }, { k: 'handle' }], statics: [...seatS, [140, 104, 172, 104, 6], [130, 6, 214, 6, 4], ...cableTower(214)] })],
  ['close_grip_pulldown', 'Close-grip pulldown', 'Back', 'Cable', 3, 10, 12, 2.5, ['Neutral grip handle', 'Elbows drive down and back', 'Pause at the chest'],
    A({ t: 352, th: 85, sh: 170, ua: 5, fa: 5 }, { t: 340, th: 85, sh: 170, ua: 200, fa: 20 }, SEAT,
      { ...con('PULL', 'CONTROL UP'), gear: [{ k: 'cable', from: [130, 6] }, { k: 'handle' }], statics: [...seatS, [140, 104, 172, 104, 6], [130, 6, 214, 6, 4], ...cableTower(214)] })],
  ['pullup', 'Pull-up', 'Back', 'Bodyweight', 3, 4, 10, 0, ['Start from a dead hang', 'Chest to the bar', 'Lower all the way'],
    A({ t: 0, th: 175, sh: 195, ua: 0, fa: 0 }, { t: 10, th: 165, sh: 205, ua: 160, fa: 15 }, HANG, { scale: 0.72,  ...con('PULL', 'LOWER'), statics: barS })],
  ['chinup', 'Chin-up', 'Back', 'Bodyweight', 3, 4, 10, 0, ['Palms facing you', 'Squeeze the biceps and lats', 'Full hang each rep'],
    A({ t: 0, th: 175, sh: 200, ua: 0, fa: 0 }, { t: 5, th: 165, sh: 210, ua: 165, fa: 10 }, HANG, { scale: 0.72,  ...con('PULL', 'LOWER'), statics: barS })],
  ['assisted_pullup', 'Assisted pull-up', 'Back', 'Machine', 3, 8, 12, 2.5, ['Knees on the pad', 'Pull chin over the handles', 'Less assistance over time'],
    A({ t: 0, th: 170, sh: 260, ua: 0, fa: 0 }, { t: 8, th: 165, sh: 260, ua: 160, fa: 15 }, HANG, { scale: 0.72,  ...con('PULL', 'LOWER'), statics: barS })],
  ['seated_row', 'Seated cable row', 'Back', 'Cable', 3, 8, 12, 2.5, ['Chest tall', 'Squeeze shoulder blades', 'No rocking'],
    A({ t: 15, th: 80, sh: 100, ua: 90, fa: 90 }, { t: 355, th: 80, sh: 100, ua: 220, fa: 95 }, { j: 'hip', x: 120, y: 132 },
      { ...con('ROW', 'REACH'), gear: [{ k: 'cable', from: [262, 100] }, { k: 'handle' }], statics: [[94, 140, 150, 140, 9], [206, 110, 206, 150, 7], ...cableTower(262)] })],
  ['bent_over_row', 'Bent-over barbell row', 'Back', 'Barbell', 3, 8, 12, 2.5, ['Hinge to ~45°', 'Pull to the belly button', 'Keep the torso still'],
    A({ ...rowStance, ua: 180, fa: 180 }, { ...rowStance, ua: 235, fa: 160 }, FOOT, { ...con('ROW', 'LOWER'), gear: BB })],
  ['one_arm_db_row', 'One-arm dumbbell row', 'Back', 'Dumbbell', 3, 8, 12, 2, ['Hand and knee on the bench', 'Pull elbow to hip', 'Long stretch at the bottom'],
    A({ t: 85, th: 175, sh: 185, ua: 180, fa: 180, ua2: 172, fa2: 180 }, { t: 85, th: 175, sh: 185, ua: 240, fa: 170, ua2: 172, fa2: 180 }, FOOT,
      { ...con('ROW', 'LOWER'), gear: DB, statics: [[166, 130, 234, 130, 9], [210, 130, 210, 160, 5]] })],
  ['tbar_row', 'T-bar row', 'Back', 'Barbell', 3, 8, 12, 2.5, ['Chest over the bar', 'Drive elbows back', 'Pause at the top'],
    A({ ...rowStance, ua: 180, fa: 180 }, { ...rowStance, ua: 238, fa: 165 }, FOOT, { ...con('ROW', 'LOWER'), gear: BB, statics: [[60, 158, 190, 120, 4]] })],
  ['chest_supported_row', 'Chest-supported row', 'Back', 'Dumbbell', 3, 10, 12, 2, ['Chest stays on the pad', 'Pull with the elbows', 'No shrugging'],
    A({ t: 45, th: 120, sh: 180, ua: 180, fa: 180 }, { t: 45, th: 120, sh: 180, ua: 238, fa: 165 }, { j: 'hip', x: 120, y: 118 },
      { ...con('ROW', 'LOWER'), gear: DB, statics: [[126, 124, 160, 88, 9], [120, 126, 120, 160, 5]] })],
  ['straight_arm_pulldown', 'Straight-arm pulldown', 'Back', 'Cable', 3, 12, 15, 2.5, ['Arms almost straight', 'Sweep down to the thighs', 'Lats do the work'],
    A({ t: 25, th: 180, sh: 180, ua: 60, fa: 60 }, { t: 25, th: 180, sh: 180, ua: 185, fa: 185 }, FOOT,
      { ...con('SWEEP', 'RETURN'), gear: [{ k: 'cable', from: [240, 20] }, { k: 'handle' }], statics: cableTower(240) })],
  ['back_extension', 'Back extension', 'Back', 'Bodyweight', 3, 12, 15, 0, ['Hips on the pad', 'Lower with a flat back', 'Rise to a straight line only'],
    A({ t: 150, th: 235, sh: 235, ua: 210, fa: 100 }, { t: 55, th: 235, sh: 235, ua: 115, fa: 5 }, { j: 'hip', x: 150, y: 100 },
      { ...con('RISE', 'LOWER'), statics: [[136, 108, 168, 94, 8], [84, 148, 104, 136, 6], [130, 112, 120, 160, 5]] })],
  ['inverted_row', 'Inverted row', 'Back', 'Bodyweight', 3, 8, 12, 0, ['Body like a plank', 'Chest to the bar', 'Squeeze the shoulder blades'],
    A({ t: 82, th: 262, sh: 262, ua: 20, fa: 20, ft: 30 }, { t: 62, th: 242, sh: 242, ua: 150, fa: 20, ft: 30 }, { j: 'hand', x: 180, y: 92 },
      { ...con('PULL', 'LOWER'), statics: [[150, 92, 236, 92, 5], [230, 92, 230, 160, 5]] })],
  ['db_pullover', 'Dumbbell pullover', 'Back', 'Dumbbell', 3, 10, 12, 2, ['Arms slightly bent', 'Lower behind the head', 'Pull back over the chest'],
    A({ ...benchBody, ua: 5, fa: 5 }, { ...benchBody, ua: 285, fa: 285 }, BENCH, { ...ecc('STRETCH', 'PULL'), gear: DB, statics: benchS })],
  ['rack_pull', 'Rack pull', 'Back', 'Barbell', 3, 5, 8, 5, ['Bar on pins at knee height', 'Lockout with glutes', "Don't lean back"],
    A({ t: 30, th: 150, sh: 190, ua: 180, fa: 180 }, ST, FOOT, { ...con('PULL', 'LOWER'), gear: BB, statics: [[92, 120, 92, 160, 5], [214, 120, 214, 160, 5]] })],
  ['face_pull', 'Face pull', 'Shoulders', 'Cable', 3, 12, 15, 2.5, ['Rope at face height', 'Elbows high and wide', 'Pull hands beside the ears'],
    A({ t: 350, th: 180, sh: 180, ua: 75, fa: 75 }, { t: 350, th: 180, sh: 180, ua: 265, fa: 50 }, FOOT,
      { ...con('PULL', 'RETURN'), gear: [{ k: 'cable', from: [250, 60] }, { k: 'handle' }], statics: cableTower(250) })],

  // ---------------- SHOULDERS ----------------
  ['shoulder_press', 'Seated dumbbell shoulder press', 'Shoulders', 'Dumbbell', 3, 8, 12, 1, ['Ribs down, back on the pad', 'Press straight up', "Don't arch the lower back"],
    A({ t: 0, ...seated, ua: 160, fa: 10 }, { t: 0, ...seated, ua: 5, fa: 5 }, SEAT, { ...con('PRESS', 'LOWER'), gear: DB, statics: seatBackS })],
  ['barbell_ohp', 'Standing overhead press', 'Shoulders', 'Barbell', 3, 6, 10, 2.5, ['Glutes tight', 'Bar travels close to the face', 'Head through at the top'],
    A({ ...ST, ua: 150, fa: 355 }, { ...ST, ua: 0, fa: 0 }, FOOT, { scale: 0.74,  ...con('PRESS', 'LOWER'), gear: BB })],
  ['arnold_press', 'Arnold press', 'Shoulders', 'Dumbbell', 3, 8, 12, 1, ['Start palms facing you', 'Rotate as you press', 'Control the turn back'],
    A({ t: 0, ...seated, ua: 175, fa: 355 }, { t: 0, ...seated, ua: 0, fa: 0 }, SEAT, { ...con('PRESS', 'LOWER'), gear: DB, statics: seatBackS })],
  ['lateral_raise', 'Lateral raise', 'Shoulders', 'Dumbbell', 3, 12, 15, 1, ['Raise out to the sides (shown side-on)', 'Lead with the elbows', 'Stop at shoulder height'],
    A({ ...ST, ua: 185, fa: 185 }, { ...ST, ua: 95, fa: 100 }, FOOT, { ...con('RAISE', 'LOWER'), gear: DB })],
  ['front_raise', 'Front raise', 'Shoulders', 'Dumbbell', 3, 12, 15, 1, ['Arms nearly straight', 'Raise to eye level', 'No swinging'],
    A(ST, { ...ST, ua: 85, fa: 85 }, FOOT, { ...con('RAISE', 'LOWER'), gear: DB })],
  ['rear_delt_fly', 'Rear delt fly', 'Shoulders', 'Dumbbell', 3, 12, 15, 1, ['Hinge forward', 'Arms out wide', 'Squeeze the back of the shoulders'],
    A({ t: 75, th: 170, sh: 185, ua: 180, fa: 180 }, { t: 75, th: 170, sh: 185, ua: 255, fa: 255 }, FOOT, { ...con('RAISE', 'LOWER'), gear: DB })],
  ['reverse_pec_deck', 'Reverse pec deck', 'Shoulders', 'Machine', 3, 12, 15, 2.5, ['Chest on the pad', 'Arms sweep back', 'Pause, then return slowly'],
    A({ t: 10, ...seated, ua: 90, fa: 90 }, { t: 10, ...seated, ua: 250, fa: 250 }, SEAT, { ...con('SWEEP', 'RETURN'), statics: [...seatS, [150, 76, 150, 120, 7]] })],
  ['upright_row', 'Upright row', 'Shoulders', 'Barbell', 3, 10, 12, 2.5, ['Hands shoulder-width', 'Elbows lead up', 'Stop at chest height'],
    A(ST, { ...ST, ua: 250, fa: 120 }, FOOT, { ...con('PULL', 'LOWER'), gear: BB })],
  ['shrug', 'Dumbbell shrug', 'Shoulders', 'Dumbbell', 3, 12, 15, 2, ['Shoulders straight up', 'Pause at the top', "Don't roll"],
    A(ST, { ...ST, sl: 8 }, FOOT, { ...con('SHRUG', 'LOWER'), gear: DB })],
  ['cable_lateral_raise', 'Cable lateral raise', 'Shoulders', 'Cable', 3, 12, 15, 2.5, ['Cable from the low pulley', 'Raise to shoulder height', 'Slow negative'],
    A({ ...ST, ua: 175, fa: 175 }, { ...ST, ua: 95, fa: 100 }, FOOT, { ...con('RAISE', 'LOWER'), gear: [{ k: 'cable', from: [176, 156] }, { k: 'handle' }], statics: cableTower(186) })],

  // ---------------- BICEPS ----------------
  ['barbell_curl', 'Barbell curl', 'Biceps', 'Barbell', 3, 8, 12, 2.5, ['Elbows pinned to the sides', 'No hip swing', 'Lower fully'],
    A(ST, { ...ST, ua: 172, fa: 25 }, FOOT, { ...con('CURL', 'LOWER'), gear: BB })],
  ['db_curl', 'Dumbbell curl', 'Biceps', 'Dumbbell', 2, 10, 15, 1, ['Elbows pinned', 'No swinging', 'Slow on the way down'],
    A(ST, { ...ST, ua: 172, fa: 22 }, FOOT, { ...con('CURL', 'LOWER'), gear: DB })],
  ['hammer_curl', 'Hammer curl', 'Biceps', 'Dumbbell', 3, 10, 15, 1, ['Palms face each other', 'Curl to the shoulder', 'Control down'],
    A(ST, { ...ST, ua: 172, fa: 30 }, FOOT, { ...con('CURL', 'LOWER'), gear: DB })],
  ['preacher_curl', 'Preacher curl', 'Biceps', 'Dumbbell', 2, 10, 15, 2.5, ['Arm flat on the pad', "Don't fully relax at the bottom", 'Slow negatives'],
    A({ t: 10, ...seated, ua: 135, fa: 40 }, { t: 10, ...seated, ua: 135, fa: 160 }, SEAT, { ...ecc('LOWER', 'CURL'), gear: DB, statics: [...seatS, [138, 88, 162, 110, 9], [160, 110, 160, 160, 5]] })],
  ['concentration_curl', 'Concentration curl', 'Biceps', 'Dumbbell', 2, 10, 15, 1, ['Elbow against the inner thigh', 'Curl up and squeeze', 'Full extension'],
    A({ t: 40, th: 80, sh: 180, ua: 178, fa: 178 }, { t: 40, th: 80, sh: 180, ua: 178, fa: 35 }, SEAT, { ...con('CURL', 'LOWER'), gear: DB, statics: seatS })],
  ['cable_curl', 'Cable curl', 'Biceps', 'Cable', 3, 10, 15, 2.5, ['Cable from the low pulley', 'Elbows still', 'Squeeze at the top'],
    A(ST, { ...ST, ua: 172, fa: 25 }, FOOT, { ...con('CURL', 'LOWER'), gear: [{ k: 'cable', from: [182, 156] }, { k: 'handle' }], statics: cableTower(192) })],
  ['incline_db_curl', 'Incline dumbbell curl', 'Biceps', 'Dumbbell', 3, 10, 12, 1, ['Arms hang behind the body', 'Curl without moving the elbows', 'Big stretch at the bottom'],
    A({ t: 325, th: 100, sh: 180, ua: 200, fa: 200 }, { t: 325, th: 100, sh: 180, ua: 200, fa: 50 }, { j: 'hip', x: 150, y: 110 },
      { ...con('CURL', 'LOWER'), gear: DB, statics: [[140, 118, 186, 118, 8], [145, 118, 114, 78, 8], [150, 118, 150, 160, 5]] })],
  ['ez_curl', 'EZ-bar curl', 'Biceps', 'Barbell', 3, 8, 12, 2.5, ['Grip the angled part', 'Elbows by the ribs', 'Lower under control'],
    A(ST, { ...ST, ua: 170, fa: 28 }, FOOT, { ...con('CURL', 'LOWER'), gear: BB })],
  ['reverse_curl', 'Reverse curl', 'Forearms', 'Barbell', 3, 10, 15, 2.5, ['Palms facing down', 'Wrists straight', 'Light weight, strict form'],
    A(ST, { ...ST, ua: 172, fa: 35 }, FOOT, { ...con('CURL', 'LOWER'), gear: BB })],
  ['wrist_curl', 'Wrist curl', 'Forearms', 'Dumbbell', 3, 15, 20, 1, ['Forearms on the thighs', 'Only the wrists move', 'Full range'],
    A({ t: 15, ...seated, ua: 160, fa: 110 }, { t: 15, ...seated, ua: 160, fa: 78 }, SEAT, { ...con('CURL', 'LOWER'), gear: DB, statics: seatS })],
  ['farmer_walk', "Farmer's walk", 'Forearms', 'Dumbbell', 3, 30, 45, 2, ['Heavy weights at your sides', 'Tall posture, short quick steps', 'Grip hard'],
    A({ t: 0, th: 160, sh: 185, th2: 200, sh2: 195, ua: 180, fa: 180 }, { t: 0, th: 200, sh: 195, th2: 160, sh2: 185, ua: 180, fa: 180 }, { j: 'hip', x: 140, y: 76 }, { ...fast('STEP', 'STEP', 0.45), gear: DB }), 'sec'],

  // ---------------- TRICEPS ----------------
  ['triceps', 'Triceps pushdown', 'Triceps', 'Cable', 2, 10, 15, 2.5, ['Elbows by your sides', 'Full lockout', 'Control up'],
    A({ t: 8, th: 180, sh: 180, ua: 172, fa: 40 }, { t: 8, th: 180, sh: 180, ua: 172, fa: 172 }, FOOT,
      { ...con('PUSH DOWN', 'CONTROL UP'), gear: [{ k: 'cable', from: [190, 10] }, { k: 'handle' }], statics: cableTower(200) })],
  ['rope_pushdown', 'Rope pushdown', 'Triceps', 'Cable', 3, 12, 15, 2.5, ['Split the rope at the bottom', 'Elbows stay fixed', 'Squeeze the triceps'],
    A({ t: 8, th: 180, sh: 180, ua: 172, fa: 45 }, { t: 8, th: 180, sh: 180, ua: 172, fa: 178 }, FOOT,
      { ...con('PUSH DOWN', 'CONTROL UP'), gear: [{ k: 'cable', from: [190, 10] }, { k: 'handle' }], statics: cableTower(200) })],
  ['overhead_ext', 'Overhead triceps extension', 'Triceps', 'Dumbbell', 3, 10, 15, 1, ['Elbows point to the ceiling', 'Lower behind the head', 'Extend fully'],
    A({ ...ST, ua: 5, fa: 5 }, { ...ST, ua: 5, fa: 185 }, FOOT, { scale: 0.74,  ...ecc('LOWER', 'EXTEND'), gear: DB })],
  ['skull_crusher', 'Skull crusher', 'Triceps', 'Barbell', 3, 10, 12, 2.5, ['Upper arms still', 'Lower to the forehead', 'Extend without flaring'],
    A({ ...benchBody, ua: 350, fa: 350 }, { ...benchBody, ua: 340, fa: 240 }, BENCH, { ...ecc('LOWER', 'EXTEND'), gear: BB, statics: benchS })],
  ['close_grip_bench', 'Close-grip bench press', 'Triceps', 'Barbell', 3, 8, 12, 2.5, ['Hands shoulder-width', 'Elbows tucked', 'Bar to the lower chest'],
    A({ ...benchBody, ua: 0, fa: 0 }, { ...benchBody, ua: 140, fa: 350 }, BENCH, { ...ecc('LOWER', 'PRESS'), gear: BB, statics: benchS })],
  ['bench_dip', 'Bench dip', 'Triceps', 'Bodyweight', 3, 10, 15, 0, ['Hands on the bench edge', 'Hips close to the bench', 'Lower to ~90° at the elbow'],
    A({ t: 0, th: 110, sh: 160, ua: 195, fa: 195 }, { t: 0, th: 100, sh: 150, ua: 235, fa: 165 }, { j: 'hand', x: 110, y: 106 }, { ...ecc('LOWER', 'PRESS'), statics: [[66, 110, 120, 110, 8], [88, 110, 88, 160, 5]] })],
  ['kickback', 'Triceps kickback', 'Triceps', 'Dumbbell', 3, 12, 15, 1, ['Upper arm parallel to the floor', 'Extend straight back', 'Pause at lockout'],
    A({ t: 75, th: 170, sh: 185, ua: 250, fa: 180 }, { t: 75, th: 170, sh: 185, ua: 250, fa: 252 }, FOOT, { ...con('EXTEND', 'RETURN'), gear: DB })],
  ['diamond_pushup', 'Diamond push-up', 'Triceps', 'Bodyweight', 3, 8, 12, 0, ['Hands together under the chest', 'Elbows brush the ribs', 'Body straight'],
    A(plankA, { ...plankB, ua: 210, fa: 160 }, TOE, ecc('LOWER', 'PUSH'))],

  // ---------------- CORE ----------------
  ['plank', 'Plank', 'Core', 'Bodyweight', 3, 30, 60, 0, ['Elbows under shoulders', 'Squeeze glutes', 'Straight line head to heels'],
    A({ t: 77, th: 257, sh: 257, ua: 180, fa: 90, ft: 160 }, { t: 78, th: 258, sh: 258, ua: 180, fa: 90, ft: 160 }, TOE, { hold: true, labels: ['HOLD', 'HOLD'] }), 'sec'],
  ['side_plank', 'Side plank', 'Core', 'Bodyweight', 3, 20, 45, 0, ['Elbow under the shoulder (shown side-on)', 'Hips high', 'Top arm to the sky'],
    A({ t: 77, th: 257, sh: 257, ua: 180, fa: 90, ua2: 0, fa2: 0, ft: 160 }, { t: 78, th: 258, sh: 258, ua: 180, fa: 90, ua2: 0, fa2: 0, ft: 160 }, TOE, { hold: true, labels: ['HOLD', 'HOLD'] }), 'sec'],
  ['crunch', 'Crunch', 'Core', 'Bodyweight', 3, 15, 20, 0, ['Lower back stays down', 'Curl the ribs to the hips', 'Exhale at the top'],
    A({ t: 270, th: 40, sh: 150, ua: 300, fa: 60 }, { t: 305, th: 40, sh: 150, ua: 330, fa: 90 }, FLOOR, con('CRUNCH', 'LOWER'))],
  ['hanging_leg_raise', 'Hanging leg raise', 'Core', 'Bodyweight', 3, 8, 15, 0, ['Dead hang, no swing', 'Lift legs to hip height', 'Lower slowly'],
    A({ t: 0, th: 180, sh: 180, ua: 0, fa: 0 }, { t: 350, th: 85, sh: 85, ua: 0, fa: 0 }, HANG, { scale: 0.72,  ...con('RAISE', 'LOWER'), statics: barS })],
  ['lying_leg_raise', 'Lying leg raise', 'Core', 'Bodyweight', 3, 12, 15, 0, ['Hands under the hips', 'Legs straight', "Don't let the back arch"],
    A({ t: 270, th: 85, sh: 85, ua: 90, fa: 90 }, { t: 270, th: 5, sh: 5, ua: 90, fa: 90 }, { j: 'hip', x: 160, y: 150 }, con('RAISE', 'LOWER'))],
  ['russian_twist', 'Russian twist', 'Core', 'Other', 3, 20, 30, 0, ['Lean back, chest proud', 'Rotate shoulders side to side', 'Feet down if needed'],
    A({ t: 330, th: 50, sh: 120, ua: 125, fa: 150 }, { t: 330, th: 50, sh: 120, ua: 100, fa: 60 }, { j: 'hip', x: 150, y: 148 }, { ...fast('TWIST', 'TWIST', 0.55), gear: [{ k: 'ball' }] })],
  ['mountain_climber', 'Mountain climber', 'Core', 'Bodyweight', 3, 30, 45, 0, ['Hands under shoulders', 'Drive knees to chest', 'Hips stay low'],
    A({ t: 64, th: 244, sh: 244, th2: 140, sh2: 265, ua: 180, fa: 180, ft: 160, ft2: 160 }, { t: 64, th: 140, sh: 265, th2: 244, sh2: 244, ua: 180, fa: 180, ft: 160, ft2: 160 }, { j: 'hand', x: 200, y: 156 }, fast('DRIVE', 'SWITCH', 0.32)), 'sec'],
  ['dead_bug', 'Dead bug', 'Core', 'Bodyweight', 3, 10, 12, 0, ['Lower back pressed down', 'Opposite arm and leg extend', 'Move slowly'],
    A({ t: 270, th: 0, sh: 90, ua: 0, fa: 0 }, { t: 270, th: 80, sh: 85, ua: 270, fa: 270, th2: 0, sh2: 90, ua2: 0, fa2: 0 }, { j: 'hip', x: 175, y: 148 }, { ab: 1.2, ba: 1.2, labels: ['EXTEND', 'RETURN'] })],
  ['bicycle_crunch', 'Bicycle crunch', 'Core', 'Bodyweight', 3, 20, 30, 0, ['Elbow to opposite knee', 'Extend the other leg', 'Steady tempo'],
    A({ t: 300, th: 20, sh: 110, th2: 75, sh2: 80, ua: 330, fa: 90 }, { t: 300, th: 75, sh: 80, th2: 20, sh2: 110, ua: 330, fa: 90 }, { j: 'hip', x: 170, y: 148 }, fast('TWIST', 'TWIST', 0.55))],
  ['ab_wheel', 'Ab wheel rollout', 'Core', 'Other', 3, 6, 12, 0, ['Start on the knees', 'Roll out with a flat back', 'Pull back with the abs'],
    A({ t: 60, th: 175, sh: 270, ft: 270, ua: 165, fa: 165 }, { t: 82, th: 115, sh: 270, ft: 270, ua: 105, fa: 105 }, { j: 'knee', x: 120, y: 156 }, { ...ecc('ROLL OUT', 'PULL BACK'), gear: [{ k: 'wheel' }] })],
  ['cable_crunch', 'Cable crunch', 'Core', 'Cable', 3, 12, 15, 2.5, ['Kneel, rope by the head', 'Crunch ribs to hips', "Hips don't move"],
    A({ t: 10, th: 180, sh: 270, ft: 270, ua: 20, fa: 200 }, { t: 105, th: 180, sh: 270, ft: 270, ua: 120, fa: 300 }, { j: 'knee', x: 140, y: 156 },
      { ...con('CRUNCH', 'RETURN'), gear: [{ k: 'cable', from: [150, 8] }], statics: [[150, 8, 214, 8, 4], ...cableTower(214)] })],
  ['superman', 'Superman', 'Core', 'Bodyweight', 3, 10, 15, 0, ['Lie face down', 'Lift arms and legs together', 'Hold for a breath'],
    A({ t: 90, th: 270, sh: 270, ua: 90, fa: 90, ft: 180 }, { t: 78, th: 282, sh: 282, ua: 75, fa: 75, ft: 190 }, { j: 'hip', x: 130, y: 150 }, con('LIFT', 'LOWER'))],

  // ---------------- CARDIO / FULL BODY ----------------
  ['jumping_jack', 'Jumping jacks', 'Cardio', 'Bodyweight', 3, 30, 60, 0, ['Arms overhead as feet jump out', 'Land softly', 'Keep a steady rhythm'],
    A(ST, { ...ST, ua: 0, fa: 0, dy: -8 }, FOOT, { scale: 0.74, ...fast('OUT', 'IN', 0.32) }), 'sec'],
  ['burpee', 'Burpee', 'Full body', 'Bodyweight', 3, 8, 12, 0, ['Squat, hands down', 'Kick feet back to a plank', 'Jump up, hands overhead'],
    { scale: 0.74, a: { ...ST, ua: 0, fa: 0 }, b: { t: 50, th: 100, sh: 205, ua: 160, fa: 180 }, c: { ...plankA }, anchor: FOOT, ab: 0.5, bc: 0.45, ba: 0.6, labels: ['SQUAT', 'KICK BACK', 'JUMP'] }],
  ['box_jump', 'Box jump', 'Full body', 'Other', 3, 5, 8, 0, ['Swing the arms', 'Land softly in a squat', 'Step down, don’t jump down'],
    A({ t: 45, th: 100, sh: 205, ua: 225, fa: 225 }, { t: 25, th: 110, sh: 200, ua: 90, fa: 90, dx: 75, dy: -40 }, { j: 'ankle', x: 120, y: 156 },
      { ab: 0.6, ba: 1.0, labels: ['JUMP', 'STEP DOWN'], statics: [[176, 120, 240, 120, 8], [176, 120, 176, 160, 6], [240, 120, 240, 160, 6]] })],
  ['jump_squat', 'Jump squat', 'Full body', 'Bodyweight', 3, 8, 12, 0, ['Quarter-squat load', 'Explode up', 'Land quietly'],
    A({ t: 35, th: 105, sh: 200, ua: 210, fa: 210 }, { ...ST, ua: 20, fa: 20, ft: 140, dy: -26 }, FOOT, { scale: 0.74, ...fast('JUMP', 'LAND', 0.45) })],
  ['high_knees', 'High knees', 'Cardio', 'Bodyweight', 3, 30, 45, 0, ['Knees to hip height', 'Quick arms', 'Stay on the balls of the feet'],
    A({ t: 0, th: 90, sh: 180, th2: 185, sh2: 185, ua: 130, fa: 50, ua2: 220, fa2: 200, ft2: 130 }, { t: 0, th: 185, sh: 185, th2: 90, sh2: 180, ua: 220, fa: 200, ua2: 130, fa2: 50, ft: 130, dy: -4 }, { j: 'hip', x: 140, y: 76 }, fast('DRIVE', 'SWITCH', 0.24)), 'sec'],
  ['jump_rope', 'Jump rope', 'Cardio', 'Other', 3, 1, 3, 0, ['Small hops', 'Turn the rope with the wrists', 'Elbows close'],
    A({ ...ST, ua: 160, fa: 120 }, { ...ST, ua: 160, fa: 120, ft: 140, dy: -8 }, FOOT, { ...fast('HOP', 'HOP', 0.25), gear: [{ k: 'jumprope' }] }), 'min'],
  ['running', 'Running', 'Cardio', 'Bodyweight', 1, 10, 30, 0, ['Tall posture, slight lean', 'Land under the hips', 'Relaxed shoulders'],
    A({ t: 10, th: 130, sh: 200, th2: 210, sh2: 260, ua: 140, fa: 60, ua2: 220, fa2: 150 }, { t: 10, th: 210, sh: 260, th2: 130, sh2: 200, ua: 220, fa: 150, ua2: 140, fa2: 60 }, { j: 'hip', x: 140, y: 82 }, fast('STRIDE', 'STRIDE', 0.3)), 'min'],
  ['brisk_walk', 'Brisk walk', 'Cardio', 'Bodyweight', 1, 20, 45, 0, ['Head up', 'Arms swing naturally', 'Walk with purpose'],
    A({ t: 3, th: 160, sh: 185, th2: 200, sh2: 195, ua: 160, fa: 140, ua2: 200, fa2: 190 }, { t: 3, th: 200, sh: 195, th2: 160, sh2: 185, ua: 200, fa: 190, ua2: 160, fa2: 140 }, { j: 'hip', x: 140, y: 76 }, fast('STEP', 'STEP', 0.5)), 'min'],
  ['rowing_machine', 'Rowing machine', 'Cardio', 'Machine', 1, 10, 20, 0, ['Legs, then back, then arms', 'Reverse on the way in', 'Smooth, long strokes'],
    A({ t: 25, th: 40, sh: 160, ua: 95, fa: 95, ft: 30 }, { t: 345, th: 92, sh: 98, ua: 210, fa: 95, ft: 10 }, { j: 'ankle', x: 200, y: 138 },
      { ab: 0.8, ba: 1.2, labels: ['DRIVE', 'RECOVER'], gear: [{ k: 'cable', from: [218, 128] }, { k: 'handle' }], statics: [[56, 148, 226, 148, 5], [206, 118, 206, 150, 7], [226, 128, 226, 160, 8]] }), 'min'],
  ['cycling', 'Stationary bike', 'Cardio', 'Machine', 1, 10, 30, 0, ['Seat at hip height', 'Smooth circles', 'Relaxed upper body'],
    A({ t: 25, th: 120, sh: 170, th2: 150, sh2: 225, ua: 110, fa: 100 }, { t: 25, th: 150, sh: 225, th2: 120, sh2: 170, ua: 110, fa: 100 }, { j: 'hip', x: 120, y: 96 },
      { ...fast('PEDAL', 'PEDAL', 0.35), statics: [[120, 104, 140, 150, 6], [116, 104, 132, 104, 8], [140, 150, 200, 150, 6], [200, 150, 196, 80, 6], [186, 80, 206, 80, 6]] }), 'min'],
  ['stair_climber', 'Stair climber', 'Cardio', 'Machine', 1, 10, 20, 0, ['Stand tall', 'Whole foot on each step', 'Light grip on the rails'],
    A({ t: 8, th: 110, sh: 190, th2: 180, sh2: 180, ua: 160, fa: 90 }, { t: 8, th: 180, sh: 180, th2: 110, sh2: 190, ua: 160, fa: 90 }, { j: 'hip', x: 140, y: 80 },
      { ...fast('STEP', 'STEP', 0.45), statics: [[180, 60, 180, 160, 6], [168, 96, 196, 96, 5]] }), 'min'],
  ['battle_ropes', 'Battle ropes', 'Full body', 'Other', 3, 20, 30, 0, ['Half-squat stance', 'Alternate arms fast', 'Keep the core braced'],
    A({ t: 20, th: 120, sh: 200, ua: 120, fa: 100, ua2: 70, fa2: 60 }, { t: 20, th: 120, sh: 200, ua: 70, fa: 60, ua2: 120, fa2: 100 }, FOOT, { ...fast('WAVE', 'WAVE', 0.22), gear: [{ k: 'battlerope', to: [300, 150] }] }), 'sec'],
  ['sled_push', 'Sled push', 'Full body', 'Other', 3, 20, 30, 0, ['Arms locked, low lean', 'Drive with short steps', 'Push through the toes'],
    A({ t: 55, th: 130, sh: 200, th2: 210, sh2: 235, ua: 70, fa: 75, ft2: 140 }, { t: 55, th: 210, sh: 235, th2: 130, sh2: 200, ua: 70, fa: 75, ft: 140 }, { j: 'hip', x: 110, y: 96 }, { ...fast('DRIVE', 'DRIVE', 0.4), gear: [{ k: 'sled' }] }), 'sec'],
  ['broad_jump', 'Broad jump', 'Full body', 'Bodyweight', 3, 5, 6, 0, ['Arms back, hips back', 'Jump far, not high', 'Stick the landing'],
    A({ t: 45, th: 100, sh: 205, ua: 230, fa: 230 }, { t: 35, th: 105, sh: 200, ua: 100, fa: 100, dx: 110 }, { j: 'ankle', x: 80, y: 156 }, { ab: 0.6, ba: 0.9, labels: ['JUMP', 'RESET'] })],
  ['thruster', 'Dumbbell thruster', 'Full body', 'Dumbbell', 3, 10, 12, 2, ['Front squat to press in one move', 'Drive with the legs', 'Lock out overhead'],
    A({ t: 25, th: 100, sh: 205, ua: 160, fa: 10 }, { ...ST, ua: 0, fa: 0 }, FOOT, { scale: 0.74,  ...con('DRIVE UP', 'SQUAT'), gear: DB })],
  ['clean_press', 'Kettlebell clean & press', 'Full body', 'Kettlebell', 3, 8, 10, 4, ['Hike, clean to the rack', 'Press overhead', 'Lower to the rack, then the floor'],
    { scale: 0.74, a: { t: 65, th: 150, sh: 195, ua: 190, fa: 190 }, b: { ...ST, ua: 160, fa: 15 }, c: { ...ST, ua: 0, fa: 0 }, anchor: FOOT, ab: 0.6, bc: 0.6, ba: 1.2, labels: ['CLEAN', 'PRESS', 'LOWER'], gear: KB }],
  ['bear_crawl', 'Bear crawl', 'Full body', 'Bodyweight', 3, 20, 30, 0, ['Knees hover just off the floor', 'Opposite hand and foot move', 'Back flat'],
    A({ t: 80, th: 150, sh: 250, th2: 175, sh2: 255, ua: 170, fa: 180, ua2: 190, fa2: 180, ft: 160, ft2: 160 }, { t: 80, th: 175, sh: 255, th2: 150, sh2: 250, ua: 190, fa: 180, ua2: 170, fa2: 180, ft: 160, ft2: 160 }, { j: 'hip', x: 120, y: 104 }, fast('CRAWL', 'CRAWL', 0.4)), 'sec'],
];

export const EXERCISES: Record<string, ExerciseDef> = Object.fromEntries(
  RAW.map(([key, name, group, equip, sets, repMin, repMax, increment, cues, anim, unit]) => [key, { key, name, group, equip, sets, repMin, repMax, increment, cues, anim, unit: unit ?? 'reps' }]),
);

export const EXERCISE_LIST: ExerciseDef[] = RAW.map((r) => EXERCISES[r[0]]);
