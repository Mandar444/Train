import { useState } from 'react';
import { Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Field, haptic, Icon, Row, Screen, Sheet, T } from '../../components/ui';
import { Bars, Ring } from '../../components/charts';
import { useQuery } from '../../lib/hooks';
import * as repo from '../../lib/repo';
import { addDays, dowShort, today } from '../../lib/dates';
import { fmt, weekNumber } from '../../lib/logic';
import { stepTarget, stepTargetLabel } from '../../lib/plan';
import { syncHealth } from '../../lib/health';
import { emitChange } from '../../lib/db';
import { C, F } from '../../lib/theme';

export default function Steps() {
  const { width } = useWindowDimensions();
  const date = today();
  const [sheet, setSheet] = useState<null | 'steps' | 'sleep'>(null);
  const [val, setVal] = useState('');
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
  const sleep = t?.sleep_hours ?? null;
  const left = Math.max(0, target - steps);
  const mins = Math.ceil(left / 110);

  const sync = async () => { setSyncing(true); await syncHealth(14); setSyncing(false); };
  const addSteps = async (n: number) => { haptic('success'); await repo.setSteps(date, steps + n, 'manual'); emitChange(); };

  return (
    <Screen refresh={<RefreshControl refreshing={syncing} onRefresh={sync} tintColor={C.lime} colors={[C.lime]} progressBackgroundColor={C.card} />}>
      <View style={{ gap: 4, paddingTop: 8 }}>
        <T.Display>Steps</T.Display>
        <T.Small>{`Week ${week} goal: ${stepTargetLabel(week)} a day`}</T.Small>
      </View>

      {!data.connected ? (
        <Card tone="green" onPress={() => router.push('/health')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sync" color={C.bg} size={22} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T.Strong>Count steps automatically</T.Strong>
            <T.Small style={{ color: C.text2 }}>Connect Health Connect once — steps fill in by themselves.</T.Small>
          </View>
          <Icon name="chevron" color={C.lime} />
        </Card>
      ) : null}

      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Ring size={Math.min(260, width - 80)} stroke={20} pct={steps / target}>
          <Text style={{ fontFamily: F.display, fontSize: 56, color: C.text, letterSpacing: -1 }}>{fmt(steps)}</Text>
          <T.Small style={{ fontSize: 16 }}>of {fmt(target)} steps</T.Small>
        </Ring>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <Icon name={left ? 'clock' : 'check'} color={C.lime} />
        <T.Body style={{ flex: 1 }}>{left ? `${fmt(left)} to go — about ${mins} min of walking.` : 'Goal done for today. Nice.'}</T.Body>
      </Card>

      <Row gap={8}>
        <Btn title="Add steps" icon="plus" style={{ flex: 1 }} onPress={() => { setVal(''); setSheet('steps'); }} />
        {data.connected ? <Btn title={syncing ? 'Syncing…' : 'Sync now'} kind="ghost" icon="sync" style={{ flex: 1 }} onPress={sync} /> : null}
      </Row>
      {data.connected ? (
        <Pressable onPress={() => router.push('/health')}>
          <T.Small style={{ textAlign: 'center' }}>
            <Text style={{ color: C.lime }}>● </Text>Synced from Health Connect{data.last ? ` · ${new Date(data.last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''} · pull down to refresh
          </T.Small>
        </Pressable>
      ) : null}

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Strong>Last 7 days</T.Strong>
          <T.Small>Average <Text style={{ color: C.text, fontFamily: F.bold }}>{avg != null ? fmt(avg) : '—'}</Text></T.Small>
        </Row>
        <Bars values={vals.map((x) => x.v)} labels={vals.map((x) => (x.d === date ? 'Today' : dowShort(x.d).slice(0, 1) + dowShort(x.d).slice(1).toLowerCase()))} target={target} width={width - 40 - 38} height={180} format={(v) => `${(v / 1000).toFixed(1)}k`} />
        <T.Small>Dashed line = your daily goal. The weekly average matters more than any single day.</T.Small>
      </Card>

      <Card onPress={() => { setVal(sleep != null ? String(sleep) : ''); setSheet('sleep'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="moon" color={C.muted} />
        <View style={{ flex: 1, gap: 2 }}>
          <T.Strong>Sleep last night</T.Strong>
          <T.Small>{sleep != null ? (t?.sleep_source === 'health' ? 'From Health Connect' : 'Tap to edit') : 'Tap to add · goal 7–9 h'}</T.Small>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 26, color: sleep != null && sleep >= 7 ? C.lime : C.text }}>{sleep != null ? `${sleep} h` : '—'}</Text>
      </Card>

      <Sheet visible={sheet === 'steps'} onClose={() => setSheet(null)} title="Add steps">
        <T.Small>Quick add to today ({fmt(steps)} now)</T.Small>
        <Row gap={8}>
          {[500, 1000, 2000, 5000].map((n) => <Btn key={n} small kind="ghost" title={`+${fmt(n)}`} style={{ flex: 1 }} onPress={async () => { await addSteps(n); setSheet(null); }} />)}
        </Row>
        <Field label="Or set today's total" keyboardType="number-pad" value={val} onChangeText={setVal} placeholder="e.g. 8400" />
        <Btn title="Save total" disabled={!val} onPress={async () => { const n = parseInt(val, 10); if (!isNaN(n)) { await repo.setSteps(date, n, 'manual'); emitChange(); } setSheet(null); }} />
        {data.connected ? <T.Small>A number you enter stops Health Connect from changing today's steps.</T.Small> : null}
      </Sheet>
      <Sheet visible={sheet === 'sleep'} onClose={() => setSheet(null)} title="Sleep">
        <Field label="Hours slept last night" keyboardType="decimal-pad" value={val} onChangeText={setVal} placeholder="e.g. 7.5" />
        <Btn title="Save" disabled={!val} onPress={async () => { const v = parseFloat(val.replace(',', '.')); if (!isNaN(v)) { await repo.setSleep(date, v, 'manual'); emitChange(); } setSheet(null); }} />
      </Sheet>
    </Screen>
  );
}
