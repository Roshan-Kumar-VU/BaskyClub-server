// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import { router } from 'expo-router';
import { View } from 'react-native';

import { useScope } from '@/lib/scope';
import { radius, space, useTheme } from '@/theme';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

/** "See basketball near you" — shown on Home until a district is set. */
export function DistrictBanner() {
  const { c } = useTheme();
  const { districtCode } = useScope();
  if (districtCode) return null;
  return (
    <View style={{ margin: space.lg, marginBottom: space.sm, padding: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.accentSoft, gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="location.fill" android="near_me" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">See basketball near you</Text>
          <Text variant="caption" color="textSecondary">Games, clubs and your district association.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button compact label="Use my location" onPress={() => router.push('/location-explainer')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button compact kind="secondary" label="Pick district" onPress={() => router.push('/district-picker')} />
        </View>
      </View>
    </View>
  );
}
