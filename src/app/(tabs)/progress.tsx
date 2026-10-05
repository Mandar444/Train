import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Bar, Card, Enter, Pill, Row, Screen, T } from '../../components/ui';
import { TrendChart } from '../../components/charts';
import { Grid2, LiftCard, MilestoneCard, MilestoneState, SectionHead, ShortcutTile, StatCard } from '../../components/progressCards';
import { useQuery } from '../../lib/hooks';
import { loadSummary, strengthTrend } from '../../lib/summary';
import * as repo from '../../lib/repo';
import { avgSeries, exName, fmt } from '../../lib/logic';
import { mondayOf, today } from '../../lib/dates';
import { LIFT_DAYS, MILESTONES } from '../../lib/plan';
import { C, F } from '../../lib/theme';

const kg1 = (n: number) => (+n.toFixed(1)).toString();

async function load(date: string) {
  const s = await loadSummary(date);
  if (!s) return null;
  const mon = mondayOf(date);
  const [m, str, weekSessions, weekNut, logs, nut] = await Promise.all([
    repo.measurements(),
    strengthTrend(date),
    repo.sessionsBetween(mon, date),
    repo.nutritionByDay(mon, date),
    repo.getDays(s.profile.start_date, date),
    repo.nutritionByDay(s.profile.start_date, date),
  ]);
  // best weight per session for each lift, for the sparklines
  const lifts = await Promise.all(str.rows.map(async (r) => {
    const h = await repo.exerciseHistory(r.exercise);
    const per: number[] = [];
    let lastKey = '';
    for (const x of h) {
      if (x.weight_kg == null) continue;
      const key = `${x.date}:${x.session_id}`;
      if (key !== lastKey) { per.push(x.weight_kg); lastKey = key; } else per[per.length - 1] = Math.max(per[per.length - 1], x.weight_kg);
    }
    return { ...r, history: per.slice(-12), sessions: per.length };
  }));
  const loggedDays = new Set<string>();
  for (const l of logs) if (l.weight_kg != null) loggedDays.add(l.date);
  for (const n of nut) if (n.kcal > 0) loggedDays.add(n.date);
  const protDays = weekNut.filter((n) => n.kcal > 0);
  const protein = protDays.length ? protDays.reduce((a, n) => a + n.protein, 0) / protDays.length : null;
  return { s, m, lifts, weekDone: weekSessions.filter((x) => x.completed).length, logged: loggedDays.size, protein, protDays: protDays.length };
}

