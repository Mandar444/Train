import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, haptic, IconBtn, Row, T } from './ui';
import { iso, parse, today } from '../lib/dates';
import { mealDaysBetween } from '../lib/repo';
import { C, F } from '../lib/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Month calendar sheet. Dots show days with food logged (green = within target, orange = over). */
export function CalendarSheet({ visible, value, onPick, onClose, target, startDate }: {
  visible: boolean; value: string; onPick: (d: string) => void; onClose: () => void; target: number; startDate?: string;
}) {
  const ins = useSafeAreaInsets();
  const [cursor, setCursor] = useState(() => { const d = parse(value); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [logged, setLogged] = useState<Record<string, number>>({});

  useEffect(() => { if (visible) { const d = parse(value); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); } }, [visible, value]);
  useEffect(() => {
    const first = iso(cursor);
    const last = iso(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    mealDaysBetween(first, last).then((rows) => setLogged(Object.fromEntries(rows.map((r) => [r.date, r.kcal]))));
  }, [cursor]);

  const t = today();
  const lead = (cursor.getDay() + 6) % 7; // Monday-first
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const nextDisabled = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) > parse(t);
  const loggedCount = Object.keys(logged).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: '#121310', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: ins.bottom + 20, gap: 14, borderWidth: 1, borderColor: C.line2 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line3 }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <IconBtn name="back" label="Previous month" onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: F.display, fontSize: 22, color: C.text }}>{`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}</Text>
              <T.Small style={{ fontSize: 13 }}>{loggedCount ? `${loggedCount} day${loggedCount > 1 ? 's' : ''} logged` : 'No food logged this month'}</T.Small>
            </View>
            <IconBtn name="chevron" label="Next month" color={nextDisabled ? C.faint : C.text} onPress={() => !nextDisabled && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} />
          </Row>
          <View style={{ flexDirection: 'row' }}>
            {DOW.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: F.semibold, fontSize: 13, color: C.dim }}>{d}</Text>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 50 }} />;
              const future = d > t;
              const sel = d === value;
              const isT = d === t;
              const k = logged[d];
              const beforeStart = startDate ? d < startDate : false;
              return (
                <Pressable key={i} disabled={future} onPress={() => { haptic(); onPick(d); onClose(); }} style={{ width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? C.lime : 'transparent', borderWidth: isT && !sel ? 1.5 : 0, borderColor: C.lime }}>
                    <Text style={{ fontFamily: sel || isT ? F.bold : F.medium, fontSize: 15, color: sel ? C.bg : future || beforeStart ? C.faint : C.text }}>{parse(d).getDate()}</Text>
                    {k !== undefined && !sel ? <View style={{ position: 'absolute', bottom: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: k <= target ? C.lime : C.orange }} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Row gap={16} style={{ justifyContent: 'center' }}>
            <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lime }} /><T.Small style={{ fontSize: 13 }}>Within target</T.Small></Row>
            <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange }} /><T.Small style={{ fontSize: 13 }}>Over target</T.Small></Row>
          </Row>
          <Btn title="Go to today" kind="ghost" small onPress={() => { onPick(t); onClose(); }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
