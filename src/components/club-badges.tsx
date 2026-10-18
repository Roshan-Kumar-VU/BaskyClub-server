import { View } from 'react-native';

import type { ClubCategory } from '@/types/models';
import { radius, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/** Affiliated (linked to an association) / Verified by BaskyCLub (academies) / Community. */
export function ClubBadge({ category, verified, small }: { category: ClubCategory; verified: boolean; small?: boolean }) {
  const { c } = useTheme();
  const h = small ? 20 : 24;
  if (category === 'affiliated') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: h, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: c.officialSoft }}>
        <Icon ios="link" android="link" size={11} color={c.official} weight="bold" />
        <Text variant="micro" style={{ color: c.official }}>Affiliated</Text>
      </View>
    );
  }
  if (category === 'academy') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: h, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: verified ? c.accentSoft : c.fill }}>
        {verified && <Icon ios="checkmark.seal.fill" android="verified" size={12} color={c.accent} />}
        <Text variant="micro" style={{ color: verified ? c.accentText : c.textSecondary }}>{verified ? 'Verified by BaskyCLub' : 'Academy'}</Text>
      </View>
    );
  }
  return (
    <View style={{ height: h, paddingHorizontal: 8, justifyContent: 'center', borderRadius: radius.full, backgroundColor: c.fill }}>
      <Text variant="micro" color="textSecondary">Community</Text>
    </View>
  );
}
