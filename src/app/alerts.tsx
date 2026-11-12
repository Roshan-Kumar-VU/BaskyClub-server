// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Text } from '@/components/text';
import { getAlerts } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { ago } from '@/lib/format';
import { useSession } from '@/lib/session';
import { space, useTheme } from '@/theme';

const audienceLabel = {
  club_admins_in_area: 'Club owners and admins in the area',
  affiliated_members: 'Members of affiliated clubs',
  district_users: 'Everyone in the district',
  followers: 'Followers',
  club_members: 'Club members',
  everyone: 'Everyone on BaskyCLub',
} as const;

/** Alerts inbox: announcements from associations, clubs and the BaskyCLub team (#75). No likes or comments. */
export default function Alerts() {
  useStoreVersion();
  const { c } = useTheme();
  const { user } = useSession();
  const alerts = getAlerts(user?.userId);
  if (!alerts.length) return <EmptyState ios="bell" android="notifications_none" title="No alerts yet" body="Announcements from your clubs and district association show up here." />;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: space.xxl }}>
      {alerts.map((a) => (
        <PressableScale key={a.id} scaleTo={0.99} disabled={!a.feedPostId} onPress={() => a.feedPostId && router.push({ pathname: '/post/[id]', params: { id: a.feedPostId } })}>
          <View style={{ flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: c.line }}>
            {a.senderKind === 'basky' ? (
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Icon ios="basketball.fill" android="sports_basketball" size={22} color="#fff" />
              </View>
            ) : (
              <Avatar name={a.senderName} size={44} square />
            )}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text variant="caption" color={a.senderKind === 'association' ? 'official' : 'textSecondary'} numberOfLines={1} style={{ flex: 1, fontFamily: 'Manrope_700Bold' }}>{a.senderName}</Text>
                <Text variant="caption" color="textMuted">{ago(a.createdAt)}</Text>
              </View>
              <Text variant="subheading">{a.title}</Text>
              <Text color="textSecondary">{a.body}</Text>
              <Text variant="micro" color="textMuted" style={{ marginTop: 2 }}>Sent to: {audienceLabel[a.audience]}</Text>
            </View>
          </View>
        </PressableScale>
      ))}
    </ScrollView>
  );
}
