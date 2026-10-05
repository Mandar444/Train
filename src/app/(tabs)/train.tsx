import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Btn, Card, Enter, haptic, Icon, IconName, Press, Row, Screen, T } from '../../components/ui';
import { ExerciseAnim, ExerciseThumb } from '../../components/ExerciseAnim';
import { Chip, Section } from '../../components/workout';
import { useInterval, useQuery } from '../../lib/hooks';
import * as repo from '../../lib/repo';
import {
  DAY_KEYS, DayKey, estMinutes, EXERCISES, ExerciseDef, isDayKey, PlanItem, PROGRAM, REST_DAY, SCHEDULE, shortLabel, SWAPS, warmupFor, workoutName,
} from '../../lib/plan';
import { itemDef, nextTrainingDay, restLabel, restOf, rirOf, scheme, suggest, Suggestion, weekNumber } from '../../lib/logic';
import { addDays, dowLong, mondayOf, today, weekday } from '../../lib/dates';
import { C, F } from '../../lib/theme';

async function loadTrain() {
  const date = today();
  const open = await repo.openSession();
  const todays = await repo.sessionOn(date);
  const plan = await repo.getWorkouts();
  const profile = await repo.getProfile();
  const mon = mondayOf(date);
  const weekSessions = (await repo.sessionsBetween(mon, addDays(mon, 6))).filter((s) => s.completed);
  const sess = open ?? (todays?.completed ? todays : null);
  const sets = sess ? await repo.setsFor(sess.id) : [];
  const exKeys = sess ? Array.from(new Set(sets.map((x) => x.exercise))).filter((k) => EXERCISES[k]) : [];

  const defs: Record<string, ExerciseDef> = {};
  const rest: Record<string, number> = {};
  for (const d of DAY_KEYS) for (const i of plan[d]) { defs[i.key] ??= itemDef(i); rest[i.key] ??= restOf(i); }
  if (sess && isDayKey(sess.type)) for (const i of plan[sess.type]) { defs[i.key] = itemDef(i); rest[i.key] = restOf(i); }
  for (const k of exKeys) {
    defs[k] ??= itemDef(k);
    rest[k] ??= restOf(defs[k]);
    if (open) for (const s of SWAPS[k] ?? []) if (EXERCISES[s]) { defs[s] ??= itemDef(s); rest[s] ??= restOf(defs[s]); }
  }
  const prev: Record<string, repo.ExSet[]> = {};
  const sug: Record<string, Suggestion> = {};
  for (const k of Object.keys(defs)) {
    prev[k] = await repo.lastSetsFor(k, sess?.id);
    sug[k] = suggest(defs[k], prev[k]);
  }
  const count = (await repo.sessions()).filter((x) => x.completed).length;
  const week = profile ? weekNumber(profile, date) : 1;
  return { date, open, sess, sets, exKeys, prev, sug, count, plan, defs, rest, weekSessions, week, mon };
}

type TD = Awaited<ReturnType<typeof loadTrain>>;

export default function Train() {
  const { data } = useQuery(loadTrain, []);
  const [showDone, setShowDone] = useState(true);
  if (!data) return <Screen><View /></Screen>;
  if (data.open) return <Live data={data} />;
  if (data.sess?.completed && showDone) return <Done data={data} onWeek={() => setShowDone(false)} />;
  return <Overview data={data} onShowDone={data.sess?.completed ? () => setShowDone(true) : undefined} />;
}

// ---------- overview ----------

