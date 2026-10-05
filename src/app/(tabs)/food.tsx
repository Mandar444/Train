import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Bar, Btn, Card, haptic, Icon, IconBtn, Row, Screen, T } from '../../components/ui';
import { FoodPicker } from '../../components/FoodPicker';
import { useQuery } from '../../lib/hooks';
import * as repo from '../../lib/repo';
import { addDays, dayMonth, dowShort, today, weekday } from '../../lib/dates';
import { MEALS, MealKey } from '../../lib/plan';
import { fmt } from '../../lib/logic';
import { C, F } from '../../lib/theme';

function defaultMeal(): MealKey {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 19) return 'snacks';
  return 'dinner';
}

export default function Food() {
  const [date, setDate] = useState(today());
  const [meal, setMeal] = useState<MealKey>(defaultMeal());
  const [open, setOpen] = useState(false);

  const { data } = useQuery(async () => ({
    profile: await repo.getProfile(),
    meals: await repo.getMeals(date),
    presets: await repo.getPresets(),
    specials: await repo.getSpecials(),
    recents: await repo.recentFoods(8),
  }), [date]);
  if (!data?.profile) return <Screen><View /></Screen>;

  const special = data.specials[weekday(date)] ?? null;
  const kcal = data.meals.reduce((s, m) => s + m.calories, 0);
  const prot = data.meals.reduce((s, m) => s + m.protein_g, 0);
  const target = data.profile.kcal_target;
  const left = target - kcal;
  const isToday = date === today();
  const quick = data.presets.filter((p) => !p.special || p.special === special);
  const dayLabel = isToday ? 'Today' : date === addDays(today(), -1) ? 'Yesterday' : `${dowShort(date).slice(0, 1)}${dowShort(date).slice(1).toLowerCase()} ${dayMonth(date)}`;

  const add = async (name: string, k: number, p: number, m: MealKey) => { await repo.addMeal(date, m, name, k, p); };
  const openFor = (m: MealKey) => { setMeal(m); setOpen(true); };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
        <T.Display>Food</T.Display>
        <Row gap={6}>
          <IconBtn name="back" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
          <Pressable onPress={() => setDate(today())} style={{ minWidth: 92, height: 44, borderRadius: 22, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.text }}>{dayLabel}</Text>
          </Pressable>
          <IconBtn name="chevron" label="Next day" onPress={() => !isToday && setDate(addDays(date, 1))} color={isToday ? C.faint : C.text} />
        </Row>
      </Row>

      <Card style={{ gap: 14, padding: 20 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 2 }}>
            <T.Small>Eaten</T.Small>
            <Text style={{ fontFamily: F.display, fontSize: 40, color: C.text, letterSpacing: -1 }}>{fmt(kcal)}<Text style={{ fontSize: 16, color: C.muted, fontFamily: F.semibold }}> kcal</Text></Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <T.Small>{left >= 0 ? 'Left' : 'Over'}</T.Small>
            <Text style={{ fontFamily: F.display, fontSize: 28, color: left >= 0 ? C.lime : C.orange }}>{fmt(Math.abs(left))}</Text>
          </View>
        </Row>
        <Bar pct={kcal / target} color={left >= 0 ? C.text : C.orange} height={10} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Strong>Protein</T.Strong>
          <T.Small><Text style={{ color: C.orange, fontFamily: F.bold }}>{Math.round(prot)} g</Text>{` of ${data.profile.protein_min}–${data.profile.protein_max} g`}</T.Small>
        </Row>
        <Bar pct={prot / data.profile.protein_max} color={C.orange} height={10} marker={data.profile.protein_min / data.profile.protein_max} />
      </Card>

      <Btn title="Search & add food" icon="search" onPress={() => openFor(isToday ? defaultMeal() : meal)} />

      {special ? (
        <Card tone="orange" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="bowl" color={C.orange} size={22} />
          <T.Body style={{ flex: 1, color: C.orangeText, fontSize: 15 }}>{special === 'chicken' ? 'Chicken night at the mess — add your portion below.' : 'Egg night at the mess — add your eggs below.'}</T.Body>
        </Card>
      ) : null}

      <View style={{ gap: 8 }}>
        <T.Strong>Mess quick add</T.Strong>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
          <View style={{ width: 12 }} />
          {quick.map((q) => (
            <Pressable key={q.id} onPress={async () => { await add(q.name, q.calories, q.protein_g, q.special ? 'dinner' : defaultMeal()); haptic('success'); }}
              style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: q.special ? C.orangeSoft : C.card, borderWidth: 1, borderColor: q.special ? '#5A3A22' : C.line, opacity: pressed ? 0.8 : 1, gap: 2 })}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text }}>{`+ ${q.name}`}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.muted }}>{`${q.calories} kcal · ${q.protein_g} g`}</Text>
            </Pressable>
          ))}
          <View style={{ width: 12 }} />
        </ScrollView>
      </View>

      {MEALS.map((m) => {
        const items = data.meals.filter((x) => x.meal === m.key);
        const mk = items.reduce((s, x) => s + x.calories, 0);
        return (
          <Card key={m.key} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
              <View>
                <T.Strong style={{ fontSize: 17 }}>{m.name}</T.Strong>
                <T.Small>{items.length ? `${fmt(mk)} kcal · ${Math.round(items.reduce((s, x) => s + x.protein_g, 0))} g protein` : 'Nothing yet'}</T.Small>
              </View>
              <Pressable onPress={() => openFor(m.key)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.card2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="plus" size={16} color={C.lime} width={2.4} />
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.text }}>Add</Text>
              </Pressable>
            </Row>
            {items.map((it) => (
              <Row key={it.id} gap={10} style={{ paddingHorizontal: 16, minHeight: 52, borderTopWidth: 1, borderTopColor: '#21221C' }}>
                <View style={{ flex: 1, paddingVertical: 8 }}>
                  <T.Body style={{ fontSize: 15 }} numberOfLines={2}>{it.name}</T.Body>
                  <T.Small style={{ fontSize: 13 }}>{`${it.calories} kcal · ${Math.round(it.protein_g)} g protein`}</T.Small>
                </View>
                <Pressable accessibilityLabel={`Remove ${it.name}`} hitSlop={10} onPress={() => Alert.alert('Remove?', it.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => repo.deleteMeal(it.id) }])}
                  style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 }}>
                  <Icon name="trash" size={16} color={C.muted} />
                </Pressable>
              </Row>
            ))}
          </Card>
        );
      })}

      <T.Small style={{ textAlign: 'center' }}>Calories are estimates for typical portions. Close enough is good enough — just log honestly.</T.Small>

      <FoodPicker visible={open} onClose={() => setOpen(false)} meal={meal} setMeal={setMeal} recents={data.recents} onAdd={add} />
    </Screen>
  );
}
