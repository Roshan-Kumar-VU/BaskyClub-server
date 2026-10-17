import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ClubRow } from '@/components/club-row';
import { Text } from '@/components/text';
import { getClubs } from '@/data/repositories';
import { useData } from '@/hooks/use-data';
import { space, useTheme } from '@/theme';

export default function ClubsScreen() {
  const { c } = useTheme();
  const [query, setQuery] = useState('');
  const { data } = useData(() => getClubs(query), [query]);

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: 'Search clubs or districts',
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            tintColor: c.accent,
          },
        }}
      />
      <FlashList
        data={data ?? []}
        keyExtractor={(club) => club.clubId}
        contentInsetAdjustmentBehavior="automatic"
        ItemSeparatorComponent={() => <View style={{ height: 1, marginLeft: 80, backgroundColor: c.line }} />}
        ListHeaderComponent={
          <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm }}>
            {data ? `${data.length} clubs in Tamil Nadu` : ' '}
          </Text>
        }
        renderItem={({ item }) => (
          <ClubRow club={item} onPress={() => router.push({ pathname: '/club/[id]', params: { id: item.clubId } })} />
        )}
        ListEmptyComponent={
          data ? (
            <View style={{ padding: space.xxl, alignItems: 'center', gap: space.sm }}>
              <Text variant="heading">No clubs match “{query}”</Text>
              <Text color="textMuted">Try a district name like Chennai or Madurai.</Text>
            </View>
          ) : null
        }
      />
    </>
  );
}
