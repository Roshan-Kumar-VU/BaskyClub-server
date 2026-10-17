import { View } from 'react-native';

import { radius, space, useTheme } from '@/theme';

import { Text } from './text';

/** One number, one label. Used in profile and club stat rows. */
export function StatTile({ value, label }: { value: string | number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', paddingVertical: space.md, paddingHorizontal: space.md, gap: 2 }}>
      <Text variant="stat" tabular>{value}</Text>
      <Text variant="caption" color="textMuted">{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.sm }}>
      <Text variant="heading">{title}</Text>
      {action}
    </View>
  );
}
