import { Pressable, Text, View } from 'react-native';
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
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(ins.bottom, 8) + 4, paddingVertical: 8, borderRadius: 28, backgroundColor: 'rgba(24,25,20,0.98)', borderWidth: 1, borderColor: '#2E3026', flexDirection: 'row', justifyContent: 'space-around', elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
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
            style={{ minWidth: 58, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            <View style={{ width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.lime : 'transparent' }}>
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
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />)}
    </Tabs>
  );
}