const DOS = [
  'Keep the weights heavy. Heavy sets are what tell your body to hold on to muscle.',
  'Stop 1 to 2 reps before failure on most sets.',
  'Add reps first. When every set hits the top of the range, add weight.',
  'Hit your protein every day.',
  'Walk your steps.',
  'Sleep 7 hours or more.',
];
const DONTS = [
  'Train every set to failure. You will recover slowly on low calories.',
  'Add extra cardio beyond the finisher. Steps do that job.',
  'Drop the weight to chase a pump.',
  'Skip legs.',
  'Drag sessions out to 2 hours. Aim for about an hour.',
];
const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Overview({ data, onShowDone }: { data: TD; onShowDone?: () => void }) {
  const [selDate, setSelDate] = useState(data.date);
  const key = SCHEDULE[weekday(selDate)];
  const isToday = selDate === data.date;

  return (
    <Screen>
      <Enter>
        <View style={{ gap: 6, paddingTop: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T.Label>{isToday ? `${dowLong(selDate)}, week ${data.week}` : `Preview: ${dowLong(selDate)}`}</T.Label>
            {!isToday ? (
              <Text onPress={() => { haptic(); setSelDate(data.date); }} style={{ fontFamily: F.semibold, fontSize: 14, color: C.lime }}>Back to today</Text>
            ) : null}
          </Row>
          {key ? <Title day={key} /> : <T.Display style={{ fontSize: 40 }}>Rest day</T.Display>}
        </View>
      </Enter>

      <WeekStrip data={data} selWeekday={weekday(selDate)} onPick={(d) => setSelDate(d)} />

      {onShowDone && isToday ? (
        <Card onPress={onShowDone} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: C.lime }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={18} color={C.bg} width={3} />
          </View>
          <View style={{ flex: 1 }}>
            <T.Strong>{`${workoutName(data.sess?.type)} is done`}</T.Strong>
            <T.Small>Tap to see today's summary</T.Small>
          </View>
          <Icon name="chevron" color={C.lime} />
        </Card>
      ) : null}

      {key ? <DayPlan data={data} day={key} isToday={isToday} /> : <RestDay data={data} onPreview={(d) => setSelDate(d)} />}

      <DoDont />

      <Row gap={8}>
        <Btn small kind="ghost" icon="edit" title="Edit workout" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/workout-edit', params: { type: key ?? 'push_a' } })} />
        <Btn small kind="ghost" icon="dumbbell" title="Exercise library" style={{ flex: 1 }} onPress={() => router.push('/library')} />
      </Row>
    </Screen>
  );
}

function Title({ day }: { day: DayKey }) {
  const d = PROGRAM[day];
  const [word, letter] = d.name.split(' ');
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 46, color: C.text, letterSpacing: -1 }}>
        {word} <Text style={{ color: C.lime }}>{letter}</Text>
      </Text>
      <T.Body style={{ color: C.text2 }}>{d.subtitle}</T.Body>
    </View>
  );
}

function WeekStrip({ data, selWeekday, onPick }: { data: TD; selWeekday: number; onPick: (date: string) => void }) {
  return (
    <Row gap={6}>
      {WEEK_LETTERS.map((l, i) => {
        const d = addDays(data.mon, i);
        const wd = weekday(d);
        const k = SCHEDULE[wd];
        const done = data.weekSessions.some((s) => s.date === d);
        const isToday = d === data.date;
        const sel = wd === selWeekday;
        const bg = isToday ? C.lime : sel ? C.card2 : C.card;
        const fg = isToday ? C.bg : C.text;
        return (
          <Press key={i} onPress={() => { haptic(); onPick(d); }} scaleTo={0.92} accessibilityLabel={`${dowLong(d)}, ${workoutName(k)}`}
            style={{ flex: 1, height: 74, borderRadius: 16, backgroundColor: bg, borderWidth: sel && !isToday ? 1.5 : 1, borderColor: sel ? C.lime : C.line, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: fg }}>{l}</Text>
            <Text style={{ fontFamily: F.semibold, fontSize: 9.5, letterSpacing: 0.3, color: isToday ? C.bg : k ? C.muted : C.faint }}>{shortLabel(k)}</Text>
            <View style={{ height: 14, justifyContent: 'center' }}>
              {done ? <Icon name="check" size={14} color={isToday ? C.bg : C.lime} width={3} /> : <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isToday ? C.bg : d < data.date && k ? C.line3 : 'transparent' }} />}
            </View>
          </Press>
        );
      })}
    </Row>
  );
}

