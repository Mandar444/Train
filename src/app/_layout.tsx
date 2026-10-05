import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, PlusJakartaSans_800ExtraBold_Italic } from '@expo-google-fonts/plus-jakarta-sans';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Intro } from '../components/Intro';
import { migrate } from '../lib/db';
import { getKV, getProfile, saveProfile, seedDefaults, setKV } from '../lib/repo';
import { syncHealth } from '../lib/health';
import { scheduleAll } from '../lib/notify';
import { C } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, PlusJakartaSans_800ExtraBold_Italic,
    Anton_400Regular,
  });
  const [intro, setIntro] = useState(true);
  // The app mounts during the final logo hold so the intro gets the JS thread to itself.
  const [mountApp, setMountApp] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await migrate();
        await seedDefaults();
        const p = await getProfile();
        // v1.3: protein target raised for the 6-day aggressive cut (only if still on the old default)
        if (p && !(await getKV('protein_v2', false))) {
          if (p.protein_min === 130 && p.protein_max === 160) await saveProfile({ ...p, protein_min: 150, protein_max: 180 });
          await setKV('protein_v2', true);
        }
        if (p) {
          // background work waits until the intro has played
          setTimeout(() => { scheduleAll().catch(() => {}); syncHealth(7).catch(() => {}); }, 10000);
        }
      } finally {
        setReady(true);
      }
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncHealth(3).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ready && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {mountApp || !intro ? <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="weight" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack> : null}
      {intro ? <Intro onNearEnd={() => setMountApp(true)} onDone={() => { setMountApp(true); setIntro(false); }} /> : null}
    </SafeAreaProvider>
  );
}
