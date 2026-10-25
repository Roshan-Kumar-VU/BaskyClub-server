import { View } from 'react-native';

import type { ClubKind } from '@/types/models';
import { radius, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

/**
 * Club badge. Affiliated comes from an active, unexpired affiliation (#58);
 * academies with a basky_verified badge show "Verified by BaskyCLub".
 */
export function ClubBadge({ kind, affiliated, verified, small }: { kind: ClubKind; affiliated: boolean; verified: boolean; small?: boolean }) {
  const { c } = useTheme();
  const h = small ? 20 : 24;
  const pill = (label: string, bg: string, fg: string, icon?: { ios: string; android: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: h, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: bg }}>
      {icon && <Icon ios={icon.ios} android={icon.android} size={11} color={fg} weight="bold" />}
      <Text variant="micro" style={{ color: fg }}>{label}</Text>
    </View>
  );
  if (verified) return pill('Verified by BaskyCLub', c.accentSoft, c.accentText, { ios: 'checkmark.seal.fill', android: 'verified' });
  if (kind === 'club' && affiliated) return pill('Affiliated', c.officialSoft, c.official, { ios: 'link', android: 'link' });
  const label = { club: 'Community club', academy: 'Academy', creator_group: 'Creator group', franchise: 'Franchise' }[kind];
  return pill(label, c.fill, c.textSecondary);
}

export function CreatorBadge() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 20, paddingHorizontal: 7, borderRadius: radius.full, backgroundColor: c.accentSoft }}>
      <Icon ios="sparkles" android="auto_awesome" size={10} color={c.accentText} />
      <Text variant="micro" style={{ color: c.accentText }}>Creator</Text>
    </View>
  );
}
