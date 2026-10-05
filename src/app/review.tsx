import { Text, View } from 'react-native';
import { Card, Header, Icon, Row, Screen, Stat, T } from '../components/ui';
import { useQuery } from '../lib/hooks';
import * as repo from '../lib/repo';
import { strengthTrend } from '../lib/summary';
import { addDays, dayMonth, today } from '../lib/dates';
import { avgAt, fmt, status, weekNumber } from '../lib/logic';
import { stepTarget } from '../lib/plan';
import { C, F } from '../lib/theme';

async function load() {
  const p = await repo.getProfile();
  if (!p) return null;
  const t = today();
  const curWeek = weekNumber(p, t);
  const week = curWeek > 1 ? curWeek - 1 : 1;
  const from = addDays(p.start_date, (week - 1) * 7);
  const to = curWeek > 1 ? addDays(from, 6) : t;
  const ws = await repo.allWeights();
  const end = avgAt(ws, to);
  const startAvg = avgAt(ws, addDays(from, -1));
  const days = await repo.getDays(from, to);
  const nut = await repo.nutritionByDay(from, to);
  const sess = (await repo.sessionsBetween(from, to)).filter((s) => s.completed);
  const meas = (await repo.measurements()).filter((m) => m.waist_cm != null);
  const wEnd = meas.filter((m) => m.date <= to).pop();
  const wPrev = meas.filter((m) => m.date < from).pop();
  const strength = await strengthTrend(to);
  const st = status(ws, to, strength.up);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const steps = avg(days.filter((d) => d.steps != null).map((d) => d.steps as number));
  const sleep = avg(days.filter((d) => d.sleep_hours != null).map((d) => d.sleep_hours as number));
  const kcal = avg(nut.map((n) => n.kcal));
  const protein = avg(nut.map((n) => n.protein));
  return { p, week, from, to, end, startAvg, steps, sleep, kcal, protein, sessions: sess.length, wEnd, wPrev, strength, st, target: stepTarget(week) };
}

