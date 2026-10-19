import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Text } from '@/components/text';
import { EmptyState } from '@/components/empty-state';
import { answerInvite, answerJoinRequest, canManageClub, getClubDetail, getClubRequests, requestAffiliation } from '@/data/repo';
import { useSession } from '@/lib/session';
import { useStoreVersion } from '@/data/store';
import { timeAgo } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

/** Owner/admin: join requests, association invites, and the link request to the association. */
export default function ClubRequests() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [tnba, setTnba] = useState('');
  const d = getClubDetail(id);
  if (!d) return null;
  // Opened by link? Only the club owner or admins may see this (decision #9; the API must check too).
  if (!canManageClub(id, user?.userId)) {
    return <EmptyState ios="lock.fill" android="lock" title="Owners and admins only" body={`Only ${d.club.clubName}'s owner or admins can manage requests.`} />;
  }
  const { joinRequests, invites } = getClubRequests(id);
  const assoc = d.coveringAssociation;
  const linkPending = invites.find((i) => i.direction === 'club_to_association' && i.status === 'pending');

  const card = (children: React.ReactNode, key?: string) => (
    <View key={key} style={{ backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md }}>{children}</View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 }}>
      <Text variant="heading">Join requests</Text>
      {joinRequests.length === 0 && <Text color="textMuted">No pending requests.</Text>}
      {joinRequests.map((r) =>
        card(
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar name={r.user.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="subheading">{r.user.name}</Text>
                <Text variant="caption" color="textMuted">Asked to join · {timeAgo(r.createdAt)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><Button compact label="Accept" onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); answerJoinRequest(r.id, true); }} /></View>
              <View style={{ flex: 1 }}><Button compact kind="secondary" label="Decline" onPress={() => answerJoinRequest(r.id, false)} /></View>
            </View>
          </>,
          r.id,
        ),
      )}

      <Text variant="heading" style={{ marginTop: space.lg }}>Association</Text>
      {d.club.category === 'affiliated' && d.club.association ? (
        card(<Text>Affiliated with {d.club.association.name}{d.affiliation ? ` (${d.affiliation.tnbaMembershipNumber})` : ''}.</Text>)
      ) : d.club.category === 'academy' ? (
        card(<Text color="textSecondary">Academies are verified by the BaskyCLub team, not by associations.</Text>)
      ) : !assoc ? (
        card(<Text color="textSecondary">No association covers this district yet.</Text>)
      ) : linkPending ? (
        card(
          <>
            <Tag label="Link request pending" />
            <Text color="textSecondary">
              Sent to {assoc.name} with TNBA number {linkPending.tnbaMembershipNumber}.
              {assoc.isPlaceholder ? ' It will wait until the association claims its page on BaskyCLub.' : ''}
            </Text>
          </>,
        )
      ) : (
        card(
          <>
            <Text color="textSecondary">Registered with TNBA? Send a link request to {assoc.name}.</Text>
            <Field label="TNBA membership number" value={tnba} onChangeText={setTnba} placeholder="e.g. TNBA/CHN/0123" autoCapitalize="characters" />
            <Button
              label="Send link request"
              disabled={!tnba.trim()}
              onPress={() => {
                requestAffiliation(id, assoc.id, tnba.trim());
                Alert.alert('Request sent', assoc.isPlaceholder ? `${assoc.name} isn't on BaskyCLub yet. Your request will wait until they claim their page.` : `${assoc.name} will review your request.`);
              }}
            />
          </>,
        )
      )}

      {invites.filter((i) => i.direction === 'association_to_club' && i.status === 'pending').map((i) =>
        card(
          <>
            <Text variant="subheading">{i.organization.name} invited you to affiliate</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><Button compact label="Accept" onPress={() => answerInvite(i.id, true)} /></View>
              <View style={{ flex: 1 }}><Button compact kind="secondary" label="Decline" onPress={() => answerInvite(i.id, false)} /></View>
            </View>
          </>,
          i.id,
        ),
      )}
    </ScrollView>
  );
}
