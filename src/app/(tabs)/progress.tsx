import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Bar, Btn, Card, Enter, Pill, Row, Screen, Segmented, T } from '../../components/ui';
import { Bars, TrendChart } from '../../components/charts';
import { useQuery } from '../../lib/hooks';
import { loadSummary, strengthTrend } from '../../lib/summary';
import { measurements } from '../../lib/repo';
import { avgSeries, exName } from '../../lib/logic';
import { dayMonth, today } from '../../lib/dates';
import { MILESTONES } from '../../lib/plan';
import { C, F } from '../../lib/theme';

export default function Progress() {
  const { width } = useWindowDimensions();
  const [seg, setSeg] = useState<'w' | 'c' | 's'>('w');
  const date = today();
  const { data } = useQuery(async () => ({ s: await loadSummary(date), m: await measurements(), str: await strengthTrend(date) }), [date]);
  if (!data?.s) return <Screen><View /></Screen>;
  const { s, m, str } = data;
  const series = avgSeries(s.weights);
  const chartW = width - 40 - 38;
  const waists = m.filter((x) => x.waist_cm != null);
  const waistDelta = waists.length > 1 ? (waists[waists.length - 1].waist_cm! - waists[0].waist_cm!) : null;
  const first = s.weights[0];

  return (
    <Screen>
      <Enter>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 6 }}>
            <T.Label>{`${s.day} DAYS · WEEK ${s.week} OF 12`}</T.Label>
            <T.Display>Progress</T.Display>
          </View>
          <Btn small kind="ghost" title="Weekly review" onPress={() => router.push('/review')} />
        </Row>
      </Enter>

      <Segmented options={[{ key: 'w', label: 'Weight' }, { key: 'c', label: 'Waist' }, { key: 's', label: 'Strength' }]} value={seg} onChange={setSeg} />

      {seg === 'w' ? (
        <Enter key="w">
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Row gap={6} style={{ alignItems: 'baseline' }}>
                <Text style={{ fontFamily: F.displayBold, fontSize: 56, lineHeight: 56, color: C.text }}>{s.avg != null ? `${s.lostKg >= 0 ? '−' : '+'}${Math.abs(s.lostKg).toFixed(1)}` : '—'}</Text>
                <T.Small style={{ fontSize: 14 }}>kg (avg)</T.Small>
              </Row>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Row gap={6}><View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: C.lime }} /><T.Small style={{ fontSize: 11 }}>7-day avg</T.Small></Row>
                <Row gap={6}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6A6B60' }} /><T.Small style={{ fontSize: 11 }}>Daily</T.Small></Row>
              </View>
            </Row>
            <TrendChart daily={s.weights.map((w) => w.weight_kg)} avg={series.map((x) => x.avg)} width={chartW} height={210} showGrid
              band={first ? { startKg: first.weight_kg, slowPerDay: 0.4 / 7, fastPerDay: 0.8 / 7 } : undefined} animKey={seg} />
            {first ? <Row style={{ justifyContent: 'space-between', paddingLeft: 30 }}><T.Label style={{ fontSize: 10 }}>{dayMonth(first.date).toUpperCase()}</T.Label><T.Label style={{ fontSize: 10 }}>TODAY</T.Label></Row> : null}
            <T.Small>Shaded band = expected pace, 0.4–0.8 kg/week. Daily dots bounce with water, salt and carbs. Judge the line, not the dots.</T.Small>
          </Card>
        </Enter>
      ) : null}

      {seg === 'c' ? (
        <Enter key="c">
          <Card style={{ gap: 14 }}>
            <Row gap={6} style={{ alignItems: 'baseline' }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 56, lineHeight: 56, color: C.text }}>{waistDelta != null ? `${waistDelta <= 0 ? '−' : '+'}${Math.abs(waistDelta).toFixed(1)}` : waists.length ? waists[0].waist_cm!.toFixed(1) : '—'}</Text>
              <T.Small style={{ fontSize: 14 }}>{waistDelta != null ? 'cm at the navel' : 'cm · first measurement'}</T.Small>
            </Row>
            {waists.length ? (
              <Bars values={waists.slice(-8).map((x) => x.waist_cm)} labels={waists.slice(-8).map((x) => dayMonth(x.date).split(' ')[0])} width={chartW} height={170}
                format={(v) => v.toFixed(1)} max={Math.max(...waists.map((x) => x.waist_cm!)) * 1.04} />
            ) : <T.Small>No waist measurements yet. Measure once a week at the navel, same conditions as the weigh-in.</T.Small>}
            <Btn small kind="ghost" title="Measurements & photos" onPress={() => router.push('/body')} />
          </Card>
        </Enter>
      ) : null}

      {seg === 's' ? (
        <Enter key="s">
          <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            {str.rows.length ? str.rows.map((r, i) => (
              <Pressable key={r.exercise} onPress={() => router.push({ pathname: '/history', params: { exercise: r.exercise } })}>
                <Row style={{ minHeight: 60, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: '#21221C' }} gap={12}>
                  <T.Strong style={{ flex: 1 }}>{exName(r.exercise)}</T.Strong>
                  <T.Mono style={{ color: C.muted }}>{r.from} → <Text style={{ color: C.text }}>{r.to}</Text></T.Mono>
                  <Text style={{ width: 58, textAlign: 'right', fontFamily: F.monoBold, fontSize: 13, color: r.to > r.from ? C.lime : C.dim }}>{r.to > r.from ? `+${+(r.to - r.from).toFixed(2)}` : '±0'}</Text>
                </Row>
              </Pressable>
            )) : <T.Small style={{ padding: 18 }}>Strength trends appear after your first logged sessions.</T.Small>}
          </Card>
        </Enter>
      ) : null}

      <View style={{ gap: 4, marginTop: 4 }}>
        <T.Label style={{ marginBottom: 6 }}>MILESTONES</T.Label>
        {MILESTONES.map((ms, i) => {
          const reached = s.avg != null && s.avg <= ms.kg + 0.05;
          const current = s.milestone?.kg === ms.kg;
          return (
            <Row key={ms.name} gap={14} style={{ alignItems: 'stretch' }}>
              <View style={{ width: 22, alignItems: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: reached || current || i === 0 ? C.lime : C.line3, backgroundColor: reached || i === 0 ? C.lime : C.bg }} />
                {i < MILESTONES.length - 1 ? <View style={{ flex: 1, width: 2, minHeight: 30, backgroundColor: reached || i === 0 ? C.lime : C.line2 }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6, paddingBottom: 18 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T.Strong>{ms.name}</T.Strong>
                  <Text style={{ fontFamily: F.displayBold, fontSize: 22, color: current ? C.lime : i === 0 ? C.dim : C.text }}>{i === 0 ? s.profile.start_weight_kg : ms.kg === 85 ? '84–85' : ms.kg}</Text>
                </Row>
                <T.Small>{current && s.milestone ? `${Math.max(0, s.milestone.from - (s.avg ?? s.milestone.from)).toFixed(1)} of ${(s.milestone.from - ms.kg).toFixed(0)} kg · ${ms.what}` : ms.what}</T.Small>
                {current && s.milestone ? <Bar pct={s.milestone.pct} height={6} /> : null}
                {reached && i > 0 ? <Pill tone="lime" text="REACHED" /> : null}
              </View>
            </Row>
          );
        })}
      </View>
    </Screen>
  );
}
