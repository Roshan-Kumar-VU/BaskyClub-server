import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { radius, useTheme } from '@/theme';

import { Text } from './text';

type Option<T extends string> = { value: T; label: string };

/** iOS-style segmented control with a sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c, dark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = width / options.length;

  const thumb = useAnimatedStyle(() => ({
    width: seg - 4,
    transform: [{ translateX: withSpring(index * seg + 2, { damping: 22, stiffness: 260 }) }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', height: 36, borderRadius: radius.md, backgroundColor: c.fill, borderCurve: 'continuous' }}>
      {width > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 2,
              bottom: 2,
              borderRadius: radius.md - 2,
              backgroundColor: dark ? '#3F3F46' : '#FFFFFF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            },
            thumb,
          ]}
        />
      )}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            if (o.value !== value) Haptics.selectionAsync();
            onChange(o.value);
          }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption" style={{ fontFamily: 'Manrope_700Bold' }} color={o.value === value ? 'text' : 'textSecondary'}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
