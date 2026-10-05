import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Bar, Card, Enter, Icon, IconName, Row, Screen, T } from '../../components/ui';
import { MultiRing, TrendChart } from '../../components/charts';
import { useQuery } from '../../lib/hooks';
import { loadSummary } from '../../lib/summary';
import { avgSeries, fmt, nextTrainingDay } from '../../lib/logic';
import { diffDays, dowShort, dayMonth, greeting, today } from '../../lib/dates';
import { C, F } from '../../lib/theme';
import { DAY1_CHECKLIST, estMinutes, EXERCISES, isDayKey, planFor, PROGRAM, workoutName } from '../../lib/plan';
import { syncHealth } from '../../lib/health';
import { refreshNudges } from '../../lib/notify';
import { getKV, getWorkouts, setKV } from '../../lib/repo';

export default function Home() {
  const date = today();
  const { data: s } = useQuery(() => loadSummary(date), [date]);
  const { data: checklist } = useQuery(() => getKV<Record<string, boolean>>('day1_checklist', {}), []);
  const { data: plan } = useQuery(getWorkouts, []);
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const sess0 = s ? s.openSession ?? s.todaySession : null;
  const wDone = !!sess0?.completed;
  useEffect(() => {
    if (!s) return;
    refreshNudges({
      steps: s.steps, stepTarget: s.stepTarget,
      protein: s.protein, proteinMin: s.profile.protein_min,
      workoutName: s.liftDay ? workoutName(sess0?.type ?? s.nextWorkout) : null, workoutDone: wDone,
    });
  }, [s?.steps, s?.stepTarget, s?.protein, wDone, s?.liftDay]);

  // Existing installs that never linked steps: ask once.
  useEffect(() => {
    if (!s) return;
    (async () => {
      const [prompted, connected] = await Promise.all([getKV('hc_prompted', false), getKV('health_connected', false)]);
      if (!prompted && !connected) router.push('/connect-steps');
    })();
  }, [!!s]);

  if (s === null) return <Redirect href="/onboarding" />;
  if (!s) return <Screen><View /></Screen>;

  const session = s.openSession ?? s.todaySession;
  const wType = session?.type ?? s.nextWorkout;
  const lifts = planFor(plan, wType);
  const wName = workoutName(wType);
  const kcalLeft = s.profile.kcal_target - s.kcal;
  const showDay1 = s.day <= 2 && DAY1_CHECKLIST.some((c) => !checklist?.[c.key]);
  const series = avgSeries(s.weights).slice(-21);
  const recent = s.weights.slice(-21);
  const doneCount = [s.todayWeight != null, s.kcal > 0, s.steps >= s.stepTarget, !!session?.completed || !s.liftDay].filter(Boolean).length;

  const ringSize = Math.min(width - 96, 270);
  const RING = ['#D4FF4F', '#AFD43F', '#8AA931', '#677E25'];
  const legend = [
    { c: RING[0], l: 'Food', v: `${fmt(s.kcal)} kcal`, pct: s.kcal / s.profile.kcal_target },
    { c: RING[1], l: 'Steps', v: fmt(s.steps), pct: s.steps / s.stepTarget },
    { c: RING[2], l: 'Workout', v: session?.completed ? 'Done' : s.liftDay ? 'To do' : 'Rest', pct: session?.completed || !s.liftDay ? 1 : s.openSession ? 0.5 : 0 },
    { c: RING[3], l: 'Weight', v: s.todayWeight != null ? `${s.todayWeight.toFixed(1)} kg` : 'Not yet', pct: s.todayWeight != null ? 1 : 0 },
  ];

  const workoutRow = session?.completed
    ? { value: `${wName} done`, sub: 'Nice work. Recover and hit your steps.', action: 'View', done: true }
    : s.openSession
      ? { value: `${wName} in progress`, sub: `${lifts.length} exercises`, action: 'Resume', done: false }
      : s.liftDay
        ? { value: wName, sub: `${lifts.length} exercises · about ${estMinutes(lifts, isDayKey(wType) ? PROGRAM[wType].finisherMin : 0)} min`, action: 'Start', done: false }
        : { value: 'Rest day', sub: `Next: ${workoutName(nextTrainingDay(date).key)} tomorrow. Walk and recover today.`, action: 'Open', done: true };

  const rows: { key: string; icon: IconName; title: string; value: string; sub: string; pct?: number; color?: string; tint: string; action: string; done: boolean; to: string }[] = [
    {
      key: 'weight', icon: 'scale', title: 'Morning weight', tint: C.lime,
      value: s.todayWeight != null ? `${s.todayWeight.toFixed(1)} kg` : 'Not logged yet',
      sub: s.todayWeight != null ? 'Logged today' : 'After the bathroom, before food',
      action: s.todayWeight != null ? 'Edit' : 'Log', done: s.todayWeight != null, to: '/weight',
    },
    {
      key: 'food', icon: 'bowl', title: 'Food', tint: C.lime,
      value: `${fmt(s.kcal)} / ${fmt(s.profile.kcal_target)} kcal`,
      sub: `${Math.round(s.protein)} g protein of ${s.profile.protein_min}+ g · ${kcalLeft >= 0 ? `${fmt(kcalLeft)} kcal left` : `${fmt(-kcalLeft)} over`}`,
      pct: s.kcal / s.profile.kcal_target, color: C.lime,
      action: 'Add', done: false, to: '/food',
    },
    {
      key: 'steps', icon: 'steps', title: 'Steps', tint: C.lime,
      value: `${fmt(s.steps)} / ${fmt(s.stepTarget)}`,
      sub: s.steps >= s.stepTarget ? 'Goal done' : `${fmt(s.stepTarget - s.steps)} to go${s.stepsSource === 'health' ? ' · synced' : ''}`,
      pct: s.steps / s.stepTarget, color: C.lime,
      action: 'Open', done: s.steps >= s.stepTarget, to: '/steps',
    },
    { key: 'workout', icon: 'dumbbell', title: 'Workout', tint: C.lime, ...workoutRow, to: '/train' },
  ];

  const onRefresh = async () => { setRefreshing(true); await syncHealth(7); setRefreshing(false); };

  return (
    <Screen refresh={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lime} colors={[C.lime]} progressBackgroundColor={C.card} />}>
      <Enter>
        <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
          <View style={{ gap: 4, flex: 1 }}>
            <T.Display style={{ fontSize: 28 }}>{`${greeting()}, ${s.profile.name}`}</T.Display>
            <T.Small>{date < s.profile.start_date
              ? `${dowShort(date).slice(0, 1)}${dowShort(date).slice(1).toLowerCase()} ${dayMonth(date)} · Plan starts ${dayMonth(s.profile.start_date)}, in ${diffDays(s.profile.start_date, date)} day${diffDays(s.profile.start_date, date) === 1 ? '' : 's'}`
              : `${dowShort(date).slice(0, 1)}${dowShort(date).slice(1).toLowerCase()} ${dayMonth(date)} · Week ${s.week} of 12 · Day ${s.day}`}</T.Small>
          </View>
          <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="settings" size={22} color={C.text} />
          </Pressable>
        </Row>
      </Enter>

      <Enter delay={40}>
        <View style={{ borderRadius: 28, paddingVertical: 24, paddingHorizontal: 18, backgroundColor: '#12130E', borderWidth: 1, borderColor: '#2A2C22', alignItems: 'center', gap: 20, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: -80, top: -90, width: 260, height: 260, borderRadius: 130, backgroundColor: C.lime, opacity: 0.05 }} />
          <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
            <MultiRing size={ringSize} stroke={18} gap={6} rings={legend.map((x) => ({ pct: x.pct, color: x.c }))} />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ fontFamily: F.display, fontSize: 54, color: C.text, letterSpacing: -1 }}>
                {doneCount}<Text style={{ color: C.dim, fontSize: 30 }}>/4</Text>
              </Text>
              <T.Small>done today</T.Small>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' }}>
            {legend.map((x) => (
              <View key={x.l} style={{ width: '48.5%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: '#1A1B15' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: x.c }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.muted }}>{x.l}</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }} numberOfLines={1}>{x.v}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Enter>

      <Enter delay={60}>
        <Pressable onPress={() => router.push('/review')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: s.status.color, opacity: pressed ? 0.9 : 1 })}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 17, color: s.status.ink }}>{s.status.line}</Text>
            <Text style={{ fontFamily: F.medium, fontSize: 14, color: s.status.ink, opacity: 0.8 }} numberOfLines={2}>{s.status.detail}</Text>
          </View>
          <Icon name="chevron" color={s.status.ink} />
        </Pressable>
      </Enter>

      {showDay1 ? (
        <Enter delay={90}>
          <Card style={{ gap: 4 }}>
            <T.Strong>Day 1 checklist</T.Strong>
            <T.Small style={{ marginBottom: 6 }}>Not about being perfect. Just a reliable baseline.</T.Small>
            {DAY1_CHECKLIST.map((c) => {
              const on = !!checklist?.[c.key];
              return (
                <Pressable key={c.key} onPress={() => setKV('day1_checklist', { ...(checklist ?? {}), [c.key]: !on })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? C.lime : C.line3, backgroundColor: on ? C.lime : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={16} color={C.bg} width={3} /> : null}
                  </View>
                  <T.Body style={{ color: on ? C.dim : C.text, textDecorationLine: on ? 'line-through' : 'none', flex: 1 }}>{c.label}</T.Body>
                </Pressable>
              );
            })}
          </Card>
        </Enter>
      ) : null}

      <Enter delay={120}>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 20, color: C.text }}>Today's moves</Text>
          <T.Small>{`${doneCount} of 4 done`}</T.Small>
        </Row>
      </Enter>

      {rows.map((r, i) => (
        <Enter key={r.key} delay={160 + i * 60}>
          <Pressable onPress={() => router.push(r.to as never)} style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: r.done ? r.tint + '55' : C.line, padding: 16, gap: 10, opacity: pressed ? 0.85 : 1 })}>
            <Row gap={14}>
              <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: r.done ? r.tint : r.tint + '22', borderWidth: 1, borderColor: r.tint + '55' }}>
                <Icon name={r.done ? 'check' : r.icon} size={22} color={r.done ? C.bg : r.tint} width={r.done ? 2.8 : 2.1} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T.Small>{r.title}</T.Small>
                <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }} numberOfLines={1}>{r.value}</Text>
              </View>
              <View style={{ paddingHorizontal: 16, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: r.done ? C.card2 : C.lime }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: r.done ? C.text : C.bg }}>{r.action}</Text>
              </View>
            </Row>
            {r.pct !== undefined ? <Bar pct={r.pct} color={r.color} height={8} delay={300 + i * 80} /> : null}
            <T.Small>{r.sub}</T.Small>
          </Pressable>
        </Enter>
      ))}

      <Enter delay={420}>
        <Card onPress={() => router.push('/progress')} style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 2 }}>
              <T.Small>{s.avgN >= 7 ? '7-day average weight' : 'Average weight so far'}</T.Small>
              <Text style={{ fontFamily: F.display, fontSize: 36, color: C.text, letterSpacing: -1 }}>{s.avg != null ? `${s.avg.toFixed(1)} kg` : 'No data'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <T.Small>This week</T.Small>
              <Text style={{ fontFamily: F.bold, fontSize: 18, color: s.change == null ? C.muted : s.change <= 0 ? C.lime : C.text }}>
                {s.change == null ? 'Building' : `${s.change <= 0 ? '−' : '+'}${Math.abs(s.change).toFixed(1)} kg`}
              </Text>
            </View>
          </Row>
          <TrendChart daily={recent.map((w) => w.weight_kg)} avg={series.map((w) => w.avg)} width={width - 40 - 38} height={90} target={s.milestone?.kg} animKey={s.weights.length} />
          {s.milestone ? (
            <View style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T.Small>{`Next goal: ${s.milestone.kg} kg`}</T.Small>
                <T.Small>{`${Math.max(0, s.lostKg).toFixed(1)} kg lost · ${Math.round(s.milestone.pct * 100)}%`}</T.Small>
              </Row>
              <Bar pct={s.milestone.pct} height={8} />
            </View>
          ) : null}
        </Card>
      </Enter>

      {s.special ? (
        <Card onPress={() => router.push('/food')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: '#3A4A16' }}>
          <Icon name="bowl" color={C.lime} size={24} />
          <View style={{ flex: 1, gap: 2 }}>
            <T.Strong>{s.special === 'chicken' ? 'Chicken night at the mess' : 'Egg night at the mess'}</T.Strong>
            <T.Small style={{ color: C.muted }}>{s.special === 'chicken' ? 'Take a good portion and eat it first.' : 'Have the eggs first, then dal and curd.'}</T.Small>
          </View>
        </Card>
      ) : null}

      {lifts.length && !session?.completed ? (
        <T.Small style={{ textAlign: 'center' }}>{`${wName}: ${lifts.slice(0, 3).map((i) => EXERCISES[i.key].name).join(', ')}${lifts.length > 3 ? '…' : ''}`}</T.Small>
      ) : null}
    </Screen>
  );
}
