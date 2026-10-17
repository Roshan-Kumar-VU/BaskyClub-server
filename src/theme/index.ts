import { useColorScheme } from 'react-native';

import { colors, type ThemeColors } from './colors';

export * from './colors';
export * from './spacing';
export * from './typography';

export function useTheme(): { c: ThemeColors; dark: boolean } {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { c: dark ? colors.dark : colors.light, dark };
}
