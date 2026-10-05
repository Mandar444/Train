import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, haptic, Header, Icon } from '../components/ui';
import { ExerciseThumb } from '../components/ExerciseAnim';
import { useQuery } from '../lib/hooks';
import { getWorkouts, saveWorkouts } from '../lib/repo';
import { EXERCISE_LIST, GROUPS, WorkoutType } from '../lib/plan';
import { scheme } from '../lib/logic';
import { C, F } from '../lib/theme';

export default function Library() {
  const ins = useSafeAreaInsets();
  const { pick } = useLocalSearchParams<{ pick?: WorkoutType }>();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string>('All');
  const { data: plan } = useQuery(getWorkouts, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return EXERCISE_LIST.filter((e) => (group === 'All' || e.group === group) && (!s || e.name.toLowerCase().includes(s) || e.equip.toLowerCase().includes(s) || e.group.toLowerCase().includes(s)));
  }, [q, group]);

  const inPlan = (t: WorkoutType, k: string) => !!plan?.[t].some((i) => i.key === k);
  const add = async (k: string) => {
    if (!plan || !pick) return;
    const e = EXERCISE_LIST.find((x) => x.key === k)!;
    const has = inPlan(pick, k);
    await saveWorkouts({ ...plan, [pick]: has ? plan[pick].filter((i) => i.key !== k) : [...plan[pick], { key: k, sets: e.sets, repMin: e.repMin, repMax: e.repMax }] });
    haptic(has ? 'light' : 'success');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 16 }}>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Header title={pick ? `Add to ${pick}` : 'Exercises'} kicker={`${EXERCISE_LIST.length} EXERCISES · EACH WITH A FORM GUIDE`} />
        <Field placeholder="Search: squat, cable, dumbbell, core…" value={q} onChangeText={setQ} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}>
        {['All', ...GROUPS].map((g) => {
          const on = g === group;
          return (
            <Pressable key={g} onPress={() => { haptic(); setGroup(g); }} style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.text : C.card, borderWidth: 1, borderColor: on ? C.text : C.line }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: on ? C.bg : C.text2 }}>{g}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={list}
        keyExtractor={(e) => e.key}
        contentContainerStyle={{ padding: 20, paddingBottom: ins.bottom + 40, gap: 8 }}
        initialNumToRender={10}
        windowSize={7}
        ListEmptyComponent={<Text style={{ color: C.dim, fontFamily: F.body }}>Nothing matches “{q}”.</Text>}
        renderItem={({ item: e }) => {
          const a = inPlan('A', e.key), b = inPlan('B', e.key);
          const picked = pick ? inPlan(pick, e.key) : false;
          return (
            <Pressable onPress={() => (pick ? add(e.key) : router.push({ pathname: '/history', params: { exercise: e.key } }))}
              onLongPress={() => router.push({ pathname: '/history', params: { exercise: e.key } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: picked ? '#161A10' : C.card, borderWidth: 1, borderColor: picked ? '#3A4A1C' : C.line, opacity: pressed ? 0.85 : 1 })}>
              <ExerciseThumb spec={e.anim} width={92} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }} numberOfLines={2}>{e.name}</Text>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{`${e.group} · ${e.equip}`}</Text>
                <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.dim }}>{scheme(e)}</Text>
              </View>
              {pick ? (
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: picked ? C.lime : 'transparent', borderWidth: 1, borderColor: picked ? C.lime : C.line3 }}>
                  <Icon name={picked ? 'check' : 'plus'} size={18} color={picked ? C.bg : C.lime} width={2.4} />
                </View>
              ) : (
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  {a ? <Badge t="A" /> : null}
                  {b ? <Badge t="B" /> : null}
                  {!a && !b ? <Icon name="chevron" size={18} color={C.faint} /> : null}
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Badge({ t }: { t: string }) {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.displayBold, fontSize: 14, color: C.bg }}>{t}</Text>
    </View>
  );
}
