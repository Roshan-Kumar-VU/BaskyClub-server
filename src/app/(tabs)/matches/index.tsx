import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { MatchCard } from '@/components/match-card';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { getMatches, type MatchFilter } from '@/data/repositories';
import { useData } from '@/hooks/use-data';
import { space } from '@/theme';

const tabs: { value: MatchFilter; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'results', label: 'Results' },
];

const empty: Record<MatchFilter, string> = {
  live: 'No games are live right now.',
  upcoming: 'No games scheduled yet.',
  results: 'Finished games will show here.',
};

export default function MatchesScreen() {
  const [tab, setTab] = useState<MatchFilter>('live');
  const { data } = useData(() => getMatches(tab), [tab]);

  return (
    <FlashList
      data={data ?? []}
      keyExtractor={(m) => m.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      ListHeaderComponent={
        <View style={{ gap: space.lg, paddingTop: space.md, paddingBottom: space.lg }}>
          <Button
            label="Start a match room"
            icon={<Icon ios="plus" android="add" size={18} color="#fff" weight="bold" />}
            onPress={() => Alert.alert('Coming next', 'Match rooms with live scoring are the next build step.')}
          />
          <Segmented options={tabs} value={tab} onChange={setTab} />
        </View>
      }
      renderItem={({ item }) => <MatchCard match={item} />}
      ListEmptyComponent={data ? <Text color="textMuted" style={{ textAlign: 'center', padding: space.xxl }}>{empty[tab]}</Text> : null}
    />
  );
}
