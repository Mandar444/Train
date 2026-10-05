import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, haptic, Icon, IconBtn, Press, Row, Segmented, T } from './ui';
import { Food, FOOD_CATS, FOODS } from '../lib/foods';
import { MEALS, MealKey } from '../lib/plan';
import { C, F } from '../lib/theme';

export type Recent = { name: string; calories: number; protein_g: number };

type FoodX = Food & { src?: string; kw?: string };

const SOURCES: Record<string, string> = {
  INDB: 'INDB 2024',
  IFCT: 'IFCT 2017 (NIN)',
  USDA: 'USDA FoodData Central',
  label: 'Nutrition label',
  recipe: 'Calculated from a standard recipe',
};

export function sourceLabel(src?: string): string | null {
  if (!src) return null;
  return `Source: ${SOURCES[src] ?? src}`;
}

/** Lowercase, drop punctuation, collapse doubled letters so "arrabbiata" and "arabiata" look the same. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/([a-z])\1+/g, '$1').trim();
}

/** True when a and b differ by at most one insert, delete or substitution. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

type Indexed = { f: FoodX; name: string; nameTok: string[]; extraTok: string[]; hay: string };
let INDEX: Indexed[] | null = null;
function index(): Indexed[] {
  if (INDEX) return INDEX;
  INDEX = (FOODS as FoodX[]).map((f) => {
    const name = norm(f.name);
    const extra = norm(`${f.kw ?? ''} ${f.cat}`);
    const nameTok = name.split(' ').filter(Boolean);
    const extraTok = extra.split(' ').filter(Boolean);
    return { f, name, nameTok, extraTok, hay: `${name} ${extra}` };
  });
  return INDEX;
}

/** How well one query word matches one token. 0 means no match. */
function tokScore(w: string, t: string): number {
  if (t === w) return 4;
  if (t.startsWith(w)) return 3;
  if (w.length >= 4) {
    if (near(w, t)) return 2;
    for (let n = w.length - 1; n <= w.length + 1; n++) if (n < t.length && near(w, t.slice(0, n))) return 1.5;
  }
  return 0;
}

function score(x: Indexed, words: string[]): number {
  let total = 0;
  for (const w of words) {
    let best = 0;
    for (const t of x.nameTok) best = Math.max(best, tokScore(w, t) * 1.25);
    if (best < 5) for (const t of x.extraTok) best = Math.max(best, tokScore(w, t));
    if (!best && w.length >= 3 && x.hay.includes(w)) best = 1;
    if (!best) return -1;
    total += best;
  }
  if (x.name.startsWith(words[0])) total += 3;
  return total - x.name.length / 100;
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
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return cat ? FOODS.filter((f) => f.cat === cat) : FOODS;
    const list = cat ? index().filter((x) => x.f.cat === cat) : index();
    return list.map((x) => [x.f as Food, score(x, words)] as const).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  }, [q, cat]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1600); };
  const close = () => { setPick(null); setCustom(false); setQ(''); setCat(null); onClose(); };
  const mealName = MEALS.find((m) => m.key === meal)?.name ?? '';

  const addPicked = async () => {
    if (!pick) return;
    const label = `${pick.name}${qty !== 1 ? ` x${qty}` : ''}`;
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, borderWidth: 1, borderColor: q ? C.lime : C.line2, backgroundColor: C.card, paddingHorizontal: 14 }}>
            <SearchIcon />
            <TextInput value={q} onChangeText={setQ} placeholder={`Search ${FOODS.length.toLocaleString('en-US')} foods, e.g. roti, dal, egg`} placeholderTextColor={C.dim}
              selectionColor={C.lime} autoCorrect={false} style={{ flex: 1, color: C.text, fontFamily: F.medium, fontSize: 16 }} />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={10}><Icon name="close" size={18} color={C.muted} /></Pressable> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} keyboardShouldPersistTaps="handled">
          {[null, ...FOOD_CATS].map((c) => {
            const on = c === cat;
            return (
              <Press key={c ?? 'all'} scaleTo={0.92} onPress={() => { haptic(); setCat(on ? null : c); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? C.lime : C.card, borderWidth: 1, borderColor: on ? C.lime : C.line }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: on ? C.bg : C.text2 }}>{c ?? 'All'}</Text>
              </Press>
            );
          })}
        </ScrollView>

        <FlatList
          data={results}
          keyExtractor={(f) => String(f.id)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={9}
          updateCellsBatchingPeriod={30}
          removeClippedSubviews
          contentContainerStyle={{ padding: 20, paddingBottom: ins.bottom + 40, gap: 8 }}
          ListHeaderComponent={!q && !cat && recents.length ? (
            <View style={{ gap: 8, marginBottom: 12 }}>
              <T.Strong>Recent, tap to add again</T.Strong>
              {recents.map((r) => (
                <Press key={r.name} scaleTo={0.98} onPress={async () => { await onAdd(r.name, r.calories, r.protein_g, meal); haptic('success'); flash(`Added ${r.name} to ${mealName}`); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 16, color: C.text }} numberOfLines={1}>{r.name}</Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.muted }}>{`${r.calories} kcal · ${Math.round(r.protein_g)} g protein`}</Text>
                  </View>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.limeSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={16} color={C.lime} width={2.4} />
                  </View>
                </Press>
              ))}
              <T.Strong style={{ marginTop: 8 }}>All foods</T.Strong>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={{ gap: 12, alignItems: 'flex-start' }}>
              <T.Body>{`No match for "${q}". Try a shorter word, or add it yourself.`}</T.Body>
              <Btn small kind="ghost" icon="edit" title="Add it as a custom food" onPress={() => { setCName(q); setCustom(true); }} />
            </View>
          }
          ListFooterComponent={results.length ? (
            <Press onPress={() => { haptic(); setCName(q); setCustom(true); }} style={{ paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.lime }}>Can't find it? Add a custom food</Text>
            </Press>
          ) : null}
          renderItem={({ item: f }) => (
            <Press onPress={() => { haptic(); setQty(1); setPick(f); }} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 15.5, color: C.text }} numberOfLines={2}>{f.name}</Text>
                <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.dim }} numberOfLines={1}>{f.serving}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15.5, color: C.text }}>{`${f.kcal} kcal`}</Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 13, color: f.protein >= 15 ? C.lime : C.dim }}>{`${f.protein} g protein`}</Text>
              </View>
            </Press>
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
                  <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line3, marginTop: -8 }} />
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
                      <View key={l} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: l === 'Protein' ? '#2C3320' : C.line, gap: 2 }}>
                        <T.Small style={{ fontSize: 12 }}>{l}</T.Small>
                        <Text style={{ fontFamily: F.bold, fontSize: 16, color: l === 'Protein' ? C.lime : C.text }} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                      </View>
                    ))}
                  </Row>
                  {sourceLabel((pick as FoodX).src) ? <T.Small style={{ fontSize: 12.5, color: C.dim, marginTop: -6 }}>{sourceLabel((pick as FoodX).src)}</T.Small> : null}
                  <Btn title={`Add to ${mealName}`} icon="plus" onPress={addPicked} />
                  <T.Small style={{ textAlign: 'center', fontSize: 12.5 }}>Mess portions vary, so adjust servings to what is on your plate.</T.Small>
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
