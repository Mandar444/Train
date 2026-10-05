import { useState } from 'react';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Bar, Btn, Card, Enter, haptic, Icon, IconBtn, Press, Row, Screen, T } from '../../components/ui';
import { Ring } from '../../components/charts';
import { FoodPicker } from '../../components/FoodPicker';
import { CalendarSheet } from '../../components/Calendar';
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

function Chip({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, gap: 2 }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.dim }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 21, color: accent ? C.lime : C.text, letterSpacing: -0.4 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: C.dim, letterSpacing: 0 }}>{` ${unit}`}</Text>
      </Text>
    </View>
  );
}

export default function Food() {
  const { width } = useWindowDimensions();
  const [date, setDate] = useState(today());
  const [meal, setMeal] = useState<MealKey>(defaultMeal());
  const [open, setOpen] = useState(false);
  const [cal, setCal] = useState(false);

  const { data } = useQuery(async () => ({
    profile: await repo.getProfile(),
    meals: await repo.getMeals(date),
    presets: await repo.getPresets(),
    specials: await repo.getSpecials(),
    recents: await repo.recentFoods(8),
  }), [date]);
  if (!data?.profile) return <Screen><View /></Screen>;

  const p = data.profile;
  const special = data.specials[weekday(date)] ?? null;
  const kcal = data.meals.reduce((s, m) => s + m.calories, 0);
  const prot = data.meals.reduce((s, m) => s + m.protein_g, 0);
  const target = p.kcal_target;
  const left = target - kcal;
  const over = left < 0;
  const isToday = date === today();
  const quick = data.presets.filter((q) => !q.special || q.special === special);
  const dayLabel = isToday ? 'Today' : date === addDays(today(), -1) ? 'Yesterday' : `${dowShort(date).slice(0, 1)}${dowShort(date).slice(1).toLowerCase()} ${dayMonth(date)}`;
  const ringSize = Math.min(260, width - 80);
  const protLeft = Math.max(0, p.protein_min - prot);

  const add = async (name: string, k: number, pr: number, m: MealKey) => { await repo.addMeal(date, m, name, k, pr); };
  const openFor = (m: MealKey) => { setMeal(m); setOpen(true); };
  const remove = (id: number, name: string) =>
    Alert.alert('Remove this item?', name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => repo.deleteMeal(id) }]);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
        <T.Display>Food</T.Display>
        <Row gap={6}>
          <IconBtn name="back" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
          <Press accessibilityLabel="Pick a day" onPress={() => { haptic(); setCal(true); }} scaleTo={0.94}
            style={{ minWidth: 100, height: 44, borderRadius: 22, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 }}>
            <Icon name="calendar" size={16} color={C.lime} />
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.text }}>{dayLabel}</Text>
          </Press>
          <IconBtn name="chevron" label="Next day" onPress={() => !isToday && setDate(addDays(date, 1))} color={isToday ? C.faint : C.text} />
        </Row>
      </Row>

      <Enter delay={0} style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Ring size={ringSize} stroke={20} pct={kcal / target} color={over ? C.text : C.lime}>
          <T.Small style={{ fontSize: 14, color: over ? C.text : C.dim }}>{over ? 'Over by' : 'Left today'}</T.Small>
          <Text style={{ fontFamily: F.display, fontSize: ringSize < 230 ? 48 : 56, color: C.text, letterSpacing: -1 }}>{fmt(Math.abs(left))}</Text>
          <T.Small style={{ fontSize: 15 }}>{`${fmt(kcal)} of ${fmt(target)} kcal`}</T.Small>
        </Ring>
      </Enter>

      <Enter delay={60}>
        <Row gap={8}>
          <Chip label="Eaten" value={fmt(kcal)} unit="kcal" />
          <Chip label={over ? 'Over' : 'Left'} value={fmt(Math.abs(left))} unit="kcal" accent={!over} />
          <Chip label="Protein" value={String(Math.round(prot))} unit="g" accent={prot >= p.protein_min} />
        </Row>
      </Enter>

      <Enter delay={110}>
        <Card style={{ gap: 10, padding: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={8}><Icon name="protein" size={18} color={C.lime} /><T.Strong>Protein</T.Strong></Row>
            <T.Small><Text style={{ color: C.lime, fontFamily: F.bold }}>{`${Math.round(prot)} g`}</Text>{` of ${p.protein_min} to ${p.protein_max} g`}</T.Small>
          </Row>
          <Bar pct={prot / p.protein_max} color={C.lime} height={8} marker={p.protein_min / p.protein_max} />
          <T.Small style={{ fontSize: 13 }}>{protLeft > 0 ? `${Math.round(protLeft)} g more to reach your minimum. The white line marks it.` : 'Minimum reached. Anything up to the top of the range is a bonus.'}</T.Small>
        </Card>
      </Enter>

      <Enter delay={150}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: '#2C3320', backgroundColor: '#12150D' }}>
          <Icon name="flame" size={20} color={C.lime} />
          <View style={{ flex: 1, gap: 1 }}>
            <T.Small style={{ fontSize: 12.5, color: C.dim }}>Your daily plan, aggressive cut</T.Small>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>
              {`${fmt(target)} kcal`}<Text style={{ color: C.dim }}>{'  ·  '}</Text>{`${p.protein_min} to ${p.protein_max} g protein`}
            </Text>
          </View>
        </View>
      </Enter>

      <Enter delay={190}>
        <Btn title="Search and add food" icon="search" onPress={() => openFor(isToday ? defaultMeal() : meal)} />
      </Enter>

      <Enter delay={230} style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.Strong>Mess quick add</T.Strong>
          {special ? <T.Small style={{ color: C.lime, fontFamily: F.semibold, fontSize: 13 }}>{special === 'chicken' ? 'Chicken night' : 'Egg night'}</T.Small> : <T.Small style={{ fontSize: 13 }}>Tap to log</T.Small>}
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {quick.map((q) => {
            const sp = !!q.special;
            return (
              <Press key={q.id} accessibilityLabel={`Add ${q.name}`} scaleTo={0.94}
                onPress={async () => { await add(q.name, q.calories, q.protein_g, sp ? 'dinner' : defaultMeal()); haptic('success'); }}
                style={{ width: 138, minHeight: 92, padding: 12, borderRadius: 18, backgroundColor: sp ? '#12150D' : C.card, borderWidth: sp ? 1.5 : 1, borderColor: sp ? C.lime : C.line, justifyContent: 'space-between', gap: 8 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={6}>
                  <Text style={{ flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.text, lineHeight: 18 }} numberOfLines={2}>{q.name}</Text>
                  <Icon name="plus" size={16} color={C.lime} width={2.4} />
                </Row>
                <View style={{ gap: 4 }}>
                  {sp ? (
                    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: C.lime }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.bg }}>Tonight</Text>
                    </View>
                  ) : null}
                  <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.muted }} numberOfLines={1}>{`${q.calories} kcal · ${q.protein_g} g`}</Text>
                </View>
              </Press>
            );
          })}
        </ScrollView>
      </Enter>

      <View style={{ gap: 8 }}>
        <T.Strong style={{ marginTop: 4 }}>Meals</T.Strong>
        {MEALS.map((m, i) => {
          const items = data.meals.filter((x) => x.meal === m.key);
          if (!items.length) {
            return (
              <Enter key={m.key} delay={270 + i * 40}>
                <Press accessibilityLabel={`Add ${m.name.toLowerCase()}`} onPress={() => { haptic(); openFor(m.key); }} scaleTo={0.98}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={16} color={C.lime} width={2.4} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: F.semibold, fontSize: 15, color: C.text2 }}>{`Add ${m.name.toLowerCase()}`}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.faint }}>Empty</Text>
                </Press>
              </Enter>
            );
          }
          const mk = items.reduce((s, x) => s + x.calories, 0);
          const mp = items.reduce((s, x) => s + x.protein_g, 0);
          return (
            <Enter key={m.key} delay={270 + i * 40}>
              <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
                <Row style={{ justifyContent: 'space-between', paddingLeft: 16, paddingRight: 12, paddingVertical: 12 }}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <T.Strong style={{ fontSize: 17 }}>{m.name}</T.Strong>
                    <T.Small style={{ fontSize: 13 }}>
                      <Text style={{ color: C.text, fontFamily: F.bold }}>{`${fmt(mk)} kcal`}</Text>{'  ·  '}<Text style={{ color: C.lime, fontFamily: F.semibold }}>{`${Math.round(mp)} g protein`}</Text>
                    </T.Small>
                  </View>
                  <Press accessibilityLabel={`Add to ${m.name.toLowerCase()}`} onPress={() => { haptic(); openFor(m.key); }} scaleTo={0.92}
                    style={{ height: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.limeSoft, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name="plus" size={15} color={C.lime} width={2.6} />
                    <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: C.lime }}>Add</Text>
                  </Press>
                </Row>
                {items.map((it) => (
                  <Row key={it.id} gap={10} style={{ paddingLeft: 16, paddingRight: 12, minHeight: 54, borderTopWidth: 1, borderTopColor: '#21221C' }}>
                    <View style={{ flex: 1, paddingVertical: 9, gap: 1 }}>
                      <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.text }} numberOfLines={2}>{it.name}</Text>
                      <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.dim }}>{`${it.calories} kcal · ${Math.round(it.protein_g)} g protein`}</Text>
                    </View>
                    <Press accessibilityLabel={`Remove ${it.name}`} hitSlop={8} onPress={() => { haptic(); remove(it.id, it.name); }} scaleTo={0.88}
                      style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 }}>
                      <Icon name="trash" size={16} color={C.dim} />
                    </Press>
                  </Row>
                ))}
              </Card>
            </Enter>
          );
        })}
      </View>

      <T.Small style={{ textAlign: 'center', fontSize: 12.5, color: C.dim, paddingHorizontal: 8 }}>
        Values come from INDB, IFCT and USDA where available. Mess portions vary, so weigh your food or estimate honestly.
      </T.Small>

      <CalendarSheet visible={cal} value={date} onPick={setDate} onClose={() => setCal(false)} target={target} startDate={p.start_date} />
      <FoodPicker visible={open} onClose={() => setOpen(false)} meal={meal} setMeal={setMeal} recents={data.recents} onAdd={add} />
    </Screen>
  );
}
