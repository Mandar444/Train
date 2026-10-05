import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Bar, Btn, Card, Enter, Icon, IconName, Pill, Row, Screen, T } from '../../components/ui';
import { TrendChart } from '../../components/charts';
import { useProgress, useQuery } from '../../lib/hooks';
import { loadSummary } from '../../lib/summary';
import { avgSeries, fmt } from '../../lib/logic';
import { greeting, headerDate, today } from '../../lib/dates';
import { C, F } from '../../lib/theme';
import { DAY1_CHECKLIST, EXERCISES } from '../../lib/plan';
import { syncHealth } from '../../lib/health';
import { refreshStepNudge } from '../../lib/notify';
import { getKV, getWorkouts, setKV } from '../../lib/repo';

export default function Today() {
  const date = today();
  const { data: s } = useQuery(() => loadSummary(date), [date]);
  const { data: checklist } = useQuery(() => getKV<Record<string, boolean>>('day1_checklist', {}), []);
  const { data: plan } = useQuery(getWorkouts, []);
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const p = useProgress(1200, s ? 1 : 0);

  useEffect(() => {
    if (s) refreshStepNudge(s.steps, s.stepTarget);
  }, [s?.steps, s?.stepTarget]);

  if (s === null) return <Redirect href="/onboarding" />;
  if (!s) return <Screen><View /></Screen>;

  const avg = s.avg ?? s.profile.start_weight_kg;
  const shownAvg = s.avg != null ? (s.profile.start_weight_kg - (s.profile.start_weight_kg - avg) * p).toFixed(1) : '—';
  const recent = s.weights.slice(-21);
  const series = avgSeries(s.weights).slice(-21);
  const chartW = width - 40 - 38;
  const proteinTarget = s.profile.protein_min;
  const kcalLeft = s.profile.kcal_target - s.kcal;
  const showDay1 = s.day <= 2 && DAY1_CHECKLIST.some((c) => !checklist?.[c.key]);
  const session = s.openSession ?? s.todaySession;
  const workoutType = session?.type ?? s.nextWorkout;

  const tiles: { label: string; value: string; unit: string; pct: number; color: string; sub: string; icon: IconName; to: string }[] = [
    { label: 'STEPS', value: fmt(s.steps * p), unit: `/ ${fmt(s.stepTarget / 1000, s.stepTarget % 1000 ? 1 : 0)}k`, pct: s.steps / s.stepTarget, color: C.lime, sub: s.steps >= s.stepTarget ? 'Target hit' : `${fmt(s.stepTarget - s.steps)} to go${s.stepsSource === 'health' ? ' · synced' : ''}`, icon: 'steps', to: '/steps' },
    { label: 'CALORIES', value: fmt(s.kcal * p), unit: `/ ${fmt(s.profile.kcal_target)}`, pct: s.kcal / s.profile.kcal_target, color: C.text, sub: kcalLeft >= 0 ? `${fmt(kcalLeft)} kcal left` : `${fmt(-kcalLeft)} over`, icon: 'flame', to: '/food' },
    { label: 'PROTEIN', value: fmt(s.protein * p), unit: `g / ${proteinTarget}+`, pct: s.protein / proteinTarget, color: C.orange, sub: s.protein >= proteinTarget ? 'Target hit' : s.special === 'chicken' ? 'Chicken tonight closes it' : s.special === 'eggs' ? 'Eggs tonight help' : 'Dal, curd, milk, chana', icon: 'protein', to: '/food' },
    { label: 'SLEEP', value: s.sleep != null ? (s.sleep * p).toFixed(1) : '—', unit: 'h', pct: (s.sleep ?? 0) / 8, color: C.text, sub: 'Target 7–9 h', icon: 'moon', to: '/steps' },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await syncHealth(7);
    setRefreshing(false);
  };

  return (
    <Screen refresh={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lime} colors={[C.lime]} progressBackgroundColor={C.card} />}>
      <Enter>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 }}>
          <View style={{ gap: 6 }}>
            <T.Label>{`${headerDate(date)} · WEEK ${s.week} · DAY ${s.day}`}</T.Label>
            <Text style={{ fontFamily: F.display, fontSize: 46, lineHeight: 46, color: C.text, textTransform: 'uppercase' }}>
              {greeting()},{'\n'}<Text style={{ color: C.lime }}>{s.profile.name}</Text>
            </Text>
          </View>
          <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C1D18', borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.text, fontFamily: F.semibold }}>{s.profile.name.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </Row>
      </Enter>

      <Enter delay={80}>
        <Pressable onPress={() => router.push('/review')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: s.status.color, opacity: pressed ? 0.9 : 1 })}>
          <PulseDot color={s.status.ink} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.1, color: s.status.ink }}>{s.status.tag}</Text>
            <Text style={{ fontFamily: F.semibold, fontSize: 15, color: s.status.ink }}>{s.status.line}</Text>
          </View>
          <Icon name="chevron" color={s.status.ink} />
        </Pressable>
      </Enter>

      <Enter delay={140}>
        <Row gap={8}>
          <QuickAction label={s.todayWeight != null ? `${s.todayWeight.toFixed(1)} kg` : 'Weigh-in'} done={s.todayWeight != null} onPress={() => router.push('/weight')} />
          <QuickAction label="Food" onPress={() => router.push('/food')} />
          <QuickAction label="Waist" onPress={() => router.push('/body')} />
        </Row>
      </Enter>

      {showDay1 ? (
        <Enter delay={170}>
          <Card style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T.Label>DAY 1 CHECKLIST</T.Label>
              <T.Small>Not perfect — just a baseline</T.Small>
            </Row>
            {DAY1_CHECKLIST.map((c) => {
              const on = !!checklist?.[c.key];
              return (
                <Pressable key={c.key} onPress={() => setKV('day1_checklist', { ...(checklist ?? {}), [c.key]: !on })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: on ? C.lime : C.line3, backgroundColor: on ? C.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={16} color={C.bg} width={3} /> : null}
                  </View>
                  <T.Body style={{ color: on ? C.dim : C.text, textDecorationLine: on ? 'line-through' : 'none', flex: 1 }}>{c.label}</T.Body>
                </Pressable>
              );
            })}
          </Card>
        </Enter>
      ) : null}

      <Enter delay={200}>
        <Card onPress={() => router.push('/progress')} style={{ gap: 14, padding: 20, borderRadius: 26 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 4 }}>
              <T.Label>{s.avgN >= 7 ? '7-DAY AVERAGE' : s.avgN > 0 ? `AVERAGE · ${s.avgN} WEIGH-IN${s.avgN > 1 ? 'S' : ''}` : 'NO WEIGH-INS YET'}</T.Label>
              <Row gap={6} style={{ alignItems: 'baseline' }}>
                <Text style={{ fontFamily: F.display, fontSize: 96, lineHeight: 92, color: C.text, fontVariant: ['tabular-nums'] }}>{shownAvg}</Text>
                <T.Body style={{ color: C.muted }}>kg</T.Body>
              </Row>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              {s.change != null ? <Pill tone={s.change <= 0 ? 'lime' : 'orange'} text={`${s.change <= 0 ? '−' : '+'}${Math.abs(s.change).toFixed(1)} kg / wk`} /> : <Pill text="building baseline" />}
              <T.Small style={{ textAlign: 'right' }}>
                Today <Text style={{ color: C.text, fontFamily: F.semibold }}>{s.todayWeight?.toFixed(1) ?? '—'}</Text>{'\n'}
                Start <Text style={{ color: C.text, fontFamily: F.semibold }}>{s.profile.start_weight_kg.toFixed(1)}</Text>
              </T.Small>
            </View>
          </Row>
          <TrendChart daily={recent.map((w) => w.weight_kg)} avg={series.map((w) => w.avg)} width={chartW} target={s.milestone?.kg} animKey={s.weights.length} />
          {s.milestone ? (
            <View style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T.Small>{s.milestone.name} · <Text style={{ color: C.text }}>{s.milestone.from} → {s.milestone.kg} kg</Text></T.Small>
                <T.Small><Text style={{ color: C.text, fontFamily: F.semibold }}>{Math.max(0, s.lostKg).toFixed(1)} kg</Text> lost · {Math.round(s.milestone.pct * 100)}%</T.Small>
              </Row>
              <Bar pct={s.milestone.pct} delay={400} />
            </View>
          ) : null}
        </Card>
      </Enter>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map((t, i) => (
          <Enter key={t.label} delay={300 + i * 70} style={{ width: (width - 40 - 10) / 2 }}>
            <Card onPress={() => router.push(t.to as never)} style={{ padding: 16, gap: 10, minHeight: 132 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T.Label>{t.label}</T.Label>
                <Icon name={t.icon} size={18} color={C.muted} width={1.8} />
              </Row>
              <Row gap={4} style={{ alignItems: 'baseline' }}>
                <T.Num style={{ fontVariant: ['tabular-nums'] }}>{t.value}</T.Num>
                <T.Small>{t.unit}</T.Small>
              </Row>
              <Bar pct={t.pct} color={t.color} height={6} delay={600 + i * 90} />
              <T.Small numberOfLines={1}>{t.sub}</T.Small>
            </Card>
          </Enter>
        ))}
      </View>

      <Enter delay={560}>
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T.Label>{`CONSISTENCY · ${s.loggedStreak}-DAY STREAK`}</T.Label>
            <Text style={{ fontFamily: F.displayBold, fontSize: 22, color: C.lime }}>{s.loggedStreak}</Text>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {s.marks.map((m) => <Square key={m.date} mark={m.mark} size={(width - 40 - 38 - 36) / 7} />)}
          </View>
          <Row gap={14}>
            <Legend color={C.lime} label="All targets" />
            <Legend color={C.limeDeep} label="Some" />
            <Legend color={C.line2} label="Missed" />
          </Row>
        </Card>
      </Enter>

      <Enter delay={640}>
        <Card style={{ gap: 14, padding: 20 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ gap: 4, flex: 1 }}>
              <T.Label>{session?.completed ? 'DONE TODAY' : s.liftDay ? "TODAY'S SESSION" : 'NEXT SESSION · RECOVERY DAY'}</T.Label>
              <T.Display style={{ fontSize: 32 }}>{`Full Body ${workoutType}`}</T.Display>
            </View>
            <T.Small style={{ textAlign: 'right' }}>{plan?.[workoutType].length ?? 0} lifts{'\n'}~{Math.round((plan?.[workoutType].reduce((s, i) => s + i.sets, 0) ?? 16) * 3.2)} min</T.Small>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(plan?.[workoutType] ?? []).slice(0, 4).map((i) => <Pill key={i.key} text={EXERCISES[i.key].name} />)}
            {(plan?.[workoutType].length ?? 0) > 4 ? <Pill text={`+${(plan?.[workoutType].length ?? 0) - 4}`} /> : null}
          </View>
          {session?.completed ? (
            <Btn title="View session" kind="ghost" onPress={() => router.push('/train')} />
          ) : (
            <Btn title={s.openSession ? 'Resume session' : s.liftDay ? 'Start session' : 'Start anyway'} kind="light" icon="play" onPress={() => router.push('/train')} />
          )}
          {!s.liftDay && !session ? <T.Small>Recovery day: walk and hit your steps. Lifting is Mon / Wed / Fri.</T.Small> : null}
        </Card>
      </Enter>

      {s.special ? (
        <Enter delay={720}>
          <Card tone="orange" onPress={() => router.push('/food')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bowl" color={C.bg} size={22} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <T.Strong>{s.special === 'chicken' ? 'Chicken night at the mess' : 'Egg night at the mess'}</T.Strong>
              <T.Small style={{ color: '#C9B8A6' }}>{s.special === 'chicken' ? `Take a meaningful portion first.${kcalLeft > 0 ? ` ~${fmt(kcalLeft)} kcal left.` : ''}` : 'Prioritise the eggs; top up with dal and curd.'}</T.Small>
            </View>
          </Card>
        </Enter>
      ) : null}
    </Screen>
  );
}

function QuickAction({ label, onPress, done }: { label: string; onPress: () => void; done?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.8 : 1 })}>
      <Icon name={done ? 'check' : 'plus'} size={16} color={done ? C.lime : C.text} width={2.2} />
      <Text style={{ color: C.text, fontFamily: F.medium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function PulseDot({ color }: { color: string }) {
  const p = useProgress(2200, Math.floor(Date.now() / 2200));
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 2200); return () => clearInterval(id); }, []);
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 10 + 12 * p, height: 10 + 12 * p, borderRadius: 11, borderWidth: 2, borderColor: color, opacity: 0.5 * (1 - p) }} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

function Square({ mark, size }: { mark: string; size: number }) {
  const bg = { all: C.lime, some: C.limeDeep, none: C.line2, today: 'rgba(212,255,79,0.18)', future: 'transparent' }[mark] ?? C.line2;
  return <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: bg, borderWidth: mark === 'today' ? 2 : mark === 'future' ? 1 : 0, borderColor: mark === 'today' ? C.lime : C.line2 }} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <T.Small style={{ fontSize: 11 }}>{label}</T.Small>
    </Row>
  );
}
