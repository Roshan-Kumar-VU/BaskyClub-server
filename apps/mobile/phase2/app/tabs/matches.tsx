import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Chips } from '@/components/chips';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { MatchCard } from '@/components/match-card';
import { ScreenHeader } from '@/components/screen-header';
import { getMatches, type MatchFilter } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useScope } from '@/lib/scope';
import { useSession } from '@/lib/session';
import { space, useTheme } from '@/theme';

const filters: { value: MatchFilter; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'recent', label: 'Recent' },
  { value: 'mine', label: 'Mine' },
];

export default function Matches() {
  useStoreVersion();
  const { c } = useTheme();
  const s = useScope();
  const { user, requireLogin } = useSession();
  const [filter, setFilter] = useState<MatchFilter>('live');
  const data = getMatches(s, filter, user?.userId);
  const where = s.scope === 'district' ? s.districtName : 'India';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader
        title="Matches"
        scoped
        right={
          <Pressable hitSlop={10} onPress={() => requireLogin(() => router.push('/match/new'))}>
            <Icon ios="plus" android="add" size={22} color={c.accent} weight="semibold" />
          </Pressable>
        }>
        <View style={{ paddingVertical: space.md }}>
          <Chips options={filters} value={filter} onChange={setFilter} />
        </View>
      </ScreenHeader>
      <FlashList
        data={data}
        keyExtractor={(m) => m.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        renderItem={({ item }) => <MatchCard match={item} />}
        ListEmptyComponent={
          filter === 'mine' && !user ? (
            <EmptyState ios="person.crop.circle.badge.questionmark" android="person" title="Log in to see your games" action="Log in" onAction={() => router.push('/auth/login')} />
          ) : (
            <EmptyState
              ios="sportscourt"
              android="sports_basketball"
              title={filter === 'live' ? `No live games in ${where}` : filter === 'recent' ? `No recent games in ${where}` : 'No games yet'}
              body="Start a match room and score it live from your phone."
              action="Start a match room"
              onAction={() => requireLogin(() => router.push('/match/new'))}
            />
          )
        }
      />
    </View>
  );
}
