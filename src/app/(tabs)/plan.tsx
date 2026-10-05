import { Text, View } from 'react-native';
import { Card, Enter, Row, Screen, T } from '../../components/ui';
import { useQuery } from '../../lib/hooks';
import * as repo from '../../lib/repo';
import { addDays, dayMonth, dowShort, mondayOf, today, weekday } from '../../lib/dates';
import { isLiftDay, weekNumber } from '../../lib/logic';
import { EXERCISES, RULES, stepTargetLabel, WORKOUTS, WorkoutType } from '../../lib/plan';
import { C, F } from '../../lib/theme';

export default function Plan() {
  const date = today();
  const { data } = useQuery(async () => {
    const p = await repo.getProfile();
    const mon = mondayOf(date);
    const sess = await repo.sessionsBetween(mon, addDays(mon, 6));
    const last = await repo.lastCompletedSession();
    const specials = await repo.getSpecials();
    return { p, mon, sess, last, specials };
  }, [date]);
  if (!data?.p) return <Screen><View /></Screen>;
  const { p, mon, sess, specials } = data;
  const week = weekNumber(p, date);
  const end = addDays(p.start_date, 83);

  // Predict A/B for the remaining lift days this week by alternating from what's done.
  let lastType: WorkoutType | null = null;
  const before = sess.filter((s) => s.completed);
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).map((d) => {
    const done = before.find((s) => s.date === d);
    let type: WorkoutType | null = null;
    if (isLiftDay(d)) {
      if (done) type = done.type;
      else type = lastType ? (lastType === 'A' ? 'B' : 'A') : data.last ? (data.last.type === 'A' ? 'B' : 'A') : 'A';
      lastType = type;
    }
    const sp = specials[weekday(d)];
    const isSun = weekday(d) === 0;
    return {
      d, type, done: !!done, now: d === date, past: d < date,
      title: type ? `Full Body ${type}` : isSun ? 'Rest / walk' : weekday(d) === 6 ? 'Walk' : 'Walk + recovery',
      sub: type ? WORKOUTS[type].slice(1, 4).map((k) => EXERCISES[k].name.split(' ')[0]).join(' · ') + (sp ? ` · ${sp} night` : '') : weekday(d) === 6 ? 'Optional easy rowing or cycling' : isSun ? `Weekly review${sp ? ` · ${sp} night` : ''}` : `${stepTargetLabel(week)} steps${sp ? ` · ${sp} night` : ''}`,
    };
  });

  return (
    <Screen>
      <Enter>
        <View style={{ gap: 6 }}>
          <T.Label>{`CUT + MUSCLE · ${dayMonth(p.start_date).toUpperCase()} – ${dayMonth(end).toUpperCase()}`}</T.Label>
          <T.Display>The plan</T.Display>
        </View>
      </Enter>

      <Row gap={4}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', height: 44, borderRadius: 8, backgroundColor: w < week ? C.lime : w === week ? 'rgba(212,255,79,0.18)' : C.card, borderWidth: w === week ? 2 : 1, borderColor: w === week ? C.lime : C.line }} />
            <Text style={{ fontFamily: F.mono, fontSize: 10, color: w === week ? C.text : C.dim }}>{w}</Text>
          </View>
        ))}
      </Row>

      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <Row style={{ justifyContent: 'space-between', padding: 16, paddingBottom: 10 }}>
          <T.Strong>{`Week ${week}`}</T.Strong>
          <T.Small>Workouts alternate A / B</T.Small>
        </Row>
        {days.map((x) => (
          <Row key={x.d} gap={12} style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#21221C', backgroundColor: x.now ? 'rgba(212,255,79,0.06)' : 'transparent' }}>
            <Text style={{ width: 34, fontFamily: F.mono, fontSize: 12, color: x.now ? C.lime : C.dim }}>{dowShort(x.d)}</Text>
            <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: x.type ? (x.now ? C.lime : C.text) : C.card2 }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 16, color: x.type ? C.bg : C.faint }}>{x.type ?? '·'}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T.Body style={{ fontFamily: F.semibold, fontSize: 14 }}>{x.title}</T.Body>
              <T.Small style={{ color: C.dim }} numberOfLines={1}>{x.sub}</T.Small>
            </View>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: x.now ? C.lime : C.dim }}>{x.done ? 'DONE' : x.now ? 'TODAY' : ''}</Text>
          </Row>
        ))}
      </Card>

      <T.Label>{"THIS WEEK'S TARGETS"}</T.Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          ['CALORIES', `${p.kcal_target.toLocaleString('en-US')} kcal`],
          ['PROTEIN', `${p.protein_min}–${p.protein_max} g`],
          ['STEPS / DAY', stepTargetLabel(week)],
          ['SLEEP', '7–9 h'],
        ].map(([l, v]) => (
          <Card key={l} style={{ width: '48.6%', padding: 14, gap: 4 }}>
            <T.Label style={{ fontSize: 10 }}>{l}</T.Label>
            <T.Num style={{ fontSize: 24 }}>{v}</T.Num>
          </Card>
        ))}
      </View>

      <T.Label>MESS PROTEIN NIGHTS</T.Label>
      <Row gap={8}>
        {[3, 5, 0].map((wd) => {
          const sp = specials[wd];
          const on = weekday(date) === wd;
          return (
            <Card key={wd} tone={on ? 'orange' : 'base'} style={{ flex: 1, padding: 14, gap: 6, borderColor: on ? C.orange : C.line }}>
              <Text style={{ fontFamily: F.mono, fontSize: 11, color: on ? C.orange : C.muted }}>{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][wd]}</Text>
              <T.Strong>{sp === 'chicken' ? 'Chicken' : sp === 'eggs' ? 'Eggs' : '—'}</T.Strong>
            </Card>
          );
        })}
      </Row>

      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <T.Label style={{ padding: 16, paddingBottom: 8 }}>THE RULES</T.Label>
        {RULES.map((r, i) => (
          <Row key={i} gap={12} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#21221C', alignItems: 'flex-start' }}>
            <Text style={{ width: 20, fontFamily: F.mono, fontSize: 12, color: C.lime }}>{String(i + 1).padStart(2, '0')}</Text>
            <T.Small style={{ flex: 1, fontSize: 13, color: C.text2 }}>{r}</T.Small>
          </Row>
        ))}
      </Card>

      <T.Small style={{ color: C.dim }}>This is a general fitness framework, not medical advice. If something hurts or feels wrong, get individual guidance.</T.Small>
    </Screen>
  );
}
