import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { Chips } from '@/components/chips';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { Text } from '@/components/text';
import { Wordmark } from '@/components/wordmark';
import { type FeedFilter, getFeed } from '@/data/repositories';
import { useData } from '@/hooks/use-data';
import { space, useTheme } from '@/theme';

const filters: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'For you' },
  { value: 'official', label: 'Associations' },
  { value: 'clubs', label: 'Clubs' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'creators', label: 'Creators' },
];

export default function HomeScreen() {
  const { c } = useTheme();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const { data, refreshing, refresh } = useData(() => getFeed(filter), [filter]);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <Wordmark size={21} />,
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => router.push('/login')}>
              <Icon ios="plus.circle.fill" android="add_circle" size={26} color={c.accent} />
            </Pressable>
          ),
        }}
      />
      <FlashList
        data={data ?? []}
        keyExtractor={(p) => p.postId}
        renderItem={({ item }) => <PostCard post={item} />}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
        ListHeaderComponent={
          <View style={{ paddingVertical: space.md }}>
            <Chips options={filters} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          data ? (
            <View style={{ padding: space.xxl, alignItems: 'center', gap: space.sm }}>
              <Text variant="heading">Nothing here yet</Text>
              <Text color="textMuted" style={{ textAlign: 'center' }}>Posts from this group will show up here.</Text>
            </View>
          ) : null
        }
      />
    </>
  );
}
