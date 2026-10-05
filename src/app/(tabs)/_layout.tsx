import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, Icon, IconName } from '../../components/ui';
import { C, F } from '../../lib/theme';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'food', label: 'Food', icon: 'bowl' },
  { name: 'steps', label: 'Steps', icon: 'steps' },
  { name: 'train', label: 'Workout', icon: 'dumbbell' },
  { name: 'progress', label: 'Progress', icon: 'trend' },
];

function TabBar({ state, navigation }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(state.index)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: state.index, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    pop.setValue(0.82);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }).start();
  }, [state.index, x, pop]);
  const n = state.routes.length;
  const itemW = w > 0 ? (w - 8) / n : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 2)} style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(ins.bottom, 8) + 4, paddingVertical: 8, borderRadius: 28, backgroundColor: 'rgba(24,25,20,0.98)', borderWidth: 1, borderColor: '#2E3026', flexDirection: 'row', paddingHorizontal: 4, elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
      {itemW > 0 ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 10, left: 4 + (itemW - 52) / 2, width: 52, height: 30, borderRadius: 15, backgroundColor: C.lime, transform: [{ translateX: Animated.multiply(x, itemW) }, { scale: pop }] }} />
      ) : null}
      {state.routes.map((route, i) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        const color = focused ? C.lime : C.dim;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              haptic();
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, height: 52, paddingTop: 2, alignItems: 'center', justifyContent: 'flex-start', gap: 3 }}
          >
            <View style={{ width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused && itemW === 0 ? C.lime : 'transparent' }}>
              <Icon name={tab.icon} size={21} color={focused ? C.bg : C.dim} width={focused ? 2.3 : 1.8} />
            </View>
            <Text style={{ color, fontFamily: focused ? F.bold : F.medium, fontSize: 12 }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, animation: 'shift', freezeOnBlur: true }}>
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />)}
    </Tabs>
  );
}
