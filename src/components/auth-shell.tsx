import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';
import { Wordmark } from './wordmark';

/** Shared frame for the log in and sign up sheets. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, paddingTop: Platform.OS === 'ios' ? space.xl : insets.top + space.lg, gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={20} />
          <Pressable hitSlop={12} onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon ios="xmark" android="close" size={14} color={c.textSecondary} weight="bold" />
          </Pressable>
        </View>
        <View style={{ gap: space.xs, marginTop: space.lg, marginBottom: space.sm }}>
          <Text variant="title">{title}</Text>
          <Text color="textSecondary">{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
