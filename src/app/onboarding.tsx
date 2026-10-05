import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Enter, Field, Row, Screen, T } from '../components/ui';
import { saveProfile } from '../lib/repo';
import { scheduleAll } from '../lib/notify';
import { today } from '../lib/dates';
import { C, F } from '../lib/theme';

export default function Onboarding() {
  const [f, setF] = useState({ name: 'Mandar', age: '20', height: '174', start: '94', target: '85', kcal: '2150', pmin: '130', pmax: '160' });
  const [busy, setBusy] = useState(false);
  const n = (s: string, d: number) => { const v = parseFloat(s.replace(',', '.')); return isNaN(v) ? d : v; };

  const start = async () => {
    setBusy(true);
    await saveProfile({
      name: f.name.trim() || 'Mandar', age: n(f.age, 20), sex: 'Male', height_cm: n(f.height, 174),
      start_weight_kg: n(f.start, 94), target_weight_kg: n(f.target, 85), start_date: today(),
      kcal_target: Math.round(n(f.kcal, 2150)), protein_min: Math.round(n(f.pmin, 130)), protein_max: Math.round(n(f.pmax, 160)),
    });
    scheduleAll().catch(() => {});
    router.replace('/');
    setTimeout(() => router.push('/weight'), 400);
  };

  return (
    <Screen bottomPad={40}>
      <Enter>
        <View style={{ gap: 10, paddingTop: 24 }}>
          <T.Label>12-WEEK CUT + MUSCLE</T.Label>
          <Text style={{ fontFamily: F.display, fontSize: 44, lineHeight: 50, color: C.text }}>
            Boringly{'\n'}<Text style={{ color: C.lime }}>measurable.</Text>
          </Text>
          <T.Body style={{ color: C.muted }}>Sustainable deficit, three full-body sessions a week, daily walking, enough sleep. Change things only when the trend says so.</T.Body>
        </View>
      </Enter>

      <Enter delay={120}>
        <Row gap={8}>
          {[['2,150', 'kcal'], ['130+', 'g protein'], ['7k→10k', 'steps'], ['3×', 'lifts / wk']].map(([v, l]) => (
            <Card key={l} style={{ flex: 1, padding: 12, gap: 2 }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: C.text }}>{v}</Text>
              <T.Small style={{ fontSize: 12.5 }}>{l}</T.Small>
            </Card>
          ))}
        </Row>
      </Enter>

      <Enter delay={200}>
        <Card style={{ gap: 12 }}>
          <T.Label>YOU</T.Label>
          <Field label="NAME" value={f.name} onChangeText={(t) => setF({ ...f, name: t })} />
          <Row gap={10}>
            <Field label="AGE" keyboardType="number-pad" value={f.age} onChangeText={(t) => setF({ ...f, age: t })} style={{ flex: 1 }} />
            <Field label="HEIGHT CM" keyboardType="decimal-pad" value={f.height} onChangeText={(t) => setF({ ...f, height: t })} style={{ flex: 1 }} />
          </Row>
          <Row gap={10}>
            <Field label="START KG" keyboardType="decimal-pad" value={f.start} onChangeText={(t) => setF({ ...f, start: t })} style={{ flex: 1 }} />
            <Field label="GOAL KG" keyboardType="decimal-pad" value={f.target} onChangeText={(t) => setF({ ...f, target: t })} style={{ flex: 1 }} />
          </Row>
          <T.Label style={{ marginTop: 6 }}>DAILY TARGETS</T.Label>
          <Row gap={10}>
            <Field label="KCAL" keyboardType="number-pad" value={f.kcal} onChangeText={(t) => setF({ ...f, kcal: t })} style={{ flex: 1 }} />
            <Field label="PROTEIN MIN" keyboardType="number-pad" value={f.pmin} onChangeText={(t) => setF({ ...f, pmin: t })} style={{ flex: 1 }} />
            <Field label="MAX" keyboardType="number-pad" value={f.pmax} onChangeText={(t) => setF({ ...f, pmax: t })} style={{ flex: 1 }} />
          </Row>
        </Card>
      </Enter>

      <Btn title={busy ? 'Setting up…' : 'Start Day 1'} onPress={start} disabled={busy} />
      <T.Small style={{ textAlign: 'center', color: C.dim }}>Day 1 isn't supposed to be perfect. It's supposed to create a reliable baseline. This is a general fitness framework, not medical advice.</T.Small>
    </Screen>
  );
}
