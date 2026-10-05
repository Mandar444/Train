import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Field, Header, Icon, Row, Screen, Sheet, T } from '../components/ui';
import { Bars, Ring } from '../components/charts';
import { useQuery } from '../lib/hooks';
import * as repo from '../lib/repo';
import { addDays, dowShort, today } from '../lib/dates';
import { fmt, weekNumber } from '../lib/logic';
import { stepTarget, stepTargetLabel } from '../lib/plan';
import { syncHealth } from '../lib/health';
import { emitChange } from '../lib/db';
import { C, F } from '../lib/theme';

export default function Steps() {
  const { width } = useWindowDimensions();
  const date = today();
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState('');
  const [sleepVal, setSleepVal] = useState('');
  const [syncing, setSyncing] = useState(false);
  const { data } = useQuery(async () => {
    const p = await repo.getProfile();
    const days = await repo.getDays(addDays(date, -6), date);
    const all = p ? await repo.getDays(p.start_date, date) : [];
    const connected = await repo.getKV('health_connected', false);
    const last = await repo.getKV<string | null>('health_last_sync', null);
    return { p, days, all, connected, last };
  }, [date]);
  if (!data?.p) return <Screen><View /></Screen>;
  const p = data.p;
  const week = weekNumber(p, date);
  const target = stepTarget(week);
  const t = data.days.find((d) => d.date === date);
  const steps = t?.steps ?? 0;
  const vals = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6)).map((d) => ({ d, v: data.days.find((x) => x.date === d)?.steps ?? null }));
  const have = vals.filter((x) => x.v != null) as { d: string; v: number }[];
  const avg = have.length ? have.reduce((s, x) => s + x.v, 0) / have.length : null;
  const weeks = Math.min(week, 12);
  const ramp = Array.from({ length: Math.min(4, weeks + 1) }, (_, i) => i + 1).map((w) => {
    const from = addDays(p.start_date, (w - 1) * 7);
    const to = addDays(from, 6);
    const ds = data.all.filter((d) => d.date >= from && d.date <= to && d.steps != null);
    const a = ds.length ? ds.reduce((s, d) => s + (d.steps ?? 0), 0) / ds.length : null;
    return { w, target: stepTargetLabel(w), a, hit: a != null && a >= stepTarget(w), live: w === week };
  });
  const sleep = t?.sleep_hours ?? null;
  const minutesToGo = Math.ceil(Math.max(0, target - steps) / 110);

  return (
    <Screen bottomPad={40}>
      <Header title="Steps" right={
        <Pressable onPress={() => router.push('/health')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: data.connected ? C.lime : C.faint }} />
          <T.Small>{data.connected ? 'Health Connect' : 'Manual · connect'}</T.Small>
        </Pressable>
      } />

      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Ring size={250} stroke={18} pct={steps / target}>
          <T.Label>TODAY</T.Label>
          <Text style={{ fontFamily: F.display, fontSize: 72, lineHeight: 74, color: C.text }}>{fmt(steps)}</Text>
          <T.Small style={{ fontSize: 14 }}>of {fmt(target)}</T.Small>
        </Ring>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <Icon name="clock" color={C.lime} />
        <T.Body style={{ flex: 1, fontSize: 14 }}>{steps >= target ? 'Target hit. Anything extra is a bonus.' : `${fmt(target - steps)} to go. About ${minutesToGo} minutes of walking closes the gap.`}</T.Body>
      </Card>

      <Row gap={8}>
        {data.connected ? <Btn small kind="ghost" icon="sync" title={syncing ? 'Syncing…' : 'Sync now'} style={{ flex: 1 }} onPress={async () => { setSyncing(true); await syncHealth(14); setSyncing(false); }} /> : null}
        <Btn small kind={data.connected ? 'ghost' : 'primary'} title={data.connected ? 'Override today' : 'Enter steps'} style={{ flex: 1 }} onPress={() => { setVal(steps ? String(steps) : ''); setSleepVal(sleep != null ? String(sleep) : ''); setEdit(true); }} />
      </Row>

      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Label>LAST 7 DAYS</T.Label>
          <T.Small>avg <Text style={{ color: C.text, fontFamily: F.bold }}>{avg != null ? fmt(avg) : '—'}</Text></T.Small>
        </Row>
        <Bars values={vals.map((x) => x.v)} labels={vals.map((x) => (x.d === date ? 'Today' : dowShort(x.d).slice(0, 1) + dowShort(x.d).slice(1).toLowerCase()))} target={target} width={width - 40 - 38} height={170} format={(v) => `${(v / 1000).toFixed(1)}k`} />
      </Card>

      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <T.Label style={{ padding: 16, paddingBottom: 8 }}>STEP RAMP · WEEKLY AVERAGE</T.Label>
        {ramp.map((r) => (
          <Row key={r.w} gap={12} style={{ minHeight: 46, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#21221C' }}>
            <T.Small style={{ width: 56 }}>{`Week ${r.w}${r.w === 4 ? '+' : ''}`}</T.Small>
            <T.Body style={{ flex: 1, fontSize: 14 }}>{r.target}</T.Body>
            <Text style={{ fontFamily: F.mono, fontSize: 13, color: r.hit ? C.lime : r.live ? C.text : C.faint }}>{r.a != null ? `${fmt(r.a)}${r.hit ? ' ✓' : r.live ? ' · live' : ''}` : '—'}</Text>
          </Row>
        ))}
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="moon" color={C.muted} />
        <View style={{ flex: 1 }}>
          <T.Strong>Sleep last night</T.Strong>
          <T.Small>{sleep != null ? `${sleep} h · ${t?.sleep_source === 'health' ? 'from Health Connect' : 'entered by you'}` : 'Not recorded. Target 7–9 h.'}</T.Small>
        </View>
        <Text style={{ fontFamily: F.displayBold, fontSize: 28, color: sleep != null && sleep >= 7 ? C.lime : C.text }}>{sleep ?? '—'}</Text>
      </Card>

      <T.Small style={{ color: C.dim }}>Weekly average matters more than any single day. If you leave the phone behind, those steps won't count — keep the habit consistent.</T.Small>

      <Sheet visible={edit} onClose={() => setEdit(false)} title="Today">
        <Field label="STEPS" keyboardType="number-pad" value={val} onChangeText={setVal} placeholder="e.g. 8400" />
        <Field label="SLEEP LAST NIGHT (HOURS)" keyboardType="decimal-pad" value={sleepVal} onChangeText={setSleepVal} placeholder="e.g. 7.5" />
        {data.connected ? <T.Small>A manual number stops Health Connect from overwriting today.</T.Small> : null}
        <Btn title="Save" onPress={async () => {
          const n = parseInt(val, 10);
          if (!isNaN(n)) await repo.setSteps(date, n, 'manual');
          const sl = parseFloat(sleepVal.replace(',', '.'));
          if (!isNaN(sl)) await repo.setSleep(date, sl, 'manual');
          emitChange();
          setEdit(false);
        }} />
      </Sheet>
    </Screen>
  );
}
