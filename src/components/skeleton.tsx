import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { radius, space, useTheme } from '@/theme';

/** Pulsing placeholder block used while a screen's data loads. */
export function Bone({ style }: { style?: ViewStyle }) {
  const { c } = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ backgroundColor: c.fill, borderRadius: radius.md }, style, a]} />;
}

export function PostSkeleton() {
  return (
    <View style={{ padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <Bone style={{ width: 40, height: 40, borderRadius: 20 }} />
        <View style={{ gap: 6, flex: 1 }}>
          <Bone style={{ width: '50%', height: 12 }} />
          <Bone style={{ width: '30%', height: 10 }} />
        </View>
      </View>
      <Bone style={{ width: '100%', height: 220 }} />
    </View>
  );
}
