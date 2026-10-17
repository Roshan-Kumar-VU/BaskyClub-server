import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { fonts, useTheme } from '@/theme';

/**
 * Each tab has its own stack with an iOS large title that collapses into a
 * blurred bar on scroll. Android gets a plain solid header.
 */
export function TabStack({ title, largeTitle = true }: { title: string; largeTitle?: boolean }) {
  const { c } = useTheme();
  const ios = Platform.OS === 'ios';
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: ios && largeTitle,
        headerTransparent: ios,
        headerBlurEffect: ios ? 'systemChromeMaterial' : undefined,
        headerShadowVisible: !ios,
        headerLargeTitleShadowVisible: false,
        headerStyle: ios ? undefined : { backgroundColor: c.background },
        headerTitleStyle: { fontFamily: fonts.bodyBold, color: c.text },
        headerLargeTitleStyle: { fontFamily: fonts.display, color: c.text },
        headerTintColor: c.accent,
        contentStyle: { backgroundColor: c.background },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
