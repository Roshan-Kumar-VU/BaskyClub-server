import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { space, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/** Title row for sheets and modals, with a close button. */
export function SheetHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm }}>
      <Text variant="heading">{title}</Text>
      <Pressable hitSlop={12} onPress={onClose ?? (() => router.back())} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon ios="xmark" android="close" size={13} color={c.textSecondary} weight="bold" />
      </Pressable>
    </View>
  );
}
