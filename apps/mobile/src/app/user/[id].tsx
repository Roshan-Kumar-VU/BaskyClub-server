// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import { Stack, useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { Text } from '@/components/text';

import { EmptyState } from '@/components/empty-state';
import { FollowButton } from '@/components/follow-button';
import { ProfileView } from '@/components/profile-view';
import { getProfile } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme';

export default function UserPage() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const p = getProfile(id);
  if (!p) return <EmptyState ios="person" android="person" title="Profile not found" />;
  return (
    <>
      <Stack.Screen options={{ title: p.user.name }} />
      <ScrollView style={{ backgroundColor: c.background }}>
        <ProfileView p={p} actions={user?.userId !== id ? <FollowButton type="user" id={id} compact /> : undefined} />
        {!!user && user.userId !== id && (
          <Text variant="caption" color="textMuted" style={{ textAlign: 'center', paddingBottom: 40 }} onPress={() => router.push({ pathname: '/report', params: { type: 'user', id } })}>Report this account</Text>
        )}
      </ScrollView>
    </>
  );
}