function DayPlan({ data, day, isToday }: { data: TD; day: DayKey; isToday: boolean }) {
  const info = PROGRAM[day];
  const items = data.plan[day];
  const mins = estMinutes(items, info.finisherMin);
  const noteFor = (k: string) => info.items.find((x) => x.key === k)?.note;

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {info.focus.map((f) => <Chip key={f} text={f} />)}
        <Chip tone="lime" text={`About ${mins} min`} />
        <Chip tone="lime" text={`${items.length} exercises`} />
      </View>
      <T.Small style={{ color: C.text2 }}>{info.why}</T.Small>

      <Section>{isToday ? "Today's session" : `${dowLong(addDays(data.mon, (info.weekday + 6) % 7))}'s session`}</Section>

      <StepCard icon="flame" title="Warm-up" meta="5 min" body={warmupFor(items[0]?.key)} />

      {items.length === 0 ? <Card><T.Small>No exercises on this day yet. Tap "Edit workout" below to add some.</T.Small></Card> : null}
      {items.map((it, i) => (
        <Enter key={`${it.key}-${i}`} delay={Math.min(i, 6) * 50}>
          <ExerciseCard n={i + 1} item={it} data={data} note={noteFor(it.key)} />
        </Enter>
      ))}

      {info.finisher
        ? <StepCard icon="timer" title="Finisher" meta={`${info.finisherMin} min`} body={`${info.finisher}. Steady pace where you can still talk. This is the only cardio in the session.`} thumb={info.finisherKey} />
        : <StepCard icon="check" title="No finisher today" meta="" body="Leg day is enough work on its own. Walk your steps later in the day instead." />}

      <Btn title={`Start ${info.name}`} icon="play" disabled={!items.length} style={{ height: 60, borderRadius: 18 }} onPress={async () => {
        haptic('success');
        await repo.startSession(data.date, day, items.map((it) => ({ exercise: it.key, sets: it.sets, weight: data.sug[it.key]?.weight ?? null })));
      }} />
      {!isToday ? <T.Small style={{ textAlign: 'center', color: C.dim }}>{`This is ${dowLong(addDays(data.mon, (info.weekday + 6) % 7))}'s workout. You can still start it today if you moved a session.`}</T.Small> : null}
    </>
  );
}

function StepCard({ icon, title, meta, body, thumb }: { icon: IconName; title: string; meta: string; body: string; thumb?: string | null }) {
  const spec = thumb ? EXERCISES[thumb]?.anim : null;
  return (
    <Card style={{ flexDirection: 'row', gap: 12, padding: 14, alignItems: 'center' }}>
      {spec ? <ExerciseThumb spec={spec} width={84} /> : (
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={C.lime} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Row gap={8}>
          <T.Strong>{title}</T.Strong>
          {meta ? <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.lime }}>{meta}</Text> : null}
        </Row>
        <T.Small style={{ fontSize: 13.5 }}>{body}</T.Small>
      </View>
    </Card>
  );
}

function lastLine(prev: repo.ExSet[], def: ExerciseDef): string {
  if (!prev.length) return 'First time';
  const reps = prev.map((x) => x.reps).join(', ');
  return def.equip === 'Bodyweight' && !prev[0].weight_kg ? `Last: ${reps} reps` : `Last: ${prev[0].weight_kg ?? 0} kg × ${reps}`;
}

