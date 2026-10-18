import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';
import { space, useTheme } from '@/theme';

/** Shown when a visitor tries a member action (like, comment, follow, +). */
export function LoginPromptBody({ reason = 'Log in to like, comment, follow and post.' }: { reason?: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.card, padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.md, alignItems: 'center' }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: space.md }}>
        <Icon ios="basketball.fill" android="sports_basketball" size={28} color={c.accent} />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>Join BaskyCLub</Text>
      <Text color="textSecondary" style={{ textAlign: 'center', marginBottom: space.sm }}>{reason}</Text>
      <View style={{ alignSelf: 'stretch', gap: space.sm }}>
        <Button label="Create account" onPress={() => { router.back(); router.push('/auth/signup'); }} />
        <Button label="I already have an account" kind="secondary" onPress={() => { router.back(); router.push('/auth/login'); }} />
      </View>
    </View>
  );
}

