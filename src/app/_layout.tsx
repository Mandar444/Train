import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BigShouldersDisplay_800ExtraBold, BigShouldersDisplay_900Black } from '@expo-google-fonts/big-shoulders-display';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_500Medium, GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Intro } from '../components/Intro';
import { migrate } from '../lib/db';
import { getProfile, seedDefaults } from '../lib/repo';
import { syncHealth } from '../lib/health';
import { scheduleAll } from '../lib/notify';
import { C } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_800ExtraBold, BigShouldersDisplay_900Black,
    Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold,
    GeistMono_500Medium, GeistMono_600SemiBold, Anton_400Regular,
  });
  const [intro, setIntro] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await migrate();
        await seedDefaults();
        const p = await getProfile();
        if (p) {
          scheduleAll().catch(() => {});
          syncHealth(7).catch(() => {});
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="weight" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
      {intro ? <Intro onDone={() => setIntro(false)} /> : null}
    </SafeAreaProvider>
  );
}