function ExerciseCard({ n, item, data, note }: { n: number; item: PlanItem; data: TD; note?: string }) {
  const def = data.defs[item.key] ?? itemDef(item);
  const sg = data.sug[item.key] ?? { weight: null, up: false, note: '' };
  const prev = data.prev[item.key] ?? [];
  const rest = data.rest[item.key] ?? restOf(item);
  return (
    <Card onPress={() => router.push({ pathname: '/history', params: { exercise: item.key } })} style={{ padding: 12, gap: 10 }}>
      <Row gap={12} style={{ alignItems: 'center' }}>
        <View>
          <ExerciseThumb spec={def.anim} width={88} />
          <View style={{ position: 'absolute', left: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.lime }}>{n}</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T.Strong numberOfLines={2}>{def.name}</T.Strong>
          <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.text }}>{scheme(def)}</Text>
          <T.Small style={{ fontSize: 12.5, color: C.dim }}>{`Rest ${restLabel(rest)} · ${rirOf(item.key)} reps left`}</T.Small>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 64 }}>
          {sg.up ? <Chip tone="solid" text={`+${def.increment} kg`} /> : null}
          {sg.weight != null && sg.weight > 0 ? (
            <Text style={{ fontFamily: F.display, fontSize: 22, color: sg.up ? C.lime : C.text }}>{sg.weight}<Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.dim }}> kg</Text></Text>
          ) : null}
        </View>
      </Row>
      <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
        <T.Small style={{ fontSize: 12.5, flex: 1 }} numberOfLines={1}>{lastLine(prev, def)}</T.Small>
        <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: sg.up ? C.lime : C.dim }}>{sg.up ? 'Add weight today' : prev.length ? 'Beat last time' : 'Find your weight'}</Text>
      </Row>
      {note ? <T.Small style={{ fontSize: 12.5, color: C.text2 }}>{note}</T.Small> : null}
    </Card>
  );
}

function RestDay({ data, onPreview }: { data: TD; onPreview: (date: string) => void }) {
  const next = nextTrainingDay(data.date);
  return (
    <>
      <Card style={{ gap: 12, borderColor: C.line3 }}>
        <Row gap={10}>
          <Icon name="moon" color={C.lime} />
          <T.Strong>No lifting today</T.Strong>
        </Row>
        <T.Body style={{ color: C.text2, fontSize: 15 }}>{REST_DAY.why}</T.Body>
        <View style={{ gap: 8 }}>
          {REST_DAY.todo.map((t) => (
            <Row key={t} gap={10} style={{ alignItems: 'flex-start' }}>
              <Icon name="check" size={16} color={C.lime} width={2.6} />
              <T.Small style={{ flex: 1, color: C.text }}>{t}</T.Small>
            </Row>
          ))}
        </View>
      </Card>
      <Btn kind="ghost" icon="chevron" title={`Preview ${dowLong(next.date)}: ${PROGRAM[next.key].name}`} onPress={() => onPreview(next.date)} />
    </>
  );
}

