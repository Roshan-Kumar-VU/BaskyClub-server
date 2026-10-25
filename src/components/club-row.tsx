import { router } from 'expo-router';
import { View } from 'react-native';

import type { ClubSummary } from '@/data/repo';
import { space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { ClubBadge } from './club-badges';
import { Icon } from './icon';
import { MetaLine } from './meta-line';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

/** Flat club row: name, badge, then one line each for place and size. */
export function ClubRow({ club }: { club: ClubSummary }) {
  const { c } = useTheme();
  const members = club.memberCount ? `${club.memberCount} ${club.memberCount === 1 ? 'member' : 'members'}` : undefined;
  return (
    <PressableScale scaleTo={0.985} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.clubId } })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
        <Avatar name={club.clubName} uri={club.logoUrl} size={54} square />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>{club.clubName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
            <MetaLine ios="mappin" android="location_on" text={club.districtName} />
            <MetaLine ios="person.2" android="group" text={members} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            <ClubBadge category={club.category} verified={club.isVerified} small />
          </View>
        </View>
        <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} weight="semibold" />
      </View>
    </PressableScale>
  );
}
