import { Pressable, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic, Icon, IconName } from '../../components/ui';
import { C, F } from '../../lib/theme';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Today', icon: 'home' },
  { name: 'food', label: 'Food', icon: 'bowl' },
  { name: 'train', label: 'Train', icon: 'dumbbell' },
  { name: 'progress', label: 'Progress', icon: 'trend' },
  { name: 'plan', label: 'Plan', icon: 'calendar' },
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
            <Icon name={tab.icon} size={24} color={color} width={1.8} />
            <Text style={{ color, fontFamily: F.medium, fontSize: 11 }}>{tab.label}</Text>
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
