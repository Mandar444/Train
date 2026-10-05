import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Btn, Card, Enter, haptic, Icon, Pill, Row, Screen, Segmented, T } from '../../components/ui';
import { ExerciseAnim } from '../../components/ExerciseAnim';
import { useInterval, useQuery } from '../../lib/hooks';
import * as repo from '../../lib/repo';
import { ExerciseDef, WorkoutType } from '../../lib/plan';
import { isLiftDay, itemDef, nextType, scheme, suggest, Suggestion } from '../../lib/logic';
import { today } from '../../lib/dates';
import { C, F } from '../../lib/theme';

async function loadTrain() {
  const open = await repo.openSession();
  const last = await repo.lastCompletedSession();
  const todays = await repo.sessionOn(today());
  const plan = await repo.getWorkouts();
  const sess = open ?? (todays?.completed ? todays : null);
  const sets = sess ? await repo.setsFor(sess.id) : [];
  const type: WorkoutType = sess?.type ?? nextType(last);
  const keysFor = (t: WorkoutType) => plan[t].map((i) => i.key);
  const exKeys = sess ? Array.from(new Set(sets.map((x) => x.exercise))) : keysFor(type);
  const defs: Record<string, ExerciseDef> = {};
  for (const t of ['A', 'B'] as WorkoutType[]) for (const i of plan[t]) defs[i.key] ??= itemDef(i);
  if (sess) for (const i of plan[sess.type]) defs[i.key] = itemDef(i);
  for (const k of [...exKeys, 'squat', 'leg_press']) defs[k] ??= itemDef(k);
  const prev: Record<string, repo.ExSet[]> = {};
  const sug: Record<string, Suggestion> = {};
  for (const k of Object.keys(defs)) {
    prev[k] = await repo.lastSetsFor(k, sess?.id);
    sug[k] = suggest(defs[k], prev[k]);
  }
  const count = (await repo.sessions()).filter((x) => x.completed).length;
  return { open, sess, sets, type, exKeys, prev, sug, count, plan, defs };
}

export default function Train() {
  const { data } = useQuery(loadTrain, []);
  const [pick, setPick] = useState<WorkoutType | null>(null);
  if (!data) return <Screen><View /></Screen>;
  if (data.open) return <Live data={data} />;
  if (data.sess?.completed) return <Done data={data} />;

  const type = pick ?? data.type;
  const lift = isLiftDay(today());
  return (
    <Screen>
      <Enter>
        <View style={{ gap: 6 }}>
          <T.Label>{`SESSION ${data.count + 1} · ${lift ? 'TRAINING DAY' : 'RECOVERY DAY'}`}</T.Label>
          <T.Display>Full Body <Text style={{ color: C.lime }}>{type}</Text></T.Display>
        </View>
      </Enter>
      <Segmented options={[{ key: 'A', label: 'Full Body A' }, { key: 'B', label: 'Full Body B' }]} value={type} onChange={(k) => setPick(k as WorkoutType)} />
      {!lift ? <Card tone="green"><T.Small style={{ color: C.text2 }}>Today is a walking / recovery day. Lifting is Mon, Wed, Fri. You can still train if you moved a session.</T.Small></Card> : null}
      <Row gap={8}>
        <Btn small kind="ghost" icon="edit" title={`Edit workout ${type}`} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/workout-edit', params: { type } })} />
        <Btn small kind="ghost" icon="dumbbell" title="Exercise library" style={{ flex: 1 }} onPress={() => router.push('/library')} />
      </Row>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        {data.plan[type].length === 0 ? <T.Small style={{ padding: 16 }}>No exercises in this workout yet. Tap “Edit workout” to add some.</T.Small> : null}
        {data.plan[type].map((it, i) => {
          const k = it.key;
          const d = data.defs[k] ?? itemDef(it);
          const sg = data.sug[k] ?? { weight: null, up: false, note: '' };
          const prev = data.prev[k] ?? [];
          return (
            <Enter key={k} delay={i * 60}>
              <Row style={{ minHeight: 70, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: '#21221C' }} gap={12}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: C.line3, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{i + 1}</Text>
                </View>
                <Pressable style={{ flex: 1, gap: 3 }} onPress={() => router.push({ pathname: '/history', params: { exercise: k } })}>
                  <T.Strong>{d.name}</T.Strong>
                  <T.Small>{scheme(d)}{prev.length ? ` · last ${prev[0].weight_kg} kg × ${prev.map((x) => x.reps).join(', ')}` : ' · first time'}</T.Small>
                </Pressable>
                {sg.up ? <Pill tone="lime" text={`+${d.increment} → ${sg.weight}`} /> : sg.weight ? <Pill text={`${sg.weight} kg`} /> : null}
              </Row>
            </Enter>
          );
        })}
      </Card>
      <Btn title={`Start Full Body ${type}`} icon="play" kind="light" disabled={!data.plan[type].length} onPress={async () => {
        haptic('success');
        await repo.startSession(today(), type, data.plan[type].map((it) => ({ exercise: it.key, sets: it.sets, weight: data.sug[it.key]?.weight ?? null })));
      }} />
      <T.Small style={{ color: C.dim }}>Most working sets should finish with 1–3 good reps left. Train for repeatable progress, not exhaustion.</T.Small>
    </Screen>
  );
}

