import { Text as RNText, type TextProps } from 'react-native';

import { type ThemeColors, type TypeVariant, type, useTheme } from '@/theme';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: keyof ThemeColors;
  tabular?: boolean;
};

export function Text({ variant = 'body', color = 'text', tabular, style, ...rest }: Props) {
  const { c } = useTheme();
  return (
    <RNText
      {...rest}
      style={[type[variant], { color: c[color] }, tabular && { fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
