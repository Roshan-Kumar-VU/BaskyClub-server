import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ProfileView } from '@/components/profile-view';
import { getProfile } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import { useTheme } from '@/theme';

export default function UserPage() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, requireLogin } = useSession();
  const [following, setFollowing] = useState(false);
  const p = getProfile(id);
  if (!p) return <EmptyState ios="person" android="person" title="Player not found" />;
  const me = user?.userId === id;
  return (
    <>
      <Stack.Screen options={{ title: p.user.name }} />
      <ScrollView style={{ backgroundColor: c.background }}>
        <ProfileView
          p={p}
          actions={!me && <Button kind={following ? 'secondary' : 'primary'} label={following ? 'Following' : 'Follow'} onPress={() => requireLogin(() => setFollowing((v) => !v))} />}
        />
      </ScrollView>
    </>
  );
}
