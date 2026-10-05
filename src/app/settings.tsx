import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Field, Header, Icon, ListRow, Row, Screen, Segmented, Sheet, T, Toggle } from '../components/ui';
import { useQuery } from '../lib/hooks';
import * as repo from '../lib/repo';
import { DEFAULT_SPECIALS, Special } from '../lib/plan';
import { scheduleAll } from '../lib/notify';
import { exportCSV, exportJSON, importJSON } from '../lib/backup';
import { today } from '../lib/dates';
import { C, F } from '../lib/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtTime = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;

export default function Settings() {
  const { data } = useQuery(async () => ({
    p: await repo.getProfile(),
    rem: await repo.getKV<repo.Reminders>('reminders', repo.DEFAULT_REMINDERS),
    specials: await repo.getSpecials(),
    presets: await repo.getPresets(),
    hc: await repo.getKV('health_connected', false),
  }), []);
  const [sheet, setSheet] = useState<null | 'profile' | 'targets' | 'mess' | 'presets' | { time: keyof repo.Reminders } | { preset: Partial<repo.FoodPreset> }>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sheet === 'profile' && data?.p) setForm({ name: data.p.name, age: String(data.p.age ?? ''), height: String(data.p.height_cm ?? ''), start: String(data.p.start_weight_kg), target: String(data.p.target_weight_kg), date: data.p.start_date });
    if (sheet === 'targets' && data?.p) setForm({ kcal: String(data.p.kcal_target), pmin: String(data.p.protein_min), pmax: String(data.p.protein_max) });
  }, [sheet, data?.p]);

  if (!data?.p) return <Screen><View /></Screen>;
  const { p, rem, specials, presets } = data;
  const num = (k: string, d: number) => { const v = parseFloat((form[k] ?? '').replace(',', '.')); return isNaN(v) ? d : v; };

  const setRem = async (r: repo.Reminders) => { await repo.setKV('reminders', r); scheduleAll().catch(() => {}); };
  const remRow = (key: keyof repo.Reminders, title: string, sub: string) => {
    const r = rem[key] as { on: boolean; hour?: number; minute?: number };
    return (
      <ListRow key={key} title={title} sub={r.hour !== undefined ? `${sub} · ${fmtTime(r.hour, r.minute ?? 0)}` : sub}
        onPress={r.hour !== undefined ? () => setSheet({ time: key }) : undefined}
        right={<Toggle label={title} value={r.on} onChange={(v) => setRem({ ...rem, [key]: { ...r, on: v } } as repo.Reminders)} />} />
    );
  };

  const timeKey = sheet && typeof sheet === 'object' && 'time' in sheet ? sheet.time : null;
  const presetEdit = sheet && typeof sheet === 'object' && 'preset' in sheet ? sheet.preset : null;

  return (
    <Screen bottomPad={40}>
      <Header title="Settings" />

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 28, color: C.bg }}>{p.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T.Strong style={{ fontSize: 16 }}>{p.name}</T.Strong>
          <T.Small>{[p.age, p.sex, p.height_cm ? `${p.height_cm} cm` : null, `started ${p.start_weight_kg} kg`].filter(Boolean).join(' · ')}</T.Small>
        </View>
        <Btn small kind="ghost" title="Edit" onPress={() => setSheet('profile')} />
      </Card>

      <T.Label>TARGETS</T.Label>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ListRow first title="Calories" right={<T.Mono>{p.kcal_target.toLocaleString('en-US')} kcal</T.Mono>} onPress={() => setSheet('targets')} />
        <ListRow title="Protein" right={<T.Mono>{p.protein_min}–{p.protein_max} g</T.Mono>} onPress={() => setSheet('targets')} />
        <ListRow title="Steps" sub="Ramps up by week: 7k, 8k, 9k, then 9 to 10k" right={<T.Mono>auto</T.Mono>} />
        <ListRow title="Goal weight" right={<T.Mono>{p.target_weight_kg} kg</T.Mono>} onPress={() => setSheet('profile')} />
      </Card>

      <T.Label>TRAINING</T.Label>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ListRow first title="Edit workouts" sub="Add, remove, reorder, sets and reps" onPress={() => router.push('/workout-edit')} right={<Icon name="chevron" color={C.dim} />} />
        <ListRow title="Exercise library" sub="Every exercise has an animated form guide" onPress={() => router.push('/library')} right={<Icon name="chevron" color={C.dim} />} />
      </Card>

      <T.Label>REMINDERS</T.Label>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        {remRow('weigh', 'Morning weigh-in', 'Daily')}
        {remRow('workout', 'Workout', 'Mon, Wed, Fri')}
        {remRow('steps', 'Step nudge', 'Evening, only if below target')}
        {remRow('meals', 'Meal logging', '9:30, 2:30, 9:30')}
        {remRow('review', 'Weekly review', 'Sunday')}
      </Card>

      <T.Label>FOOD</T.Label>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ListRow first title="Mess protein nights" sub={Object.entries(specials).map(([d, s]) => `${DAYS[+d]} ${s}`).join(' · ') || 'None'} onPress={() => setSheet('mess')} right={<Icon name="chevron" color={C.dim} />} />
        <ListRow title="Quick-add portions" sub="Edit calories and protein of your mess portions" onPress={() => setSheet('presets')} right={<T.Mono>{presets.length} items</T.Mono>} />
      </Card>

      <T.Label>DATA</T.Label>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ListRow first title="Steps source" onPress={() => router.push('/health')} right={<T.Mono>{data.hc ? 'Health Connect' : 'Manual'}</T.Mono>} />
        <ListRow title="Units" right={<T.Mono>kg · cm</T.Mono>} />
        <ListRow title="Import backup" sub="Replaces all data in the app" onPress={() => Alert.alert('Import backup?', 'This replaces everything in the app with the backup file.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Choose file', onPress: async () => { const r = await importJSON(); Alert.alert(r.ok ? 'Done' : 'Import', r.message); } }])} right={<Icon name="chevron" color={C.dim} />} />
      </Card>
      <Row gap={8}>
        <Btn title="Export CSV" kind="light" style={{ flex: 1 }} onPress={() => exportCSV().catch((e) => Alert.alert('Export failed', String(e)))} />
        <Btn title="JSON backup" kind="ghost" style={{ flex: 1 }} onPress={() => exportJSON().catch((e) => Alert.alert('Export failed', String(e)))} />
      </Row>
      <T.Small style={{ textAlign: 'center', color: C.dim }}>Local-first. No account, no analytics. Your data lives on this phone, so back it up now and then.</T.Small>

      {/* ---- sheets ---- */}
      <Sheet visible={sheet === 'profile'} onClose={() => setSheet(null)} title="Profile">
        <Field label="NAME" value={form.name ?? ''} onChangeText={(t) => setForm({ ...form, name: t })} />
        <Row gap={10}>
          <Field label="AGE" keyboardType="number-pad" value={form.age ?? ''} onChangeText={(t) => setForm({ ...form, age: t })} style={{ flex: 1 }} />
          <Field label="HEIGHT (CM)" keyboardType="decimal-pad" value={form.height ?? ''} onChangeText={(t) => setForm({ ...form, height: t })} style={{ flex: 1 }} />
        </Row>
        <Row gap={10}>
          <Field label="START WEIGHT" keyboardType="decimal-pad" value={form.start ?? ''} onChangeText={(t) => setForm({ ...form, start: t })} style={{ flex: 1 }} />
          <Field label="GOAL WEIGHT" keyboardType="decimal-pad" value={form.target ?? ''} onChangeText={(t) => setForm({ ...form, target: t })} style={{ flex: 1 }} />
        </Row>
        <Field label="PLAN START DATE (YYYY-MM-DD)" value={form.date ?? ''} onChangeText={(t) => setForm({ ...form, date: t })} />
        <Btn small kind="ghost" title="Restart plan from today" onPress={() => setForm({ ...form, date: today() })} />
        <Btn title="Save" onPress={async () => {
          const d = /^\d{4}-\d{2}-\d{2}$/.test(form.date ?? '') ? form.date! : p.start_date;
          await repo.saveProfile({ ...p, name: form.name?.trim() || p.name, age: num('age', p.age ?? 0) || null, height_cm: num('height', p.height_cm ?? 0) || null, start_weight_kg: num('start', p.start_weight_kg), target_weight_kg: num('target', p.target_weight_kg), start_date: d });
          setSheet(null);
        }} />
      </Sheet>

      <Sheet visible={sheet === 'targets'} onClose={() => setSheet(null)} title="Targets">
        <Field label="CALORIES PER DAY" keyboardType="number-pad" value={form.kcal ?? ''} onChangeText={(t) => setForm({ ...form, kcal: t })} />
        <Row gap={10}>
          <Field label="PROTEIN MIN (G)" keyboardType="number-pad" value={form.pmin ?? ''} onChangeText={(t) => setForm({ ...form, pmin: t })} style={{ flex: 1 }} />
          <Field label="PROTEIN MAX (G)" keyboardType="number-pad" value={form.pmax ?? ''} onChangeText={(t) => setForm({ ...form, pmax: t })} style={{ flex: 1 }} />
        </Row>
        <T.Small>Plan default: 2,150 kcal and 150 to 180 g protein. Only change calories after 2 to 3 weeks of trend data.</T.Small>
        <Btn title="Save" onPress={async () => { await repo.saveProfile({ ...p, kcal_target: Math.round(num('kcal', p.kcal_target)), protein_min: Math.round(num('pmin', p.protein_min)), protein_max: Math.round(num('pmax', p.protein_max)) }); setSheet(null); }} />
      </Sheet>

      <Sheet visible={sheet === 'mess'} onClose={() => setSheet(null)} title="Mess nights">
        <T.Small>Which dinners have chicken or eggs at your mess? Quick-add only offers them on those days.</T.Small>
        {DAYS.map((d, i) => (
          <Row key={d} gap={12}>
            <T.Strong style={{ width: 40 }}>{d}</T.Strong>
            <View style={{ flex: 1 }}>
              <Segmented options={[{ key: 'none', label: '-' }, { key: 'chicken', label: 'Chicken' }, { key: 'eggs', label: 'Eggs' }]} value={(specials[i] ?? 'none') as 'none' | Special}
                onChange={async (k) => { const n: Record<number, Special> = { ...specials }; if (k === 'none') delete n[i]; else n[i] = k as Special; await repo.setKV('mess_specials', n); }} />
            </View>
          </Row>
        ))}
        <Btn small kind="ghost" title="Reset to plan (Wed/Sun chicken, Fri eggs)" onPress={() => repo.setKV('mess_specials', DEFAULT_SPECIALS)} />
      </Sheet>

      <Sheet visible={sheet === 'presets'} onClose={() => setSheet(null)} title="Portions">
        {presets.map((x) => (
          <Pressable key={x.id} onPress={() => { setForm({ name: x.name, kcal: String(x.calories), prot: String(x.protein_g), special: x.special ?? 'none' }); setSheet({ preset: x }); }}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: 1, borderBottomColor: '#21221C', gap: 10 }}>
            <T.Body style={{ flex: 1 }}>{x.name}{x.special ? <Text style={{ color: C.orange }}>{`  · ${x.special}`}</Text> : null}</T.Body>
            <T.Mono>{x.calories} · {x.protein_g}g</T.Mono>
          </Pressable>
        ))}
        <Btn small kind="ghost" title="+ New portion" onPress={() => { setForm({ name: '', kcal: '', prot: '', special: 'none' }); setSheet({ preset: {} }); }} />
      </Sheet>

      <Sheet visible={!!presetEdit} onClose={() => setSheet('presets')} title={presetEdit?.id ? 'Edit portion' : 'New portion'}>
        <Field label="NAME" value={form.name ?? ''} onChangeText={(t) => setForm({ ...form, name: t })} />
        <Row gap={10}>
          <Field label="KCAL" keyboardType="number-pad" value={form.kcal ?? ''} onChangeText={(t) => setForm({ ...form, kcal: t })} style={{ flex: 1 }} />
          <Field label="PROTEIN (G)" keyboardType="decimal-pad" value={form.prot ?? ''} onChangeText={(t) => setForm({ ...form, prot: t })} style={{ flex: 1 }} />
        </Row>
        <T.Label>ONLY ON</T.Label>
        <Segmented options={[{ key: 'none', label: 'Every day' }, { key: 'chicken', label: 'Chicken nights' }, { key: 'eggs', label: 'Egg nights' }]} value={(form.special ?? 'none') as 'none' | Special} onChange={(k) => setForm({ ...form, special: k })} />
        <Btn title="Save" disabled={!form.name?.trim()} onPress={async () => {
          await repo.savePreset({ id: presetEdit?.id, name: form.name!.trim(), calories: num('kcal', 0), protein_g: num('prot', 0), special: form.special === 'none' ? null : (form.special as Special) });
          setSheet('presets');
        }} />
        {presetEdit?.id ? <Btn small kind="danger" title="Delete portion" onPress={async () => { await repo.deletePreset(presetEdit.id!); setSheet('presets'); }} /> : null}
      </Sheet>

      <Sheet visible={!!timeKey} onClose={() => setSheet(null)} title="Time">
        {timeKey ? (() => {
          const r = rem[timeKey] as { on: boolean; hour: number; minute: number };
          const set = (h: number, m: number) => setRem({ ...rem, [timeKey]: { ...r, hour: (h + 24) % 24, minute: (m + 60) % 60 } } as repo.Reminders);
          return (
            <>
              <Text style={{ fontFamily: F.display, fontSize: 48, color: C.text, textAlign: 'center' }}>{fmtTime(r.hour, r.minute)}</Text>
              <Row gap={8}>
                <Btn small kind="ghost" title="−1 h" style={{ flex: 1 }} onPress={() => set(r.hour - 1, r.minute)} />
                <Btn small kind="ghost" title="+1 h" style={{ flex: 1 }} onPress={() => set(r.hour + 1, r.minute)} />
                <Btn small kind="ghost" title="−15 m" style={{ flex: 1 }} onPress={() => set(r.minute - 15 < 0 ? r.hour - 1 : r.hour, r.minute - 15)} />
                <Btn small kind="ghost" title="+15 m" style={{ flex: 1 }} onPress={() => set(r.minute + 15 >= 60 ? r.hour + 1 : r.hour, r.minute + 15)} />
              </Row>
              <Btn title="Done" onPress={() => setSheet(null)} />
            </>
          );
        })() : null}
      </Sheet>
    </Screen>
  );
}
