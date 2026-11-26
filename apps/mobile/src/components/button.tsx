import { ActivityIndicator, View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  icon?: React.ReactNode;
};

export function Button({ label, onPress, kind = 'primary', loading, disabled, compact, icon }: Props) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'secondary' ? c.fill : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'secondary' ? c.text : c.accentText;
  return (
    <PressableScale haptic accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!(disabled || loading) }} onPress={onPress} disabled={disabled || loading} style={{ opacity: disabled ? 0.45 : 1 }}>
      <View
        style={{
          height: compact ? 36 : 50,
          paddingHorizontal: compact ? 16 : 22,
          borderRadius: compact ? radius.full : radius.lg,
          borderCurve: 'continuous',
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon}
            <Text variant={compact ? 'caption' : 'subheading'} style={{ color: fg, fontFamily: 'Manrope_700Bold' }}>
              {label}
            </Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}
