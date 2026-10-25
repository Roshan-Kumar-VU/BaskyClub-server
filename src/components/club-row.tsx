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

/** Flat club row: name, place and size on icon lines, then the badge. */
export function ClubRow({ club }: { club: ClubSummary }) {
  const { c } = useTheme();
  const members = club.memberCount ? `${club.memberCount} ${club.memberCount === 1 ? 'member' : 'members'}` : undefined;
  return (
    <PressableScale scaleTo={0.985} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.clubId } })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
        <Avatar name={club.name} uri={club.logoUrl} size={54} square />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="subheading" numberOfLines={1}>{club.name}</Text>
          <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
            <MetaLine ios="mappin" android="location_on" text={club.districtName} />
            <MetaLine ios="person.2" android="group" text={members} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            <ClubBadge kind={club.kind} affiliated={club.affiliated} verified={club.verified} small />
          </View>
        </View>
        <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} weight="semibold" />
      </View>
    </PressableScale>
  );
}
