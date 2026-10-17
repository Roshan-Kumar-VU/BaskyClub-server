import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { PlayerProfileView } from '@/components/player-profile';
import { getPlayer } from '@/data/repositories';
import { useData } from '@/hooks/use-data';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useData(() => getPlayer(id), [id]);
  return (
    <>
      <Stack.Screen options={{ title: data?.user.name ?? '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">{data && <PlayerProfileView profile={data} />}</ScrollView>
    </>
  );
}
