import { useState } from 'react';
import { Alert, Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Btn, Card, Field, Header, Icon, ListRow, Pill, Row, Screen, Segmented, Sheet, T } from '../components/ui';
import { useQuery } from '../lib/hooks';
import * as repo from '../lib/repo';
import { addDays, dayMonth, diffDays, today } from '../lib/dates';
import { C, F } from '../lib/theme';

type Angle = 'front' | 'side' | 'back';
const OPT: { key: 'neck_cm' | 'chest_cm' | 'arm_cm' | 'thigh_cm'; label: string }[] = [
  { key: 'neck_cm', label: 'Neck' }, { key: 'chest_cm', label: 'Chest' }, { key: 'arm_cm', label: 'Arm (flexed)' }, { key: 'thigh_cm', label: 'Thigh' },
];

export default function Body() {
  const { width } = useWindowDimensions();
  const date = today();
  const [angle, setAngle] = useState<Angle>('front');
  const [sheet, setSheet] = useState<null | 'waist' | 'opt'>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const { data } = useQuery(async () => ({ m: await repo.measurements(), ph: await repo.photos(), weights: await repo.allWeights() }), []);
  if (!data) return <Screen><View /></Screen>;
  const waists = data.m.filter((x) => x.waist_cm != null);
  const last = waists[waists.length - 1];
  const prev = waists[waists.length - 2];
  const lastOpt = (k: string) => [...data.m].reverse().find((x) => (x as Record<string, unknown>)[k] != null) as repo.Measurement | undefined;
  const nextDue = last ? addDays(last.date, 7) : date;
  const shots = data.ph.filter((p) => p.angle === angle);
  const firstShot = shots[0];
  const lastShot = shots.length > 1 ? shots[shots.length - 1] : null;
  const lastPhotoDate = data.ph.length ? data.ph[data.ph.length - 1].date : null;
  const photoDue = !lastPhotoDate || diffDays(date, lastPhotoDate) >= 14;
  const weightOn = (d: string) => data.weights.filter((w) => w.date <= d).pop()?.weight_kg;
  const waistOn = (d: string) => waists.filter((w) => w.date <= d).pop()?.waist_cm;
  const colW = (width - 40 - 8) / 2;

  const takePhoto = async (fromCamera: boolean) => {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to save progress photos.'); return; }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4], mediaTypes: ['images'] });
    if (res.canceled || !res.assets?.length) return;
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, `${date}-${angle}-${Date.now()}.jpg`);
    new File(res.assets[0].uri).copy(dest);
    await repo.addPhoto(date, angle, dest.uri);
  };

  const saveWaist = async () => {
    const v = parseFloat((vals.waist ?? '').replace(',', '.'));
    if (isNaN(v)) return;
    await repo.saveMeasurement({ date, waist_cm: v, neck_cm: null, chest_cm: null, arm_cm: null, thigh_cm: null });
    setSheet(null);
  };
  const saveOpt = async () => {
    const n = (k: string) => { const v = parseFloat((vals[k] ?? '').replace(',', '.')); return isNaN(v) ? null : v; };
    await repo.saveMeasurement({ date, waist_cm: null, neck_cm: n('neck_cm'), chest_cm: n('chest_cm'), arm_cm: n('arm_cm'), thigh_cm: n('thigh_cm') });
    setSheet(null);
  };

  return (
    <Screen bottomPad={40}>
      <Header title="Body" kicker="MEASUREMENTS & PHOTOS" />

      <Card style={{ gap: 12, padding: 20 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            <T.Label>WAIST · AT NAVEL</T.Label>
            <Row gap={6} style={{ alignItems: 'baseline' }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 44, color: C.text }}>{last?.waist_cm?.toFixed(1) ?? '-'}</Text>
              <T.Small style={{ fontSize: 14 }}>cm</T.Small>
            </Row>
          </View>
          {last && prev ? <Pill tone={last.waist_cm! <= prev.waist_cm! ? 'lime' : 'orange'} text={`${last.waist_cm! - prev.waist_cm! <= 0 ? '−' : '+'}${Math.abs(last.waist_cm! - prev.waist_cm!).toFixed(1)} since last`} /> : null}
        </Row>
        <T.Small>{last ? `Measured ${dayMonth(last.date)} · next due ${dayMonth(nextDue)}` : 'Measure once a week, same conditions as the weigh-in.'}</T.Small>
        <Btn title={nextDue <= date ? "Log this week's waist" : 'Update waist'} kind="light" onPress={() => { setVals({ waist: last?.waist_cm ? String(last.waist_cm) : '' }); setSheet('waist'); }} />
      </Card>

      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <Row style={{ justifyContent: 'space-between', padding: 16, paddingBottom: 6 }}>
          <T.Label>OPTIONAL MEASUREMENTS</T.Label>
          <Pressable onPress={() => { setVals({}); setSheet('opt'); }} hitSlop={10}><Text style={{ color: C.lime, fontFamily: F.semibold, fontSize: 13 }}>Add</Text></Pressable>
        </Row>
        {OPT.map((o) => {
          const lv = lastOpt(o.key);
          const v = lv ? (lv as Record<string, unknown>)[o.key] as number : null;
          return <ListRow key={o.key} title={o.label} right={<T.Mono style={{ color: v != null ? C.text2 : C.faint }}>{v != null ? `${v} cm` : '-'}</T.Mono>} />;
        })}
      </Card>

      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <T.Label>PHOTOS · EVERY 2 WEEKS</T.Label>
        <T.Small style={{ color: photoDue ? C.lime : C.muted }}>{photoDue ? 'Due now' : `next: ${dayMonth(addDays(lastPhotoDate!, 14))}`}</T.Small>
      </Row>
      <Segmented options={[{ key: 'front', label: 'Front' }, { key: 'side', label: 'Side' }, { key: 'back', label: 'Back' }]} value={angle} onChange={setAngle} />
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        {[firstShot, lastShot].map((p, i) => (
          <View key={i} style={{ width: colW, gap: 8 }}>
            <Pressable onLongPress={() => p && Alert.alert('Delete photo?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => repo.deletePhoto(p.id) }])}
              style={{ height: colW * 1.33, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
              {p ? <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} /> : <Icon name="camera" size={32} color={C.line3} />}
              {p ? <Text style={{ position: 'absolute', left: 10, top: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(13,14,11,0.85)', color: C.text, fontFamily: F.mono, fontSize: 12.5 }}>{dayMonth(p.date).toUpperCase()}</Text> : null}
            </Pressable>
            <T.Small style={{ textAlign: 'center' }}>{p ? `${weightOn(p.date)?.toFixed(1) ?? '-'} kg · ${waistOn(p.date)?.toFixed(1) ?? '-'} cm` : i === 0 ? 'Baseline' : 'Latest'}</T.Small>
          </View>
        ))}
      </Row>
      <Row gap={8}>
        <Btn title="Take photo" icon="camera" style={{ flex: 1 }} onPress={() => takePhoto(true)} />
        <Btn title="From gallery" kind="ghost" style={{ flex: 1 }} onPress={() => takePhoto(false)} />
      </Row>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
        <Icon name="lock" size={18} color={C.muted} />
        <T.Small style={{ flex: 1 }}>Photos stay on this phone only. Same light, same distance, same time of day. Long-press a photo to delete it.</T.Small>
      </Card>

      <Sheet visible={sheet === 'waist'} onClose={() => setSheet(null)} title="Waist">
        <Field label="WAIST AT NAVEL (CM)" keyboardType="decimal-pad" value={vals.waist ?? ''} onChangeText={(t) => setVals({ ...vals, waist: t })} autoFocus />
        <T.Small>Relaxed, after breathing out, tape level and snug.</T.Small>
        <Btn title="Save" onPress={saveWaist} />
      </Sheet>
      <Sheet visible={sheet === 'opt'} onClose={() => setSheet(null)} title="Measurements">
        {OPT.map((o) => <Field key={o.key} label={`${o.label.toUpperCase()} (CM)`} keyboardType="decimal-pad" value={vals[o.key] ?? ''} onChangeText={(t) => setVals({ ...vals, [o.key]: t })} />)}
        <Btn title="Save" onPress={saveOpt} />
      </Sheet>
    </Screen>
  );
}