function DoDont() {
  return (
    <Card style={{ gap: 14 }}>
      <T.Strong style={{ fontSize: 18 }}>How to train on a cut</T.Strong>
      <View style={{ gap: 9 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.lime }}>Do this</Text>
        {DOS.map((t) => (
          <Row key={t} gap={10} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Icon name="check" size={12} color={C.bg} width={3} />
            </View>
            <T.Small style={{ flex: 1, color: C.text }}>{t}</T.Small>
          </Row>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: C.line }} />
      <View style={{ gap: 9 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.muted }}>Don't do this</Text>
        {DONTS.map((t) => (
          <Row key={t} gap={10} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line3, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Icon name="close" size={11} color={C.muted} width={3} />
            </View>
            <T.Small style={{ flex: 1 }}>{t}</T.Small>
          </Row>
        ))}
      </View>
    </Card>
  );
}

// ---------- live session ----------

function Live({ data }: { data: TD }) {
  const { width } = useWindowDimensions();
  const sess = data.sess!;
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restLen, setRestLen] = useState(90);
  const [open, setOpen] = useState<string | null>(null);
  useInterval(() => setNow(Date.now()), 1000);

  const byEx = useMemo(() => {
    const m: Record<string, repo.ExSet[]> = {};
    for (const s of data.sets) (m[s.exercise] ??= []).push(s);
    return m;
  }, [data.sets]);
  const current = data.exKeys.find((k) => byEx[k]?.some((s) => !s.done)) ?? data.exKeys[data.exKeys.length - 1];
  const upNext = data.exKeys.find((k) => k !== current && byEx[k]?.some((s) => !s.done));
  const expanded = open ?? current;
  const doneCount = data.sets.filter((s) => s.done).length;
  const exDone = data.exKeys.filter((k) => byEx[k]?.every((s) => s.done)).length;
  const elapsed = Math.max(0, Math.floor((now - new Date(sess.started_at).getTime()) / 1000));
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const restOfKey = (k: string) => data.rest[k] ?? (data.defs[k] ? restOf(data.defs[k]) : 90);
  const curSets = byEx[current] ?? [];
  const nextSetNo = (curSets.find((s) => !s.done)?.set_number) ?? null;
  const info = isDayKey(sess.type) ? PROGRAM[sess.type] : null;

  useEffect(() => {
    if (restEnd && restLeft === 0) { haptic('warn'); setRestEnd(null); }
  }, [restLeft, restEnd]);

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const startRest = (len: number) => { setRestLen(len); setRestEnd(Date.now() + len * 1000); };
  const finish = () => {
    const undone = data.sets.filter((s) => !s.done).length;
    Alert.alert('Finish workout?', undone ? `${undone} set${undone > 1 ? 's' : ''} not ticked will be skipped.` : 'All sets done. Save it?', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish', onPress: async () => { haptic('success'); await repo.finishSession(sess.id, null); } },
    ]);
  };

  return (
    <Screen bottomPad={190}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <T.Label>{`Live · session ${data.count + 1}`}</T.Label>
          <T.Display style={{ fontSize: 36 }}>{workoutName(sess.type)}</T.Display>
          {info ? <T.Small>{info.subtitle}</T.Small> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: F.display, fontSize: 30, color: C.text, fontVariant: ['tabular-nums'] }}>{mm(elapsed)}</Text>
          <T.Small>elapsed</T.Small>
        </View>
      </Row>

      <View style={{ gap: 8 }}>
        <Row gap={4}>
          {data.exKeys.map((k) => {
            const sets = byEx[k] ?? [];
            const f = sets.length ? sets.filter((s) => s.done).length / sets.length : 0;
            return <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}><View style={{ width: `${f * 100}%`, height: 6, backgroundColor: k === current && f < 1 ? C.text : C.lime }} /></View>;
          })}
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Small style={{ fontSize: 13 }}>{`${exDone} of ${data.exKeys.length} exercises · ${doneCount}/${data.sets.length} sets`}</T.Small>
        </Row>
      </View>

      <Pressable onPress={() => { haptic(); if (restLeft > 0) setRestEnd(null); else startRest(restOfKey(current)); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: restLeft > 0 ? C.lime : C.card, borderWidth: 1, borderColor: restLeft > 0 ? C.lime : C.line }}>
        <RestRing left={restLeft} total={restLen} active={restLeft > 0} label={restLeft > 0 ? mm(restLeft) : 'Go'} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: restLeft > 0 ? C.bg : C.muted }}>{restLeft > 0 ? 'Resting' : 'Ready for the next set'}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 14, color: restLeft > 0 ? C.bg : C.text }} numberOfLines={2}>
            {nextSetNo ? `${data.defs[current]?.name ?? 'Next'}, set ${nextSetNo} of ${curSets.length}` : 'All sets ticked. Finish when ready.'}
          </Text>
        </View>
        <Text style={{ fontFamily: F.semibold, fontSize: 13, color: restLeft > 0 ? C.bg : C.lime }}>{restLeft > 0 ? 'Skip' : `Rest ${restLabel(restOfKey(current))}`}</Text>
      </Pressable>

      {upNext ? (
        <Row gap={8}>
          <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.dim }}>Up next</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.text2, flex: 1 }} numberOfLines={1}>{`${data.defs[upNext]?.name ?? upNext}, ${data.defs[upNext] ? scheme(data.defs[upNext]) : ''}`}</Text>
        </Row>
      ) : null}

      {data.exKeys.map((k, idx) => {
        const def = data.defs[k] ?? itemDef(k);
        const sets = byEx[k] ?? [];
        const isOpen = k === expanded;
        const allDone = sets.length > 0 && sets.every((s) => s.done);
        const rir = rirOf(k);
        if (!isOpen) {
          return (
            <Pressable key={k} onPress={() => setOpen(k)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: allDone ? C.lime : C.line3, backgroundColor: allDone ? C.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {allDone ? <Icon name="check" size={15} color={C.bg} width={3} /> : <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{idx + 1}</Text>}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T.Strong style={{ color: allDone ? C.dim : C.text }}>{def.name}</T.Strong>
                  <T.Small>{`${sets.filter((s) => s.done).length}/${sets.length} sets`}{data.prev[k]?.length ? ` · ${lastLine(data.prev[k], def).toLowerCase()}` : ''}</T.Small>
                </View>
                {data.sug[k]?.up && !allDone ? <Chip tone="lime" text={`+${def.increment} kg`} /> : null}
              </Card>
            </Pressable>
          );
        }
        const note = info?.items.find((x) => x.key === k)?.note;
        const swaps = (SWAPS[k] ?? []).filter((s) => EXERCISES[s] && !data.exKeys.includes(s)).slice(0, 2);
        return (
          <Card key={k} style={{ gap: 14, borderColor: C.line3 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.lime }}>{`Exercise ${idx + 1} of ${data.exKeys.length}`}</Text>
                <T.Display style={{ fontSize: 28 }}>{def.name}</T.Display>
                <T.Small>{def.unit === 'reps' ? `${scheme(def)} · rest ${restLabel(restOfKey(k))} · stop with ${rir} rep${rir > 1 ? 's' : ''} left` : `${scheme(def)} · rest ${restLabel(restOfKey(k))}`}</T.Small>
              </View>
              <Pressable accessibilityLabel="History" onPress={() => router.push({ pathname: '/history', params: { exercise: k } })} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trend" size={18} />
              </Pressable>
            </Row>

            <ExerciseAnim spec={def.anim} width={width - 40 - 38} />

            <View style={{ gap: 6 }}>
              {def.cues.map((c, i) => (
                <Row key={c} gap={10} style={{ alignItems: 'flex-start' }}>
                  <Text style={{ width: 16, fontFamily: F.bold, fontSize: 13, color: C.lime }}>{i + 1}</Text>
                  <T.Small style={{ flex: 1, color: C.text, fontSize: 13.5 }}>{c}</T.Small>
                </Row>
              ))}
            </View>
            {note ? <T.Small style={{ color: C.text2, fontSize: 13 }}>{note}</T.Small> : null}

            <Row gap={6} style={{ paddingHorizontal: 2 }}>
              <Text style={[hdr, { width: 26 }]}>Set</Text>
              <Text style={[hdr, { flex: 1 }]}>Last</Text>
              <Text style={[hdr, { width: 64, textAlign: 'center' }]}>kg</Text>
              <Text style={[hdr, { width: 52, textAlign: 'center' }]}>{def.unit === 'sec' ? 'Sec' : def.unit === 'min' ? 'Min' : 'Reps'}</Text>
              <Text style={[hdr, { width: 36, textAlign: 'center' }]}>RIR</Text>
              <View style={{ width: 44 }} />
            </Row>
            {sets.map((st, i) => (
              <SetRow key={st.id} st={st} prev={data.prev[k]?.[i]} placeholderReps={def.repMax} rirTarget={rir}
                onDone={(done) => { if (done) startRest(restOfKey(k)); }} />
            ))}

            <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.card2 }}>
              <Icon name="up" size={18} color={C.lime} />
              <T.Small style={{ flex: 1, color: C.text2, fontSize: 13 }}>{data.sug[k]?.note}</T.Small>
            </View>

            <Row gap={8}>
              <Btn small kind="ghost" icon="plus" title="Add set" style={{ flex: 1 }} onPress={() => repo.addSet(sess.id, k)} />
              <Btn small kind="danger" title={sets.some((s) => s.pain) ? 'Pain flagged' : 'Flag pain or form'} style={{ flex: 1 }}
                onPress={async () => { const v = sets.some((s) => s.pain) ? 0 : 1; for (const s of sets) await repo.updateSet(s.id, { pain: v }); if (v) haptic('warn'); }} />
            </Row>
            {swaps.length && !allDone ? (
              <View style={{ gap: 6 }}>
                <T.Small style={{ fontSize: 12.5, color: C.dim }}>Machine busy or it does not feel right? Swap the sets you have left:</T.Small>
                <Row gap={8}>
                  {swaps.map((s) => (
                    <Btn key={s} small kind="ghost" title={EXERCISES[s].name} style={{ flex: 1 }} onPress={() => { repo.swapExercise(sess.id, k, s); setOpen(s); }} />
                  ))}
                </Row>
              </View>
            ) : null}
          </Card>
        );
      })}

      <T.Small style={{ color: C.dim }}>If pain is sharp, unusual or getting worse, stop that movement. Flagged lifts never go up in weight automatically.</T.Small>
      <Btn small kind="danger" title="Discard this session" onPress={() => Alert.alert('Discard session?', 'All sets in this session will be deleted.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => repo.discardSession(sess.id) }])} />

      <View style={{ marginTop: 6 }}>
        <Btn title={`Finish workout · ${doneCount}/${data.sets.length} sets`} onPress={finish} style={{ height: 58 }} />
      </View>
    </Screen>
  );
}

