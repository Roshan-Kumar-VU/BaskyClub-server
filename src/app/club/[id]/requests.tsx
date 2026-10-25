import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Text } from '@/components/text';
import { answerJoinRequest, canManageClub, getClubDetail, getJoinRequests } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { ago } from '@/lib/format';
import { useSession } from '@/lib/session';
import { radius, space, useTheme } from '@/theme';

/**
 * Owner/admin: pending memberships (join requests, #63). Club ↔ association
 * linking screens come after app testing (#69).
 */
export default function ClubRequests() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const d = getClubDetail(id, user?.userId);
  if (!d) return null;
  if (!canManageClub(id, user?.userId)) {
    return <EmptyState ios="lock.fill" android="lock" title="Owners and admins only" body={`Only ${d.club.name}'s owner or admins can see join requests.`} />;
  }
  const requests = getJoinRequests(id);
  if (!requests.length) return <EmptyState ios="person.badge.plus" android="person_add" title="No join requests" body="New requests to join the club show up here." />;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {requests.map((r) => (
        <View key={r.id} style={{ backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: c.line, padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={r.user.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="subheading">{r.user.name}</Text>
              <Text variant="caption" color="textMuted">Asked to join {ago(r.requestedAt)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><Button compact label="Accept" onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); answerJoinRequest(r.id, true); }} /></View>
            <View style={{ flex: 1 }}><Button compact kind="secondary" label="Decline" onPress={() => answerJoinRequest(r.id, false)} /></View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
