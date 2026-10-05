import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, Header, Row, Screen, Segmented, Stat, T } from '../components/ui';
import { Bars, LineChart } from '../components/charts';
import { ExerciseAnim } from '../components/ExerciseAnim';
import { useQuery } from '../lib/hooks';
import { exerciseHistory } from '../lib/repo';
import { EXERCISES } from '../lib/plan';
import { dayMonth } from '../lib/dates';
import { e1rm } from '../lib/logic';
import { C, F } from '../lib/theme';

export default function History() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const key = exercise ?? 'leg_press';
  const def = EXERCISES[key];
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'w' | 'v' | 'e'>('w');
  const { data } = useQuery(() => exerciseHistory(key), [key]);
  if (!def) return <Screen><Header title="Unknown" /></Screen>;
  const rows = data ?? [];
  const bySession: { sid: number; date: string; type: string; sets: typeof rows }[] = [];
  for (const r of rows) {
    let g = bySession.find((x) => x.sid === r.session_id);
    if (!g) { g = { sid: r.session_id, date: r.date, type: r.type, sets: [] }; bySession.push(g); }
    g.sets.push(r);
  }
  const top = bySession.map((g) => Math.max(...g.sets.map((s) => s.weight_kg ?? 0)));
  const vol = bySession.map((g) => g.sets.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0));
  const est = bySession.map((g) => Math.max(...g.sets.map((s) => e1rm(s.weight_kg ?? 0, s.reps ?? 0))));
  const series = mode === 'w' ? top : mode === 'v' ? vol : est;
  const w = width - 40 - 38;

  return (
    <Screen bottomPad={40}>
      <Header title={def.name} kicker="EXERCISE HISTORY" />
      <Row gap={8}>
        <Stat label="TOP SET" value={top.length ? `${top[top.length - 1]} kg` : '—'} />
        <Stat label="SINCE START" value={top.length > 1 ? `${top[top.length - 1] - top[0] >= 0 ? '+' : ''}${+(top[top.length - 1] - top[0]).toFixed(2)}` : '—'} subColor={C.lime} />
        <Stat label="SESSIONS" value={String(bySession.length)} />
      </Row>

      <Card style={{ gap: 12 }}>
        <Segmented options={[{ key: 'w', label: 'Weight' }, { key: 'v', label: 'Volume' }, { key: 'e', label: 'Est. 1RM' }]} value={mode} onChange={setMode} />
        {series.length ? (
          mode === 'v'
            ? <Bars values={series} labels={bySession.map((g) => dayMonth(g.date).split(' ')[0])} width={w} height={170} highlightLast={false} format={(v) => `${Math.round(v / 100) / 10}k`} />
            : <LineChart values={series} width={w} height={170} />
        ) : <T.Small>Log this lift in a session to see its chart.</T.Small>}
        {series.length ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T.Label style={{ fontSize: 10 }}>{dayMonth(bySession[0].date).toUpperCase()}</T.Label>
            <T.Label style={{ fontSize: 10 }}>{dayMonth(bySession[bySession.length - 1].date).toUpperCase()}</T.Label>
          </Row>
        ) : null}
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
              <T.Mono style={{ flex: 1 }}>{`${g.sets[0].weight_kg} × ${g.sets.map((s) => s.reps).join(', ')}`}</T.Mono>
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: pain ? C.orange : full ? C.lime : C.dim }}>{pain ? 'PAIN' : full ? '↑ NEXT' : 'HOLD'}</Text>
            </Row>
          );
        })}
        {!bySession.length ? <T.Small style={{ padding: 16 }}>No completed sets yet.</T.Small> : null}
      </Card>

      <T.Label>FORM GUIDE</T.Label>
      <ExerciseAnim kind={def.anim} width={width - 40} />
      <Card style={{ gap: 6 }}>
        {def.cues.map((c) => <T.Small key={c} style={{ color: C.text2, fontSize: 13 }}>• {c}</T.Small>)}
        <T.Small>{`${def.sets} sets × ${def.repMin}–${def.repMax} reps. When every set reaches ${def.repMax} with good form, add ${def.increment} kg.`}</T.Small>
      </Card>
    </Screen>
  );
}
