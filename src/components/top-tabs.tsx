import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { space, useTheme } from '@/theme';

import { Text } from './text';

/** Underlined top tabs (district hub: Feed · Tournaments · Association). */
export function TopTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const seg = w / tabs.length;
  const index = Math.max(0, tabs.findIndex((t) => t.value === value));
  const bar = useAnimatedStyle(() => ({ width: seg * 0.5, transform: [{ translateX: withSpring(index * seg + seg * 0.25, { damping: 22, stiffness: 260 }) }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', marginTop: space.sm }}>
      {tabs.map((t) => (
        <Pressable
          key={t.value}
          onPress={() => {
            if (t.value !== value) Haptics.selectionAsync();
            onChange(t.value);
          }}
          style={{ flex: 1, alignItems: 'center', paddingVertical: space.md }}>
          <Text variant="bodyStrong" color={t.value === value ? 'text' : 'textMuted'} style={{ fontFamily: 'Manrope_700Bold' }}>{t.label}</Text>
        </Pressable>
      ))}
      {w > 0 && <Animated.View style={[{ position: 'absolute', bottom: 0, height: 3, borderRadius: 2, backgroundColor: c.accent }, bar]} />}
    </View>
  );
}