const hdr = { fontFamily: F.semibold, fontSize: 12, color: C.dim } as const;

function SetRow({ st, prev, placeholderReps, rirTarget, onDone }: { st: repo.ExSet; prev?: repo.ExSet; placeholderReps: number; rirTarget: number; onDone: (done: boolean) => void }) {
  const [kg, setKg] = useState(st.weight_kg != null ? String(st.weight_kg) : '');
  const [reps, setReps] = useState(st.reps != null ? String(st.reps) : '');
  useEffect(() => { setKg(st.weight_kg != null ? String(st.weight_kg) : ''); }, [st.weight_kg]);
  useEffect(() => { setReps(st.reps != null ? String(st.reps) : ''); }, [st.reps]);
  const done = !!st.done;
  const commitKg = () => { const v = parseFloat(kg.replace(',', '.')); repo.updateSet(st.id, { weight_kg: isNaN(v) ? null : v }); };
  const commitReps = () => { const v = parseInt(reps, 10); repo.updateSet(st.id, { reps: isNaN(v) ? null : v }); };
  return (
    <Row gap={6} style={{ minHeight: 50, paddingHorizontal: 2, borderRadius: 12, backgroundColor: done ? C.limeSoft : 'transparent' }}>
      <Text style={{ width: 26, fontFamily: F.bold, fontSize: 14, color: C.muted, paddingLeft: 6 }}>{st.set_number}</Text>
      <Text style={{ flex: 1, fontFamily: F.body, fontSize: 13, color: C.dim }} numberOfLines={1}>{prev ? `${prev.weight_kg ?? 0} × ${prev.reps}` : '-'}</Text>
      <TextInput value={kg} onChangeText={setKg} onEndEditing={commitKg} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={C.faint} selectTextOnFocus
        style={inp(64)} />
      <TextInput value={reps} onChangeText={setReps} onEndEditing={commitReps} keyboardType="number-pad" placeholder={String(placeholderReps)} placeholderTextColor={C.faint} selectTextOnFocus
        style={inp(52)} />
      <Pressable onPress={() => repo.updateSet(st.id, { rir: ((st.rir ?? rirTarget) + 1) % 5 })} style={{ width: 36, alignItems: 'center', justifyContent: 'center', height: 40 }} accessibilityLabel="Reps in reserve">
        <Text style={{ fontFamily: F.semibold, fontSize: 13, color: st.rir != null ? C.text : C.faint }}>{st.rir ?? rirTarget}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Mark set ${st.set_number} done`}
        onPress={async () => {
          const v = parseFloat(kg.replace(',', '.'));
          const r = parseInt(reps, 10);
          const next = !done;
          await repo.updateSet(st.id, { done: next ? 1 : 0, weight_kg: isNaN(v) ? st.weight_kg : v, reps: isNaN(r) ? (next ? placeholderReps : st.reps) : r, rir: st.rir ?? rirTarget });
          haptic(next ? 'success' : 'light');
          onDone(next);
        }}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: done ? C.lime : C.line3, backgroundColor: done ? C.lime : 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.88 : 1 }] })}>
        <Icon name="check" size={18} color={done ? C.bg : C.faint} width={2.6} />
      </Pressable>
    </Row>
  );
}

const inp = (w: number) => ({ width: w, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg, color: C.text, fontFamily: F.bold, fontSize: 15, textAlign: 'center' as const, padding: 0 });

function RestRing({ left, total, active, label }: { left: number; total: number; active: boolean; label: string }) {
  const r = 22, circ = 2 * Math.PI * r;
  const f = active ? left / total : 0;
  const ink = active ? C.bg : C.lime;
  return (
    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={52} height={52} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={26} cy={26} r={r} stroke={active ? 'rgba(13,14,11,0.15)' : C.line2} strokeWidth={5} fill="none" />
        <Circle cx={26} cy={26} r={r} stroke={ink} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${circ * f} ${circ}`} />
      </Svg>
      <Text style={{ fontFamily: F.bold, fontSize: 12, color: active ? C.bg : C.lime }}>{label}</Text>
    </View>
  );
}

