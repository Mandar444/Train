import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Header, haptic, Icon, Row, Screen, T } from '../components/ui';
import { DayChips, dayDow } from '../components/workout';
import { ExerciseThumb } from '../components/ExerciseAnim';
import { useQuery } from '../lib/hooks';
import { defaultPlan, getWorkouts, saveWorkouts } from '../lib/repo';
import { DayKey, estMinutes, EXERCISES, isDayKey, PlanItem, PROGRAM, restFor } from '../lib/plan';
import { restLabel } from '../lib/logic';
import { C, F } from '../lib/theme';

export default function WorkoutEdit() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<DayKey>(isDayKey(params.type) ? params.type : 'push_a');
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
    n[i].rest = restFor(n[i].key, n[i].repMax);
    commit(n);
  };

  return (
    <Screen bottomPad={40}>
      <Header title="Edit workouts" kicker="Add, remove, reorder" />
      <DayChips value={type} onPress={setType} />
      <View style={{ gap: 4 }}>
        <T.Strong style={{ fontSize: 20 }}>{`${dayDow(type)}: ${PROGRAM[type].name}`}</T.Strong>
        <T.Small>{`${PROGRAM[type].subtitle} · ${items.length} exercises · about ${estMinutes(items, PROGRAM[type].finisherMin)} min. Changes apply from your next session.`}</T.Small>
      </View>

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
                <T.Small>{`${d.group} · ${d.equip} · rest ${restLabel(it.rest ?? restFor(it.key, it.repMax))}`}</T.Small>
              </View>
              <View style={{ gap: 4 }}>
                <Mini icon="up" label="Move up" onPress={() => move(i, -1)} disabled={i === 0} />
                <Mini icon="down" label="Move down" onPress={() => move(i, 1)} disabled={i === items.length - 1} />
              </View>
            </Row>
            <Row gap={8}>
              <Stepper label="Sets" value={it.sets} onChange={(v) => patch(i, { sets: Math.max(1, Math.min(8, v)) })} />
              <Stepper label={`Min ${u}`} value={it.repMin} step={d.unit === 'sec' ? 5 : 1} onChange={(v) => patch(i, { repMin: Math.max(1, v) })} />
              <Stepper label={`Max ${u}`} value={it.repMax} step={d.unit === 'sec' ? 5 : 1} onChange={(v) => patch(i, { repMax: Math.max(it.repMin, v) })} />
              <Mini icon="trash" label="Remove" danger onPress={() => Alert.alert('Remove exercise?', d.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => commit(items.filter((_, x) => x !== i)) }])} />
            </Row>
          </Card>
        );
      })}

      <Btn title={`Add exercises to ${PROGRAM[type].name}`} icon="plus" onPress={() => router.push({ pathname: '/library', params: { pick: type } })} />
      <Btn small kind="ghost" title={`Reset ${PROGRAM[type].name} to the default`} onPress={() => Alert.alert(`Reset ${PROGRAM[type].name}?`, 'This day goes back to the default exercises, sets and reps.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => saveWorkouts({ ...plan, [type]: defaultPlan()[type] }) }])} />
      <Btn small kind="ghost" title="Reset all six days to the default program" onPress={() => Alert.alert('Reset all workouts?', 'All six days go back to the default push, pull, legs program.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => saveWorkouts(defaultPlan()) }])} />
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
