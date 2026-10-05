import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, haptic, Icon, IconBtn, Row, Segmented, T } from './ui';
import { Food, FOOD_CATS, FOODS } from '../lib/foods';
import { MEALS, MealKey } from '../lib/plan';
import { C, F } from '../lib/theme';

export type Recent = { name: string; calories: number; protein_g: number };

function score(f: Food, words: string[]): number {
  const n = f.name.toLowerCase();
  const hay = `${n} ${f.cat.toLowerCase()}`;
  if (!words.every((w) => hay.includes(w))) return -1;
  let s = 0;
  if (n.startsWith(words[0])) s += 3;
  if (n.split(/[\s(,]+/).some((t) => t.startsWith(words[0]))) s += 2;
  return s - n.length / 100;
}

export function FoodPicker({ visible, onClose, onAdd, meal, setMeal, recents }: {
  visible: boolean; onClose: () => void; meal: MealKey; setMeal: (m: MealKey) => void; recents: Recent[];
  onAdd: (name: string, kcal: number, protein: number, meal: MealKey) => Promise<void>;
}) {
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [pick, setPick] = useState<Food | null>(null);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [cName, setCName] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [cProt, setCProt] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = cat ? FOODS.filter((f) => f.cat === cat) : FOODS;
    if (!words.length) return list;
    return list.map((f) => [f, score(f, words)] as const).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  }, [q, cat]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1600); };
  const close = () => { setPick(null); setCustom(false); setQ(''); setCat(null); onClose(); };
  const mealName = MEALS.find((m) => m.key === meal)?.name ?? '';

  const addPicked = async () => {
    if (!pick) return;
    const label = `${pick.name}${qty !== 1 ? ` ×${qty}` : ''}`;
    await onAdd(label, pick.kcal * qty, pick.protein * qty, meal);
    haptic('success');
    flash(`Added ${label} to ${mealName}`);
    setPick(null); setQty(1);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: ins.top + 12, paddingHorizontal: 20, gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T.Display style={{ fontSize: 24 }}>Add food</T.Display>
            <IconBtn name="close" label="Close" onPress={close} />
          </Row>
          <Segmented options={MEALS.map((m) => ({ key: m.key, label: m.name }))} value={meal} onChange={setMeal} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, borderWidth: 1, borderColor: C.line2, backgroundColor: C.card, paddingHorizontal: 14 }}>
            <SearchIcon />
            <TextInput value={q} onChangeText={setQ} placeholder={`Search ${FOODS.length.toLocaleString('en-US')} foods — roti, dal, egg…`} placeholderTextColor={C.dim}
              selectionColor={C.lime} autoCorrect={false} style={{ flex: 1, color: C.text, fontFamily: F.medium, fontSize: 16 }} />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={10}><Icon name="close" size={18} color={C.muted} /></Pressable> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} keyboardShouldPersistTaps="handled">
          {[null, ...FOOD_CATS].map((c) => {
            const on = c === cat;
            return (
              <Pressable key={c ?? 'all'} onPress={() => { haptic(); setCat(c); }} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? C.text : C.card, borderWidth: 1, borderColor: on ? C.text : C.line }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 14, color: on ? C.bg : C.text2 }}>{c ?? 'All'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlatList
          data={results}
          keyExtractor={(f) => String(f.id)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          contentContainerStyle={{ padding: 20, paddingBottom: ins.bottom + 40, gap: 8 }}
          ListHeaderComponent={!q && !cat && recents.length ? (
            <View style={{ gap: 8, marginBottom: 12 }}>
              <T.Strong>Recent — tap to add again</T.Strong>
              {recents.map((r) => (
                <Pressable key={r.name} onPress={async () => { await onAdd(r.name, r.calories, r.protein_g, meal); haptic('success'); flash(`Added ${r.name} to ${mealName}`); }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.8 : 1 })}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 16, color: C.text }} numberOfLines={1}>{r.name}</Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.muted }}>{`${r.calories} kcal · ${Math.round(r.protein_g)} g protein`}</Text>
                  </View>
                  <Icon name="plus" color={C.lime} width={2.4} />
                </Pressable>
              ))}
              <T.Strong style={{ marginTop: 8 }}>All foods</T.Strong>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={{ gap: 12, alignItems: 'flex-start' }}>
              <T.Body>{`No match for “${q}”.`}</T.Body>
              <Btn small kind="ghost" icon="edit" title="Add it as a custom food" onPress={() => { setCName(q); setCustom(true); }} />
            </View>
          }
          ListFooterComponent={results.length ? (
            <Pressable onPress={() => { setCName(q); setCustom(true); }} style={{ paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.lime }}>Can't find it? Add a custom food</Text>
            </Pressable>
          ) : null}
          renderItem={({ item: f }) => (
            <Pressable onPress={() => { haptic(); setQty(1); setPick(f); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 16, color: C.text }} numberOfLines={2}>{f.name}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: C.muted }} numberOfLines={1}>{f.serving}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}>{f.kcal} kcal</Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: f.protein >= 15 ? C.lime : C.muted }}>{`${f.protein} g protein`}</Text>
              </View>
            </Pressable>
          )}
        />

        {toast ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: ins.bottom + 24, padding: 14, borderRadius: 14, backgroundColor: C.lime }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.bg, textAlign: 'center' }} numberOfLines={2}>{toast}</Text>
          </View>
        ) : null}

        {/* serving sheet */}
        <Modal visible={!!pick} transparent animationType="fade" onRequestClose={() => setPick(null)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }} onPress={() => setPick(null)}>
            <Pressable onPress={() => {}} style={{ backgroundColor: '#121310', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: ins.bottom + 22, gap: 16, borderWidth: 1, borderColor: C.line2 }}>
              {pick ? (
                <>
                  <View style={{ gap: 4 }}>
                    <T.Display style={{ fontSize: 22 }}>{pick.name}</T.Display>
                    <T.Small>{`1 serving = ${pick.serving}`}</T.Small>
                  </View>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T.Strong>Servings</T.Strong>
                    <Row gap={10}>
                      <IconBtn name="minus" label="Less" onPress={() => setQty((x) => Math.max(0.5, +(x - 0.5).toFixed(1)))} />
                      <Text style={{ fontFamily: F.display, fontSize: 28, color: C.text, minWidth: 56, textAlign: 'center' }}>{qty}</Text>
                      <IconBtn name="plus" label="More" onPress={() => setQty((x) => Math.min(10, +(x + 0.5).toFixed(1)))} />
                    </Row>
                  </Row>
                  <Row gap={8}>
                    {[
                      ['Calories', `${Math.round(pick.kcal * qty)}`],
                      ['Protein', `${+(pick.protein * qty).toFixed(1)} g`],
                      ['Carbs', `${+(pick.carbs * qty).toFixed(1)} g`],
                      ['Fat', `${+(pick.fat * qty).toFixed(1)} g`],
                    ].map(([l, v]) => (
                      <View key={l} style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: C.card, gap: 2 }}>
                        <T.Small style={{ fontSize: 12.5 }}>{l}</T.Small>
                        <Text style={{ fontFamily: F.bold, fontSize: 17, color: l === 'Protein' ? C.lime : C.text }}>{v}</Text>
                      </View>
                    ))}
                  </Row>
                  <Btn title={`Add to ${mealName}`} icon="plus" onPress={addPicked} />
                  <T.Small style={{ textAlign: 'center', fontSize: 12.5 }}>Values are typical estimates — mess portions vary.</T.Small>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>

        {/* custom food */}
        <Modal visible={custom} transparent animationType="fade" onRequestClose={() => setCustom(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }} onPress={() => setCustom(false)}>
              <Pressable onPress={() => {}} style={{ backgroundColor: '#121310', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: ins.bottom + 22, gap: 14, borderWidth: 1, borderColor: C.line2 }}>
                <T.Display style={{ fontSize: 22 }}>Custom food</T.Display>
                <Input label="Name" value={cName} onChangeText={setCName} placeholder="e.g. Canteen sandwich" />
                <Row gap={10}>
                  <View style={{ flex: 1 }}><Input label="Calories" value={cKcal} onChangeText={setCKcal} keyboardType="number-pad" placeholder="kcal" /></View>
                  <View style={{ flex: 1 }}><Input label="Protein (g)" value={cProt} onChangeText={setCProt} keyboardType="decimal-pad" placeholder="g" /></View>
                </Row>
                <Btn title={`Add to ${mealName}`} disabled={!cName.trim() || !cKcal} onPress={async () => {
                  await onAdd(cName.trim(), parseFloat(cKcal) || 0, parseFloat(cProt.replace(',', '.')) || 0, meal);
                  haptic('success'); flash(`Added ${cName.trim()}`);
                  setCustom(false); setCName(''); setCKcal(''); setCProt('');
                }} />
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <T.Small>{label}</T.Small>
      <TextInput placeholderTextColor={C.dim} selectionColor={C.lime} {...rest}
        style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line2, backgroundColor: C.card, color: C.text, fontFamily: F.medium, fontSize: 16, paddingHorizontal: 14 }} />
    </View>
  );
}

function SearchIcon() {
  return <Icon name="search" size={20} color={C.muted} />;
}
