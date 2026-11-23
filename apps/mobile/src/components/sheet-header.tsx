import { router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/**
 * Title row for sheets and modals, with a close button. On Android a modal is full screen, so the
 * row starts below the status bar (on iOS the modal is a card that already sits below it).
 */
export function SheetHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'android' ? insets.top : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.lg + top, paddingBottom: space.sm }}>
      <Text variant="heading">{title}</Text>
      <Pressable hitSlop={12} onPress={onClose ?? (() => router.back())} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon ios="xmark" android="close" size={13} color={c.textSecondary} weight="bold" />
      </Pressable>
    </View>
  );
}
