import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, Header, Icon, IconName, Row, Screen, T } from '../components/ui';
import { useQuery } from '../lib/hooks';
import { getDay, getKV } from '../lib/repo';
import { connectHealth, disconnectHealth, grantedTypes, healthAvailability, HealthState, openHCSettings, openHealthConnectPlayStore, syncHealth } from '../lib/health';
import { today } from '../lib/dates';
import { fmt } from '../lib/logic';
import { C, F } from '../lib/theme';

export default function Health() {
  const [avail, setAvail] = useState<HealthState | null>(null);
  const [granted, setGranted] = useState({ steps: false, sleep: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data } = useQuery(async () => ({
    connected: await getKV('health_connected', false),
    last: await getKV<string | null>('health_last_sync', null),
    day: await getDay(today()),
  }), []);

  useEffect(() => {
    healthAvailability().then(setAvail);
    grantedTypes().then(setGranted);
  }, [data?.connected]);

  const connected = !!data?.connected && granted.steps;

  const connect = async () => {
    setBusy(true); setErr(null);
    try {
      const g = await connectHealth();
      setGranted(g);
      if (!g.steps) setErr('Steps permission was not granted. You can allow it in Health Connect settings.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not connect.');
    } finally { setBusy(false); }
  };

  const perms: { n: string; s: string; icon: IconName; on: boolean; req: boolean }[] = [
    { n: 'Steps', s: 'Read · daily totals', icon: 'steps', on: granted.steps, req: true },
    { n: 'Sleep', s: 'Read · hours per night', icon: 'moon', on: granted.sleep, req: false },
  ];

  return (
    <Screen bottomPad={40}>
      <Header title="Step tracking" kicker="HEALTH CONNECT" />

      <Row style={{ justifyContent: 'center', height: 120 }} gap={0}>
        <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone" size={36} />
        </View>
        <View style={{ width: 90, height: 3, backgroundColor: connected ? C.lime : C.line3, borderRadius: 2 }} />
        <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: connected ? C.lime : C.card, borderWidth: 1, borderColor: connected ? C.lime : C.line2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 34, color: connected ? C.bg : C.text }}>M</Text>
        </View>
      </Row>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <T.Display style={{ fontSize: 38, textAlign: 'center' }}>{connected ? 'Steps connected' : 'Count real steps'}</T.Display>
        <T.Body style={{ color: C.muted, textAlign: 'center', fontSize: 14 }}>
          {connected ? 'Steps update by themselves each time you open the app. Weekly averages and the step nudge use real data.' : 'Link Android Health Connect so daily steps, the weekly average and the step ramp fill in automatically.'}
        </T.Body>
      </View>

      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <T.Label style={{ padding: 16, paddingBottom: 8 }}>PERMISSIONS</T.Label>
        {perms.map((p) => (
          <Row key={p.n} gap={12} style={{ minHeight: 58, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#21221C' }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}><Icon name={p.icon} size={18} color={C.text2} /></View>
            <View style={{ flex: 1 }}><T.Strong style={{ fontSize: 14 }}>{p.n}</T.Strong><T.Small style={{ color: C.dim }}>{p.s}</T.Small></View>
            <Text style={{ fontFamily: F.monoBold, fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: p.on ? C.limeSoft : C.card2, color: p.on ? C.lime : C.muted }}>
              {p.on ? 'Allowed' : p.req ? 'Required' : 'Optional'}
            </Text>
          </Row>
        ))}
      </Card>

      {connected && data ? (
        <Card tone="green" style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}><T.Strong style={{ fontSize: 14 }}>Synced</T.Strong><Text style={{ fontFamily: F.mono, fontSize: 12.5, color: C.lime }}>Live</Text></Row>
          <Row style={{ justifyContent: 'space-between' }}><T.Small style={{ color: C.text2 }}>Today</T.Small><T.Mono>{fmt(data.day?.steps ?? 0)} steps</T.Mono></Row>
          <Row style={{ justifyContent: 'space-between' }}><T.Small style={{ color: C.text2 }}>Last sync</T.Small><T.Mono>{data.last ? new Date(data.last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</T.Mono></Row>
          <Row style={{ justifyContent: 'space-between' }}><T.Small style={{ color: C.text2 }}>Refresh</T.Small><T.Mono>on open + pull to refresh</T.Mono></Row>
        </Card>
      ) : null}

      {err ? <Card tone="orange"><T.Small style={{ color: C.orangeText }}>{err}</T.Small></Card> : null}

      {avail === 'needs_install' || avail === 'needs_update' ? (
        <>
          <Card tone="orange"><T.Small style={{ color: C.orangeText }}>{avail === 'needs_install' ? 'Health Connect is not installed on this phone. Install it from the Play Store (built in on Android 14+).' : 'Health Connect needs an update.'}</T.Small></Card>
          <Btn title={avail === 'needs_install' ? 'Get Health Connect' : 'Update Health Connect'} onPress={openHealthConnectPlayStore} />
        </>
      ) : avail === 'unsupported' ? (
        <Card><T.Small>Health Connect isn't available here. Steps can still be entered by hand on the Steps screen.</T.Small></Card>
      ) : connected ? (
        <>
          <Btn title={busy ? 'Syncing…' : 'Sync last 30 days'} kind="ghost" icon="sync" onPress={async () => { setBusy(true); await syncHealth(30); setBusy(false); }} />
          <Btn title="Open Health Connect settings" kind="ghost" small onPress={openHCSettings} />
          <Btn title="Disconnect" kind="danger" small onPress={async () => { await disconnectHealth(); setGranted(await grantedTypes()); }} />
        </>
      ) : (
        <Btn title={busy ? 'Waiting for permission…' : 'Connect Health Connect'} disabled={busy || avail === null} onPress={connect} />
      )}

      <T.Small style={{ color: C.dim, textAlign: 'center' }}>
        Your step counter (Google Fit, Fitbit, Samsung Health or the phone itself) writes to Health Connect; this app only reads. Make sure that app has Health Connect sync turned on. Nothing leaves your phone.
      </T.Small>
    </Screen>
  );
}