export default function Progress() {
  const { width } = useWindowDimensions();
  const date = today();
  const { data } = useQuery(() => load(date), [date]);
  if (!data) return <Screen><View /></Screen>;
  const { s, m, lifts, weekDone, logged, protein, protDays } = data;
  const p = s.profile;

  // weight
  const series = avgSeries(s.weights);
  const first = s.weights[0];
  const hasAvg = s.avg != null;
  const lost = hasAvg ? s.lostKg : 0;
  const span = p.start_weight_kg - p.target_weight_kg;
  const pct = hasAvg && span > 0 ? Math.max(0, Math.min(1, lost / span)) : 0;
  const loss = s.change != null ? -s.change : null;
  let pace: string;
  if (!s.weights.length) pace = 'Log your first morning weigh-in to start the trend.';
  else if (loss == null) pace = 'Keep weighing in. Your weekly pace shows up after about a week.';
  else if (loss >= 0.05) {
    const where = loss > 0.85 ? 'faster than the 0.4 to 0.8 kg target' : loss >= 0.35 ? 'right inside the target range' : 'a little under the 0.4 to 0.8 kg target';
    pace = `On pace for ${loss.toFixed(1)} kg a week, ${where}.`;
  } else pace = 'Flat this week. Judge it over two weeks, not one.';
  const weeksLeft = loss != null && loss >= 0.1 && s.avg != null && s.avg > p.target_weight_kg ? Math.ceil((s.avg - p.target_weight_kg) / loss) : null;
  const chartW = width - 40 - 38;

  // waist
  const waists = m.filter((x) => x.waist_cm != null);
  const waistDelta = waists.length > 1 ? waists[waists.length - 1].waist_cm! - waists[0].waist_cm! : null;

  // milestones (first entry is the start, use the real start weight)
  const ms = MILESTONES.map((x, i) => {
    const kg = i === 0 ? p.start_weight_kg : x.kg;
    const reached = i === 0 || (s.avg != null && s.avg <= kg + 0.05);
    const current = !reached && s.milestone?.kg === x.kg;
    const state: MilestoneState = reached ? 'reached' : current ? 'current' : 'locked';
    return { ...x, kgLabel: kg1(kg), state };
  });
  const reachedCount = ms.filter((x) => x.state === 'reached').length - 1;

  let d = 0;
  const next = () => (d += 60);

  return (
    <Screen>
      <Enter style={{ gap: 4, paddingTop: 8 }}>
        <T.Display>Progress</T.Display>
        <T.Small>{`Day ${s.day} of 84, week ${s.week} of 12`}</T.Small>
      </Enter>

      {/* hero */}
      <Enter delay={next()}>
        <Card style={{ gap: 16, borderColor: '#2C3320' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T.Label style={{ fontSize: 13 }}>Lost so far, 7-day average</T.Label>
            <Pill tone="lime" text={`Week ${s.week}`} style={{ paddingVertical: 4 }} />
          </Row>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontFamily: F.display, fontSize: 68, letterSpacing: -2, color: lost > 0 ? C.lime : C.text, lineHeight: 76 }}>
                {lost < 0 ? `+${Math.abs(lost).toFixed(1)}` : lost.toFixed(1)}
              </Text>
              <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.dim }}>kg</Text>
            </View>
            <View style={{ alignItems: 'flex-end', paddingBottom: 10 }}>
              <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>{s.avg != null ? s.avg.toFixed(1) : p.start_weight_kg}</Text>
              <T.Small style={{ fontSize: 12 }}>{s.avg != null ? 'kg now' : 'kg start'}</T.Small>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Bar pct={pct} height={10} delay={200} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T.Small style={{ fontSize: 12 }}>{`${kg1(p.start_weight_kg)} kg start`}</T.Small>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.lime }}>{`${Math.round(pct * 100)}%`}</Text>
              <T.Small style={{ fontSize: 12 }}>{`${kg1(p.target_weight_kg)} kg goal`}</T.Small>
            </Row>
          </View>

          <TrendChart daily={s.weights.map((w) => w.weight_kg)} avg={series.map((x) => x.avg)} width={chartW} height={120}
            band={first ? { startKg: first.weight_kg, slowPerDay: 0.4 / 7, fastPerDay: 0.8 / 7 } : undefined} />

          <View style={{ gap: 2 }}>
            <T.Body style={{ fontFamily: F.semibold, fontSize: 15 }}>{pace}</T.Body>
            {weeksLeft != null ? <T.Small style={{ fontSize: 13 }}>{`At this pace you reach ${kg1(p.target_weight_kg)} kg in about ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weeks'}.`}</T.Small> : null}
            {s.weights.length ? <T.Small style={{ fontSize: 12, color: C.faint }}>Shaded band is the expected pace. The bright line is your 7-day average.</T.Small> : null}
          </View>
        </Card>
      </Enter>

      {/* stats */}
      <Enter delay={next()}>
        <SectionHead title="This week" sub={`Week ${s.week} of 12`} />
      </Enter>
      <Enter delay={next()}>
        <Grid2>
          <StatCard icon="trend" label="Weekly rate" highlight={loss != null && loss >= 0.35 && loss <= 0.85}
            value={loss != null ? (loss >= 0 ? `−${loss.toFixed(2)}` : `+${Math.abs(loss).toFixed(2)}`) : null} unit="kg/wk"
            sub="Target 0.4 to 0.8" empty="Weigh in daily for a week to see your rate" onPress={loss == null ? () => router.push('/weight' as never) : undefined} />
          <StatCard icon="ruler" label="Waist" highlight={waistDelta != null && waistDelta < 0}
            value={waistDelta != null ? (waistDelta <= 0 ? `−${Math.abs(waistDelta).toFixed(1)}` : `+${waistDelta.toFixed(1)}`) : waists.length ? waists[0].waist_cm!.toFixed(1) : null}
            unit="cm" sub={waistDelta != null ? `Now ${waists[waists.length - 1].waist_cm!.toFixed(1)} cm at the navel` : 'First measurement. Measure again next week.'}
            empty="Log a waist measurement" onPress={() => router.push('/body')} />
          <StatCard icon="dumbbell" label="Workouts" value={`${weekDone}/${LIFT_DAYS.length}`} highlight={weekDone >= LIFT_DAYS.length}
            sub={`${s.sessionsDone} done in total`} empty="" onPress={() => router.push('/train' as never)} />
          <StatCard icon="steps" label="Steps, 7-day avg" value={s.stepAvg7 != null ? fmt(s.stepAvg7) : null} highlight={s.stepAvg7 != null && s.stepAvg7 >= s.stepTarget}
            sub={`Goal ${fmt(s.stepTarget)} a day`} empty="Add steps or connect Health Connect" onPress={() => router.push('/steps' as never)} />
          <StatCard icon="calendar" label="Logging streak" value={`${s.loggedStreak}`} unit={s.loggedStreak === 1 ? 'day' : 'days'} highlight={s.loggedStreak >= 7}
            sub={`${logged} of ${s.day} days logged`} empty="" />
          <StatCard icon="protein" label="Protein, this week" value={protein != null ? `${Math.round(protein)}` : null} unit="g/day"
            highlight={protein != null && protein >= p.protein_min}
            sub={protein != null ? `Aim ${p.protein_min} to ${p.protein_max} g, ${protDays} ${protDays === 1 ? 'day' : 'days'} logged` : undefined}
            empty="Log your meals to see protein" onPress={() => router.push('/food' as never)} />
        </Grid2>
      </Enter>

      {/* strength */}
      <Enter delay={next()}>
        <SectionHead title="Strength" sub={lifts.length ? 'Best set per lift' : undefined} />
      </Enter>
      <Enter delay={next()}>
        {lifts.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }} decelerationRate="fast" snapToInterval={178}>
            {lifts.map((r) => (
              <LiftCard key={r.exercise} name={exName(r.exercise)} best={r.to} gain={r.to - r.from} sessions={r.sessions} history={r.history}
                onPress={() => router.push({ pathname: '/history', params: { exercise: r.exercise } })} />
            ))}
          </ScrollView>
        ) : (
          <Card onPress={() => router.push('/train' as never)} style={{ gap: 4 }}>
            <T.Strong>No lifts logged yet</T.Strong>
            <T.Small>Finish your first workout and each lift gets its own card here.</T.Small>
          </Card>
        )}
      </Enter>

      {/* milestones */}
      <Enter delay={next()}>
        <SectionHead title="Milestones" sub={`${Math.max(0, reachedCount)} of ${MILESTONES.length - 1} reached`} />
      </Enter>
      <Enter delay={next()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }} decelerationRate="fast" snapToInterval={210}>
          {ms.map((x, i) => (
            <MilestoneCard key={x.name} name={i === 0 ? 'Start' : x.name} kg={x.kgLabel} what={x.what} state={x.state}
              pct={x.state === 'current' ? s.milestone?.pct : undefined}
              note={x.state === 'current' && s.milestone && s.avg != null ? `${Math.max(0, s.avg - x.kg).toFixed(1)} kg to go` : undefined} />
          ))}
        </ScrollView>
      </Enter>

      {/* shortcuts */}
      <Enter delay={next()}>
        <SectionHead title="More" />
      </Enter>
      <Enter delay={next()}>
        <Grid2>
          <ShortcutTile icon="check" title="Weekly review" sub="Is the plan working, and what to change" onPress={() => router.push('/review')} />
          <ShortcutTile icon="camera" title="Body & photos" sub="Waist weekly, photos every 2 weeks" onPress={() => router.push('/body')} />
          <ShortcutTile icon="calendar" title="12-week plan" sub="This week, targets and the rules" onPress={() => router.push('/plan')} />
          <ShortcutTile icon="search" title="Exercise library" sub="Every exercise with form animations" onPress={() => router.push('/library')} />
        </Grid2>
      </Enter>
    </Screen>
  );
}
