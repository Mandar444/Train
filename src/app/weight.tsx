import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Field, haptic, IconBtn, Row, T } from '../components/ui';
import { useQuery } from '../lib/hooks';
import { allWeights, clearWeight, getDay, getProfile, setWeight } from '../lib/repo';
import { addDays, dayMonth, dowShort, today } from '../lib/dates';
import { avgAt } from '../lib/logic';
import { C, F } from '../lib/theme';

export default function LogWeight() {
  const ins = useSafeAreaInsets();
  const date = today();
  const { data } = useQuery(async () => ({ weights: await allWeights(), day: await getDay(date), profile: await getProfile() }), [date]);
  const [tenths, setTenths] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!data || tenths !== null) return;
    const base = data.day?.weight_kg ?? data.weights[data.weights.length - 1]?.weight_kg ?? data.profile?.start_weight_kg ?? 80;
    setTenths(Math.round(base * 10));
    setNote(data.day?.weight_note ?? '');
  }, [data, tenths]);

  if (!data || tenths === null) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const prev = [...data.weights].filter((w) => w.date < date).pop();
  const kg = tenths / 10;
  const delta = prev ? kg - prev.weight_kg : null;
  const recent = data.weights.filter((w) => w.date < date).slice(-5);
  const avg = avgAt(data.weights, date);

  const bump = (d: number) => { haptic(); setTenths((t) => (t ?? 0) + d); };
  const save = async () => {
    await setWeight(date, kg, note.trim() || null);
    haptic('success');
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 12, paddingBottom: ins.bottom + 24, paddingHorizontal: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Row style={{ justifyContent: 'space-between' }}>
        <IconBtn name="close" label="Close" onPress={() => router.back()} />
        <T.Label>MORNING WEIGH-IN</T.Label>
        <View style={{ width: 44 }} />
      </Row>

      <View style={{ alignItems: 'center', gap: 6, paddingTop: 16 }}>
        <T.Small>{`${dowShort(date)} ${dayMonth(date)} · after bathroom, before food`}</T.Small>
        <Pressable onPress={() => { setTyped(kg.toFixed(1)); setTyping(true); }} accessibilityLabel="Type weight">
          {typing ? (
            <TextInput
              autoFocus keyboardType="decimal-pad" value={typed} onChangeText={setTyped} selectionColor={C.lime}
              onBlur={() => { const v = parseFloat(typed.replace(',', '.')); if (v > 30 && v < 300) setTenths(Math.round(v * 10)); setTyping(false); }}
              style={{ fontFamily: F.display, fontSize: 120, color: C.text, textAlign: 'center', minWidth: 260 }}
            />
          ) : (
            <Row gap={8} style={{ alignItems: 'baseline' }}>
              <Text style={{ fontFamily: F.display, fontSize: 140, lineHeight: 140, color: C.text }}>
                {Math.floor(kg)}<Text style={{ color: C.lime }}>.{tenths % 10}</Text>
              </Text>
              <T.Body style={{ fontSize: 22, color: C.muted }}>kg</T.Body>
            </Row>
          )}
        </Pressable>
        {delta !== null ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1C1D18' }}>
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: delta <= 0 ? C.lime : C.orange }}>
              {`${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta).toFixed(1)} kg vs last weigh-in`}
            </Text>
          </View>
        ) : <T.Small>First weigh-in. This is your baseline.</T.Small>}
        <T.Small style={{ color: C.dim }}>Tap the number to type it</T.Small>
      </View>

      <Ruler tenths={tenths} />

      <Row gap={10}>
        <StepBtn label="−1.0" onPress={() => bump(-10)} />
        <StepBtn label="−0.1" onPress={() => bump(-1)} />
        <StepBtn label="+0.1" onPress={() => bump(1)} />
        <StepBtn label="+1.0" onPress={() => bump(10)} />
      </Row>

      <Field label="NOTE (OPTIONAL)" placeholder="late dinner, salty food, poor sleep…" value={note} onChangeText={setNote} />

      <Card style={{ gap: 10, padding: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Label>RECENT</T.Label>
          <T.Label>{avg ? `AVG ${avg.avg.toFixed(1)}` : ''}</T.Label>
        </Row>
        {recent.length ? (
          <Row style={{ justifyContent: 'space-between' }}>
            {recent.map((r) => (
              <View key={r.date} style={{ alignItems: 'center', gap: 4 }}>
                <T.Strong>{r.weight_kg.toFixed(1)}</T.Strong>
                <T.Small style={{ fontSize: 11 }}>{r.date === addDays(date, -1) ? 'Yday' : dowShort(r.date).slice(0, 1) + dowShort(r.date).slice(1).toLowerCase()}</T.Small>
              </View>
            ))}
          </Row>
        ) : <T.Small>No earlier weigh-ins yet.</T.Small>}
        <T.Small style={{ color: C.dim }}>Daily numbers bounce with water, salt and carbs. The app judges the 7-day average.</T.Small>
      </Card>

      <Btn title={`Save ${kg.toFixed(1)} kg`} onPress={save} />
      {data.day?.weight_kg != null ? <Btn title="Delete today's weigh-in" kind="danger" small onPress={async () => { await clearWeight(date); router.back(); }} /> : null}
    </ScrollView>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 18, borderWidth: 1, borderColor: C.line2, backgroundColor: pressed ? C.card2 : C.card, alignItems: 'center', justifyContent: 'center' })}>
      <Text style={{ color: C.text, fontFamily: F.mono, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

function Ruler({ tenths }: { tenths: number }) {
  const ticks = [];
  for (let i = -20; i <= 20; i++) {
    const v = tenths + i;
    const major = v % 10 === 0;
    const mid = v % 5 === 0;
    ticks.push(<View key={i} style={{ width: 2, height: major ? 44 : mid ? 30 : 20, borderRadius: 1, backgroundColor: major ? C.dim : C.line3 }} />);
  }
  return (
    <View style={{ height: 64, overflow: 'hidden', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 7 }}>{ticks}</View>
      <View style={{ position: 'absolute', left: '50%', marginLeft: -2, top: 4, width: 4, height: 56, borderRadius: 2, backgroundColor: C.lime }} />    </View>
  );
}
