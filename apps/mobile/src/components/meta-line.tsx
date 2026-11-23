import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/** One fact with a small icon — used instead of dot-joined strings. */
export function MetaLine({ ios, android, text, color }: { ios: string; android: string; text?: string; color?: string }) {
  const { c } = useTheme();
  if (!text) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon ios={ios} android={android} size={13} color={color ?? c.textMuted} />
      <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1, color: color && color.startsWith('rgba') ? color : c.textMuted }}>{text}</Text>
    </View>
  );
}
