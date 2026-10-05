import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Header, haptic, Icon, Row, Screen, Segmented, T } from '../components/ui';
import { ExerciseThumb } from '../components/ExerciseAnim';
import { useQuery } from '../lib/hooks';
import { defaultPlan, getWorkouts, saveWorkouts } from '../lib/repo';
import { EXERCISES, PlanItem, WorkoutType } from '../lib/plan';
import { C, F } from '../lib/theme';

export default function WorkoutEdit() {
  const params = useLocalSearchParams<{ type?: WorkoutType }>();
  const [type, setType] = useState<WorkoutType>(params.type === 'B' ? 'B' : 'A');
  const { data: plan } = useQuery(getWorkouts, []);
  const [items, setItems] = useState<PlanItem[] | null>(null);

  useEffect(() => { if (plan) setItems(plan[type]); }, [plan, type]);
  if (!plan || !items) return <Screen><View /></Screen>;

  const commit = async (next: PlanItem[]) => { setItems(next); await saveWorkouts({ ...plan, [type]: next }); };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = items.slice(); [n[i], n[j]] = [n[j], n[i]];
    haptic(); commit(n);
  };
  const patch = (i: number, p: Partial<PlanItem>) => {
    const n = items.slice(); n[i] = { ...n[i], ...p };
    if (n[i].repMin > n[i].repMax) n[i].repMax = n[i].repMin;
    commit(n);
  };

  return (
    <Screen bottomPad={40}>
      <Header title="Edit workouts" kicker="ADD · REMOVE · REORDER" />
      <Segmented options={[{ key: 'A', label: 'Full Body A' }, { key: 'B', label: 'Full Body B' }]} value={type} onChange={(k) => setType(k as WorkoutType)} />
      <T.Small>Workouts alternate A → B → A on Mon / Wed / Fri. Changes apply from your next session.</T.Small>

      {items.map((it, i) => {
        const d = EXERCISES[it.key];
        const u = d.unit === 'sec' ? 's' : d.unit === 'min' ? 'min' : 'reps';
        return (
          <Card key={`${it.key}-${i}`} style={{ padding: 12, gap: 10 }}>
            <Row gap={12}>
              <Pressable onPress={() => router.push({ pathname: '/history', params: { exercise: it.key } })}>
                <ExerciseThumb spec={d.anim} width={84} />
              </Pressable>
              <View style={{ flex: 1, gap: 3 }}>
                <T.Strong numberOfLines={2}>{`${i + 1}. ${d.name}`}</T.Strong>
                <T.Small>{`${d.group} · ${d.equip}`}</T.Small>
              </View>
              <View style={{ gap: 4 }}>
                <Mini icon="up" label="Move up" onPress={() => move(i, -1)} disabled={i === 0} />
                <Mini icon="down" label="Move down" onPress={() => move(i, 1)} disabled={i === items.length - 1} />
              </View>
            </Row>
            <Row gap={8}>
              <Stepper label="SETS" value={it.sets} onChange={(v) => patch(i, { sets: Math.max(1, Math.min(8, v)) })} />
              <Stepper label={`MIN ${u.toUpperCase()}`} value={it.repMin} step={d.unit === 'sec' ? 5 : 1} onChange={(v) => patch(i, { repMin: Math.max(1, v) })} />
              <Stepper label={`MAX ${u.toUpperCase()}`} value={it.repMax} step={d.unit === 'sec' ? 5 : 1} onChange={(v) => patch(i, { repMax: Math.max(it.repMin, v) })} />
              <Mini icon="trash" label="Remove" danger onPress={() => Alert.alert('Remove exercise?', d.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => commit(items.filter((_, x) => x !== i)) }])} />
            </Row>
          </Card>
        );
      })}

      <Btn title={`Add exercises to ${type}`} icon="plus" onPress={() => router.push({ pathname: '/library', params: { pick: type } })} />
      <Btn small kind="ghost" title="Reset both workouts to the original plan" onPress={() => Alert.alert('Reset workouts?', 'Full Body A and B go back to the plan from the PDF.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => saveWorkouts(defaultPlan()) }])} />
    </Screen>
  );
}

function Stepper({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.dim }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg }}>
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={() => { haptic(); onChange(value - step); }} style={{ width: 30, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" size={14} color={C.muted} /></Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.monoBold, fontSize: 14, color: C.text }}>{value}</Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={() => { haptic(); onChange(value + step); }} style={{ width: 30, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={14} color={C.lime} /></Pressable>
      </View>
    </View>
  );
}

function Mini({ icon, onPress, label, disabled, danger }: { icon: 'up' | 'down' | 'trash'; onPress: () => void; label: string; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ width: 40, height: danger ? 40 : 34, alignSelf: 'flex-end', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2, opacity: disabled ? 0.3 : 1 }}>
      <Icon name={icon} size={16} color={danger ? C.danger : C.text} />
    </Pressable>
  );
}
