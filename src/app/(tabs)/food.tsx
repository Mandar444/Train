import { useState } from 'react';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Bar, Btn, Card, Enter, Field, haptic, Icon, IconBtn, Row, Screen, Segmented, Sheet, T } from '../../components/ui';
import { useQuery } from '../../lib/hooks';
import * as repo from '../../lib/repo';
import { addDays, dayMonth, dowShort, mondayOf, parse, today, weekday } from '../../lib/dates';
import { MEALS, MealKey, Special } from '../../lib/plan';
import { fmt } from '../../lib/logic';
import { C, F } from '../../lib/theme';

function defaultMeal(): MealKey {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 19) return 'snacks';
  return 'dinner';
}

const DINNER: Record<Special | 'none', { text: string; items: [string, number, number][] }> = {
  chicken: { text: 'Chicken night. Chicken portion + dal + 2 roti ≈ 600 kcal · 45 g protein. Eat the chicken first.', items: [['Chicken portion', 250, 30], ['Dal katori', 150, 9], ['Roti ×2', 200, 6]] },
  eggs: { text: 'Egg night. Eggs ×2 + dal + curd + 2 roti ≈ 590 kcal · 33 g protein.', items: [['Eggs ×2', 140, 12], ['Dal katori', 150, 9], ['Curd bowl', 100, 6], ['Roti ×2', 200, 6]] },
  none: { text: 'Regular mess dinner. Dal ×2 + sabzi + curd + 2 roti ≈ 580 kcal · 28 g protein. Protein first.', items: [['Dal katori ×2', 300, 18], ['Sabzi katori', 80, 2], ['Curd bowl', 100, 6], ['Roti ×2', 200, 6]] },
};

