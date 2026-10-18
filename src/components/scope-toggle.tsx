import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useScope } from '@/lib/scope';
import { radius, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/**
 * All India | <District>. Tapping the district side when it is already
 * selected (or when none is set) opens the picker, so anyone can browse
 * another district.
 */
export function ScopeToggle() {
  const { c, dark } = useTheme();
  const { scope, districtCode, districtName, setScope } = useScope();
  const [w, setW] = useState(0);
  const half = w / 2;
  const isDistrict = scope === 'district' && !!districtCode;

  const thumb = useAnimatedStyle(() => ({
    width: half - 4,
    transform: [{ translateX: withSpring(isDistrict ? half + 2 : 2, { damping: 22, stiffness: 260 }) }],
  }));

  const pressIndia = () => {
    if (scope !== 'india') Haptics.selectionAsync();
    setScope('india');
  };
  const pressDistrict = () => {
    if (!districtCode || isDistrict) {
      router.push('/district-picker');
      return;
    }
    Haptics.selectionAsync();
    setScope('district');
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', height: 38, borderRadius: radius.full, backgroundColor: c.fill }}>
      {w > 0 && (
        <Animated.View
          style={[{ position: 'absolute', top: 2, bottom: 2, borderRadius: radius.full, backgroundColor: dark ? '#3F3F46' : '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }, thumb]}
        />
      )}
      <Pressable onPress={pressIndia} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
        <Icon ios="globe.asia.australia.fill" android="public" size={15} color={!isDistrict ? c.accent : c.textMuted} />
        <Text variant="caption" style={{ fontFamily: 'Manrope_700Bold' }} color={!isDistrict ? 'text' : 'textSecondary'}>All India</Text>
      </Pressable>
      <Pressable onPress={pressDistrict} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
        <Icon ios="mappin.and.ellipse" android="location_on" size={15} color={isDistrict ? c.accent : c.textMuted} />
        <Text variant="caption" numberOfLines={1} style={{ fontFamily: 'Manrope_700Bold', flexShrink: 1 }} color={isDistrict ? 'text' : 'textSecondary'}>
          {districtName ?? 'Pick district'}
        </Text>
        {isDistrict && <Icon ios="chevron.down" android="expand_more" size={11} color={c.textMuted} weight="bold" />}
      </Pressable>
    </View>
  );
}
