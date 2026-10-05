import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Card, Enter, Icon, IconName, Row, Screen, T } from '../components/ui';
import { connectHealth, healthAvailability, HealthState, openHealthConnectPlayStore } from '../lib/health';
import { setKV } from '../lib/repo';
import { C, F } from '../lib/theme';

/** First-run step: link Google's Health Connect so steps count automatically. */
export default function ConnectSteps() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [avail, setAvail] = useState<HealthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { healthAvailability().then(setAvail); setKV('hc_prompted', true); }, []);

  const go = () => {
    if (next === 'weight') { router.replace('/'); setTimeout(() => router.push('/weight'), 350); }
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      const g = await connectHealth();
      if (g.steps) go();
      else setMsg('Steps permission was not allowed. You can try again, or skip and turn it on later from the Steps tab.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not connect.');
    } finally { setBusy(false); }
  };

  const points: { icon: IconName; t: string; d: string }[] = [
    { icon: 'steps', t: 'Steps fill in by themselves', d: 'From your phone, Google Fit, Fitbit or Samsung Health.' },
    { icon: 'moon', t: 'Sleep too, if you track it', d: 'Optional — only if another app records it.' },
    { icon: 'lock', t: 'Private', d: 'GOAL only reads. Nothing leaves your phone, no password needed.' },
  ];

  return (
    <Screen bottomPad={40}>
      <Enter>
        <View style={{ alignItems: 'center', gap: 14, paddingTop: 30 }}>
          <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="steps" size={48} color={C.bg} width={2.2} />
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 32, color: C.text, textAlign: 'center', letterSpacing: -0.5 }}>Count your steps{'\n'}automatically</Text>
          <T.Body style={{ color: C.muted, textAlign: 'center' }}>Connect Google's Health Connect once and GOAL keeps your daily steps up to date.</T.Body>
        </View>
      </Enter>

      <Enter delay={120}>
        <Card style={{ gap: 16 }}>
          {points.map((p) => (
            <Row key={p.t} gap={14} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={p.icon} size={20} color={C.lime} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T.Strong>{p.t}</T.Strong>
                <T.Small>{p.d}</T.Small>
              </View>
            </Row>
          ))}
        </Card>
      </Enter>

      {msg ? <Card tone="orange"><T.Small style={{ color: C.orangeText }}>{msg}</T.Small></Card> : null}

      {avail === 'needs_install' || avail === 'needs_update' ? (
        <>
          <Card tone="orange"><T.Small style={{ color: C.orangeText }}>{avail === 'needs_install' ? 'Health Connect is not on this phone yet. Get it free from the Play Store (built in on Android 14+), then come back.' : 'Health Connect needs an update from the Play Store.'}</T.Small></Card>
          <Btn title={avail === 'needs_install' ? 'Get Health Connect' : 'Update Health Connect'} onPress={openHealthConnectPlayStore} />
          <Btn title="I've installed it — connect" kind="ghost" onPress={async () => { const a = await healthAvailability(); setAvail(a); if (a === 'available') connect(); }} />
        </>
      ) : (
        <Btn title={busy ? 'Waiting for permission…' : 'Connect Health Connect'} icon="sync" disabled={busy || avail === null || avail === 'unsupported'} onPress={connect} />
      )}
      <Btn title="Skip for now" kind="ghost" onPress={go} />
      <T.Small style={{ textAlign: 'center' }}>You can connect any time from the Steps tab. Without it, you can type steps in yourself.</T.Small>
    </Screen>
  );
}