// ---------- done ----------

function Done({ data, onWeek }: { data: TD; onWeek: () => void }) {
  const sess = data.sess!;
  const done = data.sets.filter((s) => s.done);
  const vol = done.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0);
  const mins = sess.finished_at ? Math.round((new Date(sess.finished_at).getTime() - new Date(sess.started_at).getTime()) / 60000) : null;
  const byEx: Record<string, repo.ExSet[]> = {};
  for (const s of done) (byEx[s.exercise] ??= []).push(s);
  const next = nextTrainingDay(sess.date);
  const nextName = PROGRAM[next.key].name;
  const nextLine = next.daysAway === 1 ? `Next: ${nextName} tomorrow` : `Rest day tomorrow. Then ${nextName} on ${dowLong(next.date)}.`;
  const info = isDayKey(sess.type) ? PROGRAM[sess.type] : null;
  return (
    <Screen>
      <Enter>
        <View style={{ gap: 6, paddingTop: 8 }}>
          <T.Label>Session complete</T.Label>
          <T.Display style={{ fontSize: 38 }}>{workoutName(sess.type)} <Text style={{ color: C.lime }}>done</Text></T.Display>
        </View>
      </Enter>
      <Row gap={8}>
        <Big label="Sets" value={String(done.length)} />
        <Big label="Volume kg" value={Math.round(vol).toLocaleString('en-US')} />
        <Big label="Minutes" value={mins != null ? String(mins) : '-'} />
      </Row>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        {Object.entries(byEx).map(([k, sets], i) => (
          <Pressable key={k} onPress={() => router.push({ pathname: '/history', params: { exercise: k } })}>
            <Row style={{ minHeight: 58, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <T.Strong style={{ flex: 1 }} numberOfLines={1}>{data.defs[k]?.name ?? EXERCISES[k]?.name ?? k}</T.Strong>
              <T.Mono>{`${sets[0].weight_kg ?? 0} kg × ${sets.map((s) => s.reps).join(', ')}`}</T.Mono>
            </Row>
          </Pressable>
        ))}
        {!done.length ? <T.Small style={{ padding: 16 }}>No sets were ticked in this session.</T.Small> : null}
      </Card>
      {info?.finisher ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="timer" color={C.lime} />
          <T.Small style={{ flex: 1, color: C.text2 }}>{`If you have not done it yet: ${info.finisher.toLowerCase()} to finish.`}</T.Small>
        </Card>
      ) : null}
      <Card style={{ gap: 6, borderColor: C.lime }}>
        <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.lime }}>{nextLine}</Text>
        <T.Small>Hit your protein, walk your steps and get to bed on time. That is how today's work turns into kept muscle.</T.Small>
      </Card>
      <Btn title="See this week" kind="ghost" icon="calendar" onPress={onWeek} />
      <Btn title="Back to today" kind="ghost" onPress={() => router.push('/')} />
    </Screen>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: 14, gap: 4 }}>
      <T.Label style={{ fontSize: 12 }}>{label}</T.Label>
      <Text style={{ fontFamily: F.display, fontSize: 28, color: C.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </Card>
  );
}