type TD = Awaited<ReturnType<typeof loadTrain>>;

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
  const expanded = open ?? current;
  const doneCount = data.sets.filter((s) => s.done).length;
  const elapsed = Math.max(0, Math.floor((now - new Date(sess.started_at).getTime()) / 1000));
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;

  useEffect(() => {
    if (restEnd && restLeft === 0) { haptic('warn'); setRestEnd(null); }
  }, [restLeft, restEnd]);

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const finish = () => {
    const undone = data.sets.filter((s) => !s.done).length;
    Alert.alert('Finish workout?', undone ? `${undone} set${undone > 1 ? 's' : ''} not ticked will be skipped.` : 'Nice work. Log it?', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish', onPress: async () => { haptic('success'); await repo.finishSession(sess.id, null); } },
    ]);
  };

  return (
    <Screen bottomPad={190}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 6 }}>
          <T.Label>{`SESSION ${data.count + 1} · LIVE`}</T.Label>
          <T.Display>Full Body <Text style={{ color: C.lime }}>{sess.type}</Text></T.Display>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: F.monoBold, fontSize: 22, color: C.text, fontVariant: ['tabular-nums'] }}>{mm(elapsed)}</Text>
          <T.Small>elapsed</T.Small>
        </View>
      </Row>

      <Row gap={4}>
        {data.exKeys.map((k) => {
          const sets = byEx[k] ?? [];
          const f = sets.length ? sets.filter((s) => s.done).length / sets.length : 0;
          return <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}><View style={{ width: `${f * 100}%`, height: 5, backgroundColor: C.lime }} /></View>;
        })}
      </Row>

      <Pressable onPress={() => { if (restLeft > 0) setRestEnd(null); else { setRestLen(30); setRestEnd(Date.now() + 30000); } }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: restLeft > 0 ? C.lime : C.card, borderWidth: 1, borderColor: restLeft > 0 ? C.lime : C.line }}>
        <RestRing left={restLeft} total={restLen} active={restLeft > 0} label={restLeft > 0 ? mm(restLeft) : 'GO'} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.1, color: restLeft > 0 ? C.bg : C.muted }}>{restLeft > 0 ? 'REST' : 'READY'}</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 14, color: restLeft > 0 ? C.bg : C.text }}>{`Next: ${data.defs[current]?.name ?? 'finish'}`}</Text>
        </View>
        <Text style={{ fontFamily: F.semibold, fontSize: 13, color: restLeft > 0 ? C.bg : C.lime }}>{restLeft > 0 ? 'Skip' : '+30s'}</Text>
      </Pressable>

      {data.exKeys.map((k, idx) => {
        const def = data.defs[k] ?? itemDef(k);
        const sets = byEx[k] ?? [];
        const isOpen = k === expanded;
        const allDone = sets.length > 0 && sets.every((s) => s.done);
        if (!isOpen) {
          return (
            <Pressable key={k} onPress={() => setOpen(k)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: allDone ? C.lime : C.line3, backgroundColor: allDone ? C.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {allDone ? <Icon name="check" size={15} color={C.bg} width={3} /> : <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.muted }}>{idx + 1}</Text>}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <T.Strong style={{ color: allDone ? C.dim : C.text }}>{def.name}</T.Strong>
                  <T.Small>{`${sets.filter((s) => s.done).length}/${sets.length} sets`}{data.prev[k]?.length ? ` · last ${data.prev[k][0].weight_kg} kg × ${data.prev[k].map((x) => x.reps).join(', ')}` : ''}</T.Small>
                </View>
                {data.sug[k]?.up && !allDone ? <Pill tone="lime" text={`+${def.increment} KG`} /> : null}
              </Card>
            </Pressable>
          );
        }
        return (
          <Card key={k} style={{ gap: 14, borderColor: C.line3 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.1, color: C.lime }}>{`EXERCISE ${idx + 1} OF ${data.exKeys.length}`}</Text>
                <T.Display style={{ fontSize: 30 }}>{def.name}</T.Display>
                <T.Small>{`${scheme(def)} · ${def.unit === 'reps' ? 'leave 1–3 reps in reserve' : def.group}`}</T.Small>
              </View>
              <Pressable accessibilityLabel="History" onPress={() => router.push({ pathname: '/history', params: { exercise: k } })} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trend" size={18} />
              </Pressable>
            </Row>

            <ExerciseAnim spec={def.anim} width={width - 40 - 38} />

            <Row gap={6} style={{ alignItems: 'stretch' }}>
              {def.cues.map((c) => (
                <View key={c} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: C.card2, gap: 3 }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.dim, letterSpacing: 0.8 }}>CUE</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: C.text, lineHeight: 16 }}>{c}</Text>
                </View>
              ))}
            </Row>

            <Row gap={6} style={{ paddingHorizontal: 2 }}>
              <Text style={[hdr, { width: 26 }]}>SET</Text>
              <Text style={[hdr, { flex: 1 }]}>LAST</Text>
              <Text style={[hdr, { width: 64, textAlign: 'center' }]}>KG</Text>
              <Text style={[hdr, { width: 52, textAlign: 'center' }]}>{def.unit === 'sec' ? 'SEC' : def.unit === 'min' ? 'MIN' : 'REPS'}</Text>
              <Text style={[hdr, { width: 36, textAlign: 'center' }]}>RIR</Text>
              <View style={{ width: 44 }} />
            </Row>
            {sets.map((st, i) => (
              <SetRow key={st.id} st={st} prev={data.prev[k]?.[i]} placeholderReps={def.repMax}
                onDone={(done) => {
                  if (done) { const len = def.repMax >= 15 ? 60 : 90; setRestLen(len); setRestEnd(Date.now() + len * 1000); }
                }} />
            ))}

            <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.card2 }}>
              <Icon name="up" size={18} color={C.lime} />
              <T.Small style={{ flex: 1, color: C.text2, fontSize: 13 }}>{data.sug[k]?.note}</T.Small>
            </View>

            <Row gap={8}>
              <Btn small kind="ghost" title="+ Add set" style={{ flex: 1 }} onPress={() => repo.addSet(sess.id, k)} />
              <Btn small kind="danger" title={sets.some((s) => s.pain) ? 'Pain flagged' : 'Flag pain / form'} style={{ flex: 1 }}
                onPress={async () => { const v = sets.some((s) => s.pain) ? 0 : 1; for (const s of sets) await repo.updateSet(s.id, { pain: v }); if (v) haptic('warn'); }} />
            </Row>
            {k === 'leg_press' || k === 'squat' ? (
              <Btn small kind="ghost" title={k === 'leg_press' ? 'Swap to squat today' : 'Swap to leg press today'} onPress={() => repo.swapExercise(sess.id, k, k === 'leg_press' ? 'squat' : 'leg_press')} />
            ) : null}
          </Card>
        );
      })}

      <T.Small style={{ color: C.dim }}>If pain is sharp, unusual or worsening, stop the movement and get advice. Flagged lifts never auto-increase.</T.Small>
      <Btn small kind="danger" title="Discard this session" onPress={() => Alert.alert('Discard session?', 'All sets in this session will be deleted.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => repo.discardSession(sess.id) }])} />

      <FinishBar label={`Finish workout · ${doneCount}/${data.sets.length} sets`} onPress={finish} />
    </Screen>
  );
}

