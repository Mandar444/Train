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
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(ins.bottom, 10), paddingTop: 10, backgroundColor: 'rgba(13,14,11,0.97)', borderTopWidth: 1, borderTopColor: '#23241F', flexDirection: 'row', justifyContent: 'space-around' }}>
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
            style={{ minWidth: 60, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <View style={{ width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? C.limeSoft : 'transparent' }}>
              <Icon name={tab.icon} size={22} color={color} width={focused ? 2.2 : 1.8} />
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
