import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Btn, Card, haptic, Header, Pill, Row, Screen, Segmented, Stat, T } from '../components/ui';
import { Bars, LineChart } from '../components/charts';
import { ExerciseAnim } from '../components/ExerciseAnim';
import { useQuery } from '../lib/hooks';
import { exerciseHistory, getWorkouts, saveWorkouts } from '../lib/repo';
import { EXERCISES, WorkoutType } from '../lib/plan';
import { dayMonth } from '../lib/dates';
import { e1rm, scheme } from '../lib/logic';
import { C, F } from '../lib/theme';

export default function ExerciseDetail() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const key = exercise ?? 'leg_press';
  const def = EXERCISES[key];
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'w' | 'v' | 'e'>('w');
  const { data } = useQuery(async () => ({ rows: await exerciseHistory(key), plan: await getWorkouts() }), [key]);
  if (!def) return <Screen><Header title="Unknown" /></Screen>;
  const rows = data?.rows ?? [];
  const plan = data?.plan;
  const bySession: { sid: number; date: string; type: string; sets: typeof rows }[] = [];
  for (const r of rows) {
    let g = bySession.find((x) => x.sid === r.session_id);
    if (!g) { g = { sid: r.session_id, date: r.date, type: r.type, sets: [] }; bySession.push(g); }
    g.sets.push(r);
  }
  const weighted = def.unit === 'reps' && def.equip !== 'Bodyweight';
  const top = bySession.map((g) => Math.max(...g.sets.map((s) => (weighted ? s.weight_kg ?? 0 : s.reps ?? 0))));
  const vol = bySession.map((g) => g.sets.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0));
  const est = bySession.map((g) => Math.max(...g.sets.map((s) => e1rm(s.weight_kg ?? 0, s.reps ?? 0))));
  const series = mode === 'w' ? top : mode === 'v' ? vol : est;
  const w = width - 40 - 38;

  const inPlan = (t: WorkoutType) => !!plan?.[t].some((i) => i.key === key);
  const toggle = async (t: WorkoutType) => {
    if (!plan) return;
    const next = { ...plan, [t]: inPlan(t) ? plan[t].filter((i) => i.key !== key) : [...plan[t], { key, sets: def.sets, repMin: def.repMin, repMax: def.repMax }] };
    await saveWorkouts(next);
    haptic('success');
  };

  return (
    <Screen bottomPad={40}>
      <Header title={def.name} kicker={`${def.group.toUpperCase()} · ${def.equip.toUpperCase()}`} />

      <ExerciseAnim spec={def.anim} width={width - 40} />

      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Label>POSTURE CUES</T.Label>
          <Pill text={scheme(def)} />
        </Row>
        {def.cues.map((c, i) => (
          <Row key={c} gap={10} style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.lime, width: 18 }}>{String(i + 1).padStart(2, '0')}</Text>
            <T.Body style={{ flex: 1, fontSize: 14 }}>{c}</T.Body>
          </Row>
        ))}
        {def.unit === 'reps' && def.increment > 0 ? <T.Small>{`When every set reaches the top of the range with good form, add ${def.increment} kg.`}</T.Small> : null}
      </Card>

      <T.Label>IN YOUR PLAN</T.Label>
      <Row gap={8}>
        {(['A', 'B'] as WorkoutType[]).map((t) => (
          <Btn key={t} small kind={inPlan(t) ? 'primary' : 'ghost'} icon={inPlan(t) ? 'check' : 'plus'} title={inPlan(t) ? `In Full Body ${t}` : `Add to Full Body ${t}`} style={{ flex: 1 }} onPress={() => toggle(t)} />
        ))}
      </Row>

      {bySession.length ? (
        <>
          <Row gap={8}>
            <Stat label={weighted ? 'TOP SET' : 'BEST'} value={`${top[top.length - 1]}${weighted ? ' kg' : ''}`} />
            <Stat label="SINCE START" value={top.length > 1 ? `${top[top.length - 1] - top[0] >= 0 ? '+' : ''}${+(top[top.length - 1] - top[0]).toFixed(2)}` : '—'} />
            <Stat label="SESSIONS" value={String(bySession.length)} />
          </Row>
          <Card style={{ gap: 12 }}>
            {weighted ? <Segmented options={[{ key: 'w', label: 'Weight' }, { key: 'v', label: 'Volume' }, { key: 'e', label: 'Est. 1RM' }]} value={mode} onChange={setMode} /> : null}
            {mode === 'v' && weighted
              ? <Bars values={series} labels={bySession.map((g) => dayMonth(g.date).split(' ')[0])} width={w} height={170} highlightLast={false} format={(v) => `${Math.round(v / 100) / 10}k`} />
              : <LineChart values={series} width={w} height={170} />}
            <Row style={{ justifyContent: 'space-between' }}>
              <T.Label style={{ fontSize: 10 }}>{dayMonth(bySession[0].date).toUpperCase()}</T.Label>
              <T.Label style={{ fontSize: 10 }}>{dayMonth(bySession[bySession.length - 1].date).toUpperCase()}</T.Label>
            </Row>
          </Card>
          <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            {[...bySession].reverse().slice(0, 12).map((g, i) => {
              const full = g.sets.length >= def.sets && g.sets.every((s) => (s.reps ?? 0) >= def.repMax);
              const pain = g.sets.some((s) => s.pain);
              return (
                <Row key={g.sid} gap={12} style={{ minHeight: 58, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: '#21221C' }}>
                  <View style={{ width: 70 }}>
                    <T.Strong style={{ fontSize: 13 }}>{dayMonth(g.date)}</T.Strong>
                    <T.Small style={{ fontSize: 11, color: C.dim }}>Full Body {g.type}</T.Small>
                  </View>
                  <T.Mono style={{ flex: 1 }}>{`${weighted ? `${g.sets[0].weight_kg} × ` : ''}${g.sets.map((s) => s.reps).join(', ')}`}</T.Mono>
                  <Text style={{ fontFamily: F.mono, fontSize: 12, color: pain ? C.orange : full ? C.lime : C.dim }}>{pain ? 'PAIN' : full ? '↑ NEXT' : 'HOLD'}</Text>
                </Row>
              );
            })}
          </Card>
        </>
      ) : <T.Small style={{ color: C.dim }}>No sessions logged for this exercise yet. Charts appear after your first one.</T.Small>}
    </Screen>
  );
}