export default function Food() {
  const { width } = useWindowDimensions();
  const [date, setDate] = useState(today());
  const [meal, setMeal] = useState<MealKey>(defaultMeal());
  const [custom, setCustom] = useState(false);
  const [cName, setCName] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [cProt, setCProt] = useState('');
  const [mult, setMult] = useState(1);

  const { data } = useQuery(async () => ({
    profile: await repo.getProfile(),
    meals: await repo.getMeals(date),
    presets: await repo.getPresets(),
    specials: await repo.getSpecials(),
  }), [date]);
  if (!data?.profile) return <Screen><View /></Screen>;

  const special = data.specials[weekday(date)] ?? null;
  const kcal = data.meals.reduce((s, m) => s + m.calories, 0);
  const prot = data.meals.reduce((s, m) => s + m.protein_g, 0);
  const left = data.profile.kcal_target - kcal;
  const monday = mondayOf(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const isToday = date === today();
  const quick = data.presets.filter((p) => !p.special || p.special === special);
  const chipW = (width - 40 - 8) / 2;
  const dinnerItems = data.meals.filter((m) => m.meal === 'dinner');
  const din = DINNER[special ?? 'none'];

  const add = async (name: string, kcalV: number, protV: number, m: MealKey = meal) => {
    haptic('success');
    await repo.addMeal(date, m, mult !== 1 ? `${name} ×${mult}` : name, kcalV * mult, protV * mult);
    setMult(1);
  };

  const specialCard = special === 'chicken'
    ? { title: 'Chicken tonight', text: 'Take a meaningful portion and prioritise it.', tone: 'orange' as const }
    : special === 'eggs'
      ? { title: 'Eggs tonight', text: 'Prioritise the eggs; top up with dal and curd.', tone: 'orange' as const }
      : { title: 'Regular mess day', text: 'No chicken or eggs. Lean on dal, rajma/chana, curd and milk.', tone: 'base' as const };

  return (
    <Screen>
      <Enter>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 6 }}>
            <T.Label>{isToday ? 'TODAY · HOSTEL MESS' : `${dowShort(date)} ${dayMonth(date).toUpperCase()}`}</T.Label>
            <T.Display>Food</T.Display>
          </View>
          <Row gap={6}>
            <IconBtn name="back" label="Previous week" onPress={() => setDate(addDays(date, -7))} />
            <IconBtn name="chevron" label="Next week" onPress={() => setDate(addDays(date, 7) > today() ? today() : addDays(date, 7))} />
          </Row>
        </Row>
      </Enter>

      <Enter delay={60}>
        <Row gap={4}>
          {week.map((d) => {
            const sel = d === date;
            const future = d > today();
            const sp = data.specials[weekday(d)];
            return (
              <Pressable key={d} disabled={future} onPress={() => { haptic(); setDate(d); }}
                style={{ flex: 1, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: sel ? C.text : C.card, borderWidth: 1, borderColor: sel ? C.text : C.line, opacity: future ? 0.4 : 1 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 11, color: sel ? C.bg : d === today() ? C.lime : C.text2 }}>{dowShort(d)}</Text>
                <Text style={{ fontFamily: F.displayBold, fontSize: 20, color: sel ? C.bg : C.text }}>{parse(d).getDate()}</Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sp ? C.orange : 'transparent' }} />
              </Pressable>
            );
          })}
        </Row>
      </Enter>

      <Card tone={specialCard.tone} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: special ? C.orange : C.lime, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bowl" color={C.bg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T.Strong>{specialCard.title}</T.Strong>
          <T.Small style={{ color: special ? '#C9B8A6' : C.muted }}>{specialCard.text}</T.Small>
        </View>
      </Card>

      <Card style={{ gap: 14, padding: 20 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 4 }}>
            <T.Label>CALORIES</T.Label>
            <Row gap={6} style={{ alignItems: 'baseline' }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 56, lineHeight: 56, color: C.text }}>{fmt(kcal)}</Text>
              <T.Small style={{ fontSize: 14 }}>/ {fmt(data.profile.kcal_target)}</T.Small>
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.displayBold, fontSize: 28, color: left >= 0 ? C.lime : C.orange }}>{fmt(Math.abs(left))}</Text>
            <T.Small>{left >= 0 ? 'kcal left' : 'kcal over'}</T.Small>
          </View>
        </Row>
        <Bar pct={kcal / data.profile.kcal_target} color={C.text} height={10} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Label>PROTEIN</T.Label>
          <T.Small><Text style={{ color: C.orange, fontFamily: F.bold }}>{Math.round(prot)} g</Text> / {data.profile.protein_min}–{data.profile.protein_max} g</T.Small>
        </Row>
        <Bar pct={prot / data.profile.protein_max} color={C.orange} height={10} marker={data.profile.protein_min / data.profile.protein_max} />
      </Card>

      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Label>{special === 'chicken' ? 'QUICK ADD · CHICKEN NIGHT' : special === 'eggs' ? 'QUICK ADD · EGG NIGHT' : 'QUICK ADD · REGULAR MESS'}</T.Label>
          <Pressable onPress={() => setMult(mult === 1 ? 2 : mult === 2 ? 0.5 : 1)} hitSlop={8}>
            <Text style={{ fontFamily: F.monoBold, fontSize: 12, color: mult === 1 ? C.muted : C.lime }}>{mult === 1 ? 'PORTION ×1' : `PORTION ×${mult}`}</Text>
          </Pressable>
        </Row>
        <Segmented options={MEALS.map((m) => ({ key: m.key, label: m.name }))} value={meal} onChange={setMeal} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {quick.map((q) => (
            <Pressable key={q.id} onPress={() => add(q.name, q.calories, q.protein_g, q.special ? 'dinner' : meal)}
              style={({ pressed }) => ({ width: chipW, minHeight: 54, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: q.special ? '#5A3A22' : C.line, backgroundColor: q.special ? C.orangeSoft : C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 13, color: C.text }}>{q.name}</Text>
                <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{q.calories} kcal · {q.protein_g} g</Text>
              </View>
              <Icon name="plus" size={16} color={q.special ? C.orange : C.lime} width={2.2} />
            </Pressable>
          ))}
          <Pressable onPress={() => setCustom(true)} style={{ width: chipW, minHeight: 54, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line3, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
            <Icon name="edit" size={16} color={C.muted} />
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.muted }}>Custom item</Text>
          </Pressable>
        </View>
        {special ? <T.Small style={{ color: C.dim }}>Specials always go into Dinner.</T.Small> : null}
      </View>

      {MEALS.map((m) => {
        const items = data.meals.filter((x) => x.meal === m.key);
        const mk = items.reduce((s, x) => s + x.calories, 0);
        const mp = items.reduce((s, x) => s + x.protein_g, 0);
        return (
          <Card key={m.key} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            <Row style={{ justifyContent: 'space-between', padding: 16 }}>
              <T.Strong>{m.name}</T.Strong>
              <T.Mono>{fmt(mk)} kcal · {Math.round(mp)} g</T.Mono>
            </Row>
            {items.map((it) => (
              <Pressable key={it.id} onLongPress={() => Alert.alert('Remove item?', it.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => repo.deleteMeal(it.id) }])}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 44, borderTopWidth: 1, borderTopColor: '#21221C' }}>
                <T.Body style={{ flex: 1, fontSize: 14, color: C.text2 }}>{it.name}</T.Body>
                <T.Mono style={{ fontSize: 12, color: C.muted }}>{it.calories} · {Math.round(it.protein_g)}g</T.Mono>
                <Pressable onPress={() => repo.deleteMeal(it.id)} hitSlop={10} style={{ marginLeft: 10 }} accessibilityLabel={`Remove ${it.name}`}>
                  <Icon name="close" size={14} color={C.faint} />
                </Pressable>
              </Pressable>
            ))}
            {m.key === 'dinner' && dinnerItems.length === 0 ? (
              <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: special ? C.orangeLine : '#2C3320', backgroundColor: special ? C.orangeSoft : '#161A10' }}>
                <T.Small style={{ color: C.orangeText, fontSize: 13 }}>{din.text}</T.Small>
                <Btn small title="Log suggested dinner" kind={special ? 'orange' : 'primary'} style={{ alignSelf: 'flex-start' }}
                  onPress={async () => { for (const [n, k, p] of din.items) await repo.addMeal(date, 'dinner', n, k, p); haptic('success'); }} />
              </View>
            ) : null}
            {items.length === 0 && m.key !== 'dinner' ? <T.Small style={{ paddingHorizontal: 16, paddingBottom: 14, color: C.dim }}>Nothing logged yet.</T.Small> : null}
          </Card>
        );
      })}

      <T.Small style={{ color: C.dim }}>Long-press or tap × to remove an item. Edit portions and the mess menu in Settings. Small items count; log them honestly.</T.Small>

      <Sheet visible={custom} onClose={() => setCustom(false)} title="Custom item">
        <Field label="WHAT" placeholder="e.g. Samosa" value={cName} onChangeText={setCName} />
        <Row gap={10}>
          <Field label="KCAL" keyboardType="number-pad" value={cKcal} onChangeText={setCKcal} style={{ flex: 1 }} />
          <Field label="PROTEIN (G)" keyboardType="decimal-pad" value={cProt} onChangeText={setCProt} style={{ flex: 1 }} />
        </Row>
        <T.Small>Adds to {MEALS.find((m) => m.key === meal)?.name}. A rough estimate is better than nothing.</T.Small>
        <Btn title="Add" disabled={!cName.trim() || !cKcal} onPress={async () => {
          await add(cName.trim(), parseFloat(cKcal) || 0, parseFloat(cProt.replace(',', '.')) || 0);
          setCName(''); setCKcal(''); setCProt(''); setCustom(false);
        }} />
        <Btn title="Save as quick-add preset too" kind="ghost" small disabled={!cName.trim() || !cKcal} onPress={async () => {
          await repo.savePreset({ name: cName.trim(), calories: parseFloat(cKcal) || 0, protein_g: parseFloat(cProt.replace(',', '.')) || 0 });
          haptic('success');
        }} />
      </Sheet>
    </Screen>
  );
}