export default function Review() {
  const { data: r } = useQuery(load, []);
  if (!r) return <Screen><Header title="Weekly review" /></Screen>;
  const change = r.end && r.startAvg ? r.end.avg - r.startAvg.avg : null;
  const waistChange = r.wEnd?.waist_cm != null && r.wPrev?.waist_cm != null ? r.wEnd.waist_cm - r.wPrev.waist_cm : null;

  const watch: { title: string; text: string }[] = [];
  if (r.protein != null && r.protein < r.p.protein_min) watch.push({ title: 'Protein', text: `Averaged ${Math.round(r.protein)} g, under the ${r.p.protein_min} g floor. On non-chicken days add a curd bowl, milk or extra dal.` });
  if (r.steps != null && r.steps < r.target) watch.push({ title: 'Steps', text: `Averaged ${fmt(r.steps)}, below the ${fmt(r.target)} target. A 20-minute walk after dinner usually closes it.` });
  if (r.kcal != null && r.kcal > r.p.kcal_target + 150) watch.push({ title: 'Calories', text: `Averaged ${fmt(r.kcal)} kcal. Check second servings, snacks and drinks.` });
  if (r.sessions < 3 && r.week > 0) watch.push({ title: 'Training', text: `${r.sessions} of 3 sessions done. Consistency beats intensity.` });
  if (r.sleep != null && r.sleep < 7) watch.push({ title: 'Sleep', text: `Averaged ${r.sleep.toFixed(1)} h. Hunger and recovery both suffer under 7.` });
  const main = watch[0];

  const RULES = [
    { key: 'ON_TRACK', tag: 'ON TRACK', when: 'Losing ~0.4–0.8 kg/week, training okay', then: 'Keep the plan unchanged.' },
    { key: 'AUDIT', tag: 'AUDIT', when: 'Almost no change for 2–3 weeks', then: 'Check portions, snacks, drinks, steps, logging. Then −150–200 kcal or more steps.' },
    { key: 'REVIEW', tag: 'REVIEW', when: '>1% bodyweight/week + fatigue', then: 'Consider a small increase in food and reassess.' },
    { key: 'RECOMP', tag: 'RECOMP', when: 'Strength up, weight falling slowly', then: 'Don’t panic. Recomposition may be happening.' },
  ];

  return (
    <Screen bottomPad={40}>
      <Header title="Weekly review" kicker={`WEEK ${r.week} · ${dayMonth(r.from).toUpperCase()} – ${dayMonth(r.to).toUpperCase()}`} />

      <View style={{ padding: 22, borderRadius: 24, backgroundColor: r.st.color, gap: 10 }}>
        <Text style={{ fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.1, color: r.st.ink }}>VERDICT</Text>
        <Text style={{ fontFamily: F.display, fontSize: 52, lineHeight: 52, color: r.st.ink, textTransform: 'uppercase' }}>{r.st.tag}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 21, color: r.st.ink }}>{r.st.line} {r.st.detail}</Text>
      </View>

      <Row gap={8}>
        <Stat label="7-DAY AVG" value={r.end ? `${r.end.avg.toFixed(1)}` : '—'} sub={change != null ? `${change <= 0 ? '−' : '+'}${Math.abs(change).toFixed(1)} kg` : 'baseline'} subColor={change != null && change <= 0 ? C.lime : C.muted} />
        <Stat label="WAIST" value={r.wEnd?.waist_cm ? `${r.wEnd.waist_cm}` : '—'} sub={waistChange != null ? `${waistChange <= 0 ? '−' : '+'}${Math.abs(waistChange).toFixed(1)} cm` : 'cm'} subColor={waistChange != null && waistChange <= 0 ? C.lime : C.muted} />
      </Row>
      <Row gap={8}>
        <Stat label="STEPS AVG" value={r.steps != null ? fmt(r.steps) : '—'} sub={`target ${fmt(r.target)}${r.steps != null && r.steps >= r.target ? ' ✓' : ''}`} subColor={r.steps != null && r.steps >= r.target ? C.lime : C.muted} />
        <Stat label="TRAINING" value={`${r.sessions} / 3`} sub={r.strength.up ? `${r.strength.up} lifts went up` : 'sessions'} subColor={r.strength.up ? C.lime : C.muted} />
      </Row>
      <Row gap={8}>
        <Stat label="CALORIES AVG" value={r.kcal != null ? fmt(r.kcal) : '—'} sub={`target ${fmt(r.p.kcal_target)}`} />
        <Stat label="PROTEIN AVG" value={r.protein != null ? `${Math.round(r.protein)} g` : '—'} sub={r.protein != null && r.protein < r.p.protein_min ? `below ${r.p.protein_min} g` : `${r.p.protein_min}–${r.p.protein_max} g`} subColor={r.protein != null && r.protein < r.p.protein_min ? C.orange : C.muted} />
      </Row>

      {main ? (
        <Card tone="orange" style={{ flexDirection: 'row', gap: 12 }}>
          <Icon name="warn" color={C.orange} size={22} />
          <View style={{ flex: 1, gap: 4 }}>
            <T.Strong>{`One thing to watch: ${main.title.toLowerCase()}`}</T.Strong>
            <T.Small style={{ color: C.orangeText, fontSize: 13 }}>{main.text} Nothing else changes.</T.Small>
          </View>
        </Card>
      ) : null}

      {r.st.key === 'AUDIT' ? (
        <Card style={{ gap: 8 }}>
          <T.Label>AUDIT CHECKLIST</T.Label>
          {['Portions grew without noticing?', 'Snacks, drinks or desserts unlogged?', 'Weekend eating erased the deficit?', 'Steps dropped as the diet went on?', 'Logging every day honestly?'].map((q) => <T.Small key={q} style={{ color: C.text2, fontSize: 13 }}>• {q}</T.Small>)}
        </Card>
      ) : null}

      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <T.Label style={{ padding: 16, paddingBottom: 8 }}>DECISION RULES</T.Label>
        {RULES.map((x) => {
          const on = x.key === r.st.key;
          return (
            <Row key={x.key} gap={12} style={{ padding: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#21221C', alignItems: 'flex-start', backgroundColor: on ? 'rgba(212,255,79,0.06)' : 'transparent' }}>
              <Text style={{ minWidth: 76, textAlign: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: on ? C.lime : C.card2, color: on ? C.bg : C.muted, fontFamily: F.monoBold, fontSize: 10 }}>{x.tag}</Text>
              <View style={{ flex: 1, gap: 3 }}>
                <T.Body style={{ fontSize: 13, color: on ? C.text : C.text2 }}>{x.when}</T.Body>
                <T.Small style={{ color: C.dim }}>{x.then}</T.Small>
              </View>
            </Row>
          );
        })}
      </Card>
      <T.Small style={{ color: C.dim }}>Change one variable at a time, then collect 1–2 weeks of data before reassessing.</T.Small>
    </Screen>
  );
}
