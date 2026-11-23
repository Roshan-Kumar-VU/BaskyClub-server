import { useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { fonts, radius, space, useTheme } from '@/theme';

import { Text } from './text';

/** Labelled text field; the border turns orange while focused. */
export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodySemi }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textMuted}
        selectionColor={c.accent}
        accessibilityLabel={label}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={{
          height: 52,
          paddingHorizontal: space.lg,
          borderRadius: radius.md + 2,
          borderCurve: 'continuous',
          backgroundColor: c.card,
          borderWidth: 1.5,
          borderColor: focused ? c.accent : c.line,
          color: c.text,
          fontFamily: fonts.bodyMedium,
          fontSize: 16,
        }}
      />
      {hint && <Text variant="caption" color="textMuted">{hint}</Text>}
    </View>
  );
}
