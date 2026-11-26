import { View } from 'react-native';

import { space, useTheme } from '@/theme';

import { Text } from './text';

/** A row of numbers with small labels, divided by thin court lines (no boxes). */
export function BoxScore({ items }: { items: { value: string | number; label: string }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flex: 1, paddingVertical: space.md, paddingHorizontal: space.md, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.line }}>
          <Text variant="stat" tabular>{it.value}</Text>
          <Text variant="caption" color="textMuted">{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
