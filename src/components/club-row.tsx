import { View } from 'react-native';

import type { ClubSummary } from '@/data/repositories';
import { space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { VerifiedMark } from './badge';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function ClubRow({ club, onPress }: { club: ClubSummary; onPress?: () => void }) {
  const { c } = useTheme();
  const meta = [club.districtName ?? (club.kind === 'creator' ? 'Creators' : undefined), `${club.memberCount} members`, `${club.teamCount} teams`]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <PressableScale onPress={onPress} scaleTo={0.985}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: c.card }}>
        <Avatar name={club.clubName} uri={club.logoUrl} size={52} square />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>{club.clubName}</Text>
            {club.isVerified && <VerifiedMark />}
          </View>
          {!!club.teamMotto && <Text variant="caption" color="textSecondary" numberOfLines={1}>{club.teamMotto}</Text>}
          <Text variant="caption" color="textMuted" numberOfLines={1}>{meta}</Text>
        </View>
        <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} weight="semibold" />
      </View>
    </PressableScale>
  );
}
