import { router } from 'expo-router';
import { View } from 'react-native';

import type { ClubSummary } from '@/data/repo';
import { space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { ClubBadge } from './club-badges';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function ClubRow({ club }: { club: ClubSummary }) {
  const { c } = useTheme();
  const kind = club.category === 'academy' ? 'Academy' : 'Club';
  return (
    <PressableScale scaleTo={0.985} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.clubId } })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: c.card }}>
        <Avatar name={club.clubName} uri={club.logoUrl} size={54} square />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="subheading" numberOfLines={1}>{club.clubName}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {[kind, club.districtName, club.memberCount ? `${club.memberCount} ${club.memberCount === 1 ? 'member' : 'members'}` : undefined].filter(Boolean).join('  ·  ')}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <ClubBadge category={club.category} verified={club.isVerified} small />
          </View>
        </View>
        <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} weight="semibold" />
      </View>
    </PressableScale>
  );
}
