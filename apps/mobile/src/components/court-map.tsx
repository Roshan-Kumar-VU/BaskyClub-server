import { View } from 'react-native';

import type { MapPin } from '@/data/manage';
import { space, useTheme } from '@/theme';

import { Text } from './text';

/** Web: maps need the phone app, so the browser shows a note and the list below. */
export function CourtMap(_: { clubs: MapPin[]; courts: MapPin[]; center: { latitude: number; longitude: number } }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: space.lg, backgroundColor: c.cardMuted }}>
      <Text variant="caption" color="textMuted">The map opens in the phone app. Here's the list of clubs and courts.</Text>
    </View>
  );
}
