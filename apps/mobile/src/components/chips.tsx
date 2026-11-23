import { ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { radius, space, useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Option<T extends string> = { value: T; label: string };

/** Horizontal filter chips. The selected chip fills with the ink colour. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c, dark } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale key={o.value} haptic onPress={() => onChange(o.value)}>
            <Animated.View
              layout={LinearTransition.duration(180)}
              style={{
                paddingHorizontal: 14,
                height: 34,
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: active ? (dark ? c.text : c.text) : c.card,
                borderWidth: active ? 0 : 1,
                borderColor: c.line,
              }}>
              <Text variant="caption" style={{ color: active ? c.background : c.text, fontFamily: 'Manrope_700Bold' }}>
                {o.label}
              </Text>
            </Animated.View>
          </PressableScale>
        );
      })}
      <View style={{ width: space.xs }} />
    </ScrollView>
  );
}