const hdr = { fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, color: C.dim } as const;

function FinishBar({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Btn title={label} kind="light" onPress={onPress} />
    </View>
  );
}

function SetRow({ st, prev, placeholderReps, onDone }: { st: repo.ExSet; prev?: repo.ExSet; placeholderReps: number; onDone: (done: boolean) => void }) {
  const [kg, setKg] = useState(st.weight_kg != null ? String(st.weight_kg) : '');
  const [reps, setReps] = useState(st.reps != null ? String(st.reps) : '');
  useEffect(() => { setKg(st.weight_kg != null ? String(st.weight_kg) : ''); }, [st.weight_kg]);
  useEffect(() => { setReps(st.reps != null ? String(st.reps) : ''); }, [st.reps]);
  const done = !!st.done;
  const commitKg = () => { const v = parseFloat(kg.replace(',', '.')); repo.updateSet(st.id, { weight_kg: isNaN(v) ? null : v }); };
  const commitReps = () => { const v = parseInt(reps, 10); repo.updateSet(st.id, { reps: isNaN(v) ? null : v }); };
  return (
    <Row gap={6} style={{ minHeight: 50, paddingHorizontal: 2, borderRadius: 12, backgroundColor: done ? 'rgba(212,255,79,0.07)' : 'transparent' }}>
      <Text style={{ width: 26, fontFamily: F.monoBold, fontSize: 14, color: C.muted, paddingLeft: 6 }}>{st.set_number}</Text>
      <Text style={{ flex: 1, fontFamily: F.body, fontSize: 13, color: C.dim }} numberOfLines={1}>{prev ? `${prev.weight_kg} × ${prev.reps}` : '—'}</Text>
      <TextInput value={kg} onChangeText={setKg} onEndEditing={commitKg} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={C.faint} selectTextOnFocus
        style={inp(64)} />
      <TextInput value={reps} onChangeText={setReps} onEndEditing={commitReps} keyboardType="number-pad" placeholder={String(placeholderReps)} placeholderTextColor={C.faint} selectTextOnFocus
        style={inp(52)} />
      <Pressable onPress={() => repo.updateSet(st.id, { rir: ((st.rir ?? 1) + 1) % 5 })} style={{ width: 36, alignItems: 'center', justifyContent: 'center', height: 40 }} accessibilityLabel="Reps in reserve">
        <Text style={{ fontFamily: F.mono, fontSize: 13, color: st.rir != null ? C.text : C.faint }}>{st.rir ?? '2'}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Mark set ${st.set_number} done`}
        onPress={async () => {
          const v = parseFloat(kg.replace(',', '.'));
          const r = parseInt(reps, 10);
          const next = !done;
          await repo.updateSet(st.id, { done: next ? 1 : 0, weight_kg: isNaN(v) ? st.weight_kg : v, reps: isNaN(r) ? (next ? placeholderReps : st.reps) : r, rir: st.rir ?? 2 });
          haptic(next ? 'success' : 'light');
          onDone(next);
        }}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: done ? C.lime : C.line3, backgroundColor: done ? C.lime : 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.88 : 1 }] })}>
        <Icon name="check" size={18} color={done ? C.bg : C.faint} width={2.6} />
      </Pressable>
    </Row>
  );
}

const inp = (w: number) => ({ width: w, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg, color: C.text, fontFamily: F.monoBold, fontSize: 15, textAlign: 'center' as const, padding: 0 });

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
      <Text style={{ fontFamily: F.monoBold, fontSize: 12, color: active ? C.bg : C.lime }}>{label}</Text>
    </View>
  );
}

function Done({ data }: { data: TD }) {
  const sess = data.sess!;
  const done = data.sets.filter((s) => s.done);
  const vol = done.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0);
  const mins = sess.finished_at ? Math.round((new Date(sess.finished_at).getTime() - new Date(sess.started_at).getTime()) / 60000) : null;
  const byEx: Record<string, repo.ExSet[]> = {};
  for (const s of done) (byEx[s.exercise] ??= []).push(s);
  return (
    <Screen>
      <Enter>
        <View style={{ gap: 6 }}>
          <T.Label>SESSION COMPLETE</T.Label>
          <T.Display>Full Body <Text style={{ color: C.lime }}>{sess.type}</Text> done</T.Display>
        </View>
      </Enter>
      <Row gap={8}>
        <Card style={{ flex: 1, padding: 14, gap: 4 }}><T.Label style={{ fontSize: 10 }}>SETS</T.Label><T.Num style={{ fontSize: 30 }}>{done.length}</T.Num></Card>
        <Card style={{ flex: 1, padding: 14, gap: 4 }}><T.Label style={{ fontSize: 10 }}>VOLUME</T.Label><T.Num style={{ fontSize: 30 }}>{Math.round(vol).toLocaleString('en-US')}</T.Num></Card>
        <Card style={{ flex: 1, padding: 14, gap: 4 }}><T.Label style={{ fontSize: 10 }}>MINUTES</T.Label><T.Num style={{ fontSize: 30 }}>{mins ?? '—'}</T.Num></Card>
      </Row>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        {Object.entries(byEx).map(([k, sets], i) => (
          <Pressable key={k} onPress={() => router.push({ pathname: '/history', params: { exercise: k } })}>
            <Row style={{ minHeight: 58, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: '#21221C' }}>
              <T.Strong style={{ flex: 1 }}>{data.defs[k]?.name ?? k}</T.Strong>
              <T.Mono>{`${sets[0].weight_kg ?? '—'} × ${sets.map((s) => s.reps).join(', ')}`}</T.Mono>
            </Row>
          </Pressable>
        ))}
      </Card>
      <T.Small>Next session: Full Body {sess.type === 'A' ? 'B' : 'A'}. Hit your steps and sleep well — recovery is part of the plan.</T.Small>
      <Btn title="Back to Today" kind="ghost" onPress={() => router.push('/')} />
    </Screen>
  );
}
