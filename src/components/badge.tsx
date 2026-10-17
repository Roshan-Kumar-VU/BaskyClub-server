import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

export function VerifiedMark({ size = 15 }: { size?: number }) {
  const { c } = useTheme();
  return <Icon ios="checkmark.seal.fill" android="verified" size={size} color={c.accent} />;
}

export function OfficialBadge() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: radius.full, backgroundColor: c.officialSoft }}>
      <Icon ios="pin.fill" android="push_pin" size={11} color={c.official} />
      <Text variant="micro" style={{ color: c.official }}>Official</Text>
    </View>
  );
}

export function LiveBadge() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 22, borderRadius: radius.full, backgroundColor: c.live }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
      <Text variant="micro" style={{ color: '#fff' }}>Live</Text>
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 8, height: 22, justifyContent: 'center', borderRadius: radius.full, backgroundColor: c.fill }}>
      <Text variant="micro" color="textSecondary">{label}</Text>
    </View>
  );
}
