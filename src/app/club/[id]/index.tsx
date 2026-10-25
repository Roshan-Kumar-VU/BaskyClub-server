import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { ClubBadge } from '@/components/club-badges';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { Segmented } from '@/components/segmented';
import { BoxScore } from '@/components/box-score';
import { Hollow } from '@/components/hollow';
import { Text } from '@/components/text';
import { cancelJoinRequest, canManageClub, getClubDetail, getClubRequests, getMembership, getMyJoinRequest, requestToJoin } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';
import { initials } from '@/lib/format';

type Section = 'posts' | 'people';
const BANNER = 250;

export default function ClubPage() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, requireLogin } = useSession();
  const [section, setSection] = useState<Section>('posts');
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(ref);
  const banner = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(offset.value, [-BANNER, 0, BANNER], [-BANNER / 2, 0, BANNER * 0.5]) },
      { scale: interpolate(offset.value, [-BANNER, 0, BANNER], [2, 1, 1]) },
    ],
  }));

  const d = getClubDetail(id);
  if (!d) return <EmptyState ios="shield" android="shield" title="Club not found" />;
  const { club } = d;
  const member = getMembership(id, user?.userId);
  const pending = getMyJoinRequest(id, user?.userId);
  const manager = canManageClub(id, user?.userId);
  const reqCount = manager ? getClubRequests(id).joinRequests.length : 0;
  const kind = club.category === 'academy' ? 'academy' : 'club';

  const person = (key: string, name: string, role: string, userId?: string) => (
    <PressableScale key={key} scaleTo={0.99} disabled={!userId} onPress={() => userId && router.push({ pathname: '/user/[id]', params: { id: userId } })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <Avatar name={name} size={42} />
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{name}</Text>
        <Tag label={role} />
      </View>
    </PressableScale>
  );

  return (
    <Animated.ScrollView ref={ref} scrollEventThrottle={16} style={{ backgroundColor: c.background }}>
      <Animated.View style={[{ height: BANNER, overflow: 'hidden' }, banner]}>
        <Photo fill uri={club.bannerImageUrl} seed={club.clubId} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
        {/* Jersey side-panel: hollow club initials across the banner */}
        <View pointerEvents="none" style={{ position: 'absolute', left: -10, bottom: radius.xl + 6, flexDirection: 'row', gap: 14, opacity: 0.7 }}>
          {[0, 1, 2, 3].map((i) => (
            <Hollow key={i} text={initials(club.clubName)} size={92} color="#fff" strokeWidth={1.4} width={initials(club.clubName).length * 80} />
          ))}
        </View>
      </Animated.View>

      <View style={{ backgroundColor: c.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -radius.xl }}>
        <View style={{ paddingHorizontal: space.lg, marginTop: -40, gap: space.sm }}>
          <View style={{ borderRadius: 26, padding: 4, backgroundColor: c.background, alignSelf: 'flex-start' }}>
            <Avatar name={club.clubName} uri={club.logoUrl} size={80} square />
          </View>
          <Text variant="title">{club.clubName}</Text>
          {!!club.teamMotto && <Text variant="bodyStrong" color="accentText">{club.teamMotto}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <ClubBadge category={club.category} verified={club.isVerified} />
            {club.districtName && <Tag label={club.districtName} />}
          </View>
          {!!club.description && <Text color="textSecondary" style={{ marginTop: space.xs }}>{club.description}</Text>}

          {club.association && (
            <PressableScale onPress={() => router.push({ pathname: '/association/[id]', params: { id: club.association!.id } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, padding: space.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.scoreboard }}>
                <Icon ios="building.columns.fill" android="account_balance" size={18} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" style={{ color: '#fff', fontFamily: fonts.bodyBold }}>{club.association.name}</Text>
                  {d.affiliation && <Text variant="micro" style={{ color: 'rgba(255,255,255,0.75)' }}>{d.affiliation.tnbaMembershipNumber}, valid until {new Date(d.affiliation.validUntil).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Text>}
                </View>
                <Icon ios="chevron.right" android="chevron_right" size={13} color="#fff" />
              </View>
            </PressableScale>
          )}


          <View style={{ marginHorizontal: -space.lg, marginTop: space.lg }}>
            <BoxScore items={[{ value: club.memberCount, label: 'Members' }, { value: d.posts.length, label: 'Posts' }, { value: d.headCoach ? 1 + d.assistantCoaches.length : 0, label: 'Coaches' }]} />
          </View>

          <View style={{ marginTop: space.lg, gap: space.sm }}>
            {member ? (
              <Button kind="secondary" label={member.isOwner ? `You own this ${kind}` : `You're a member`} icon={<Icon ios="checkmark.circle.fill" android="check_circle" size={18} color={c.success} />} />
            ) : pending ? (
              <Button kind="secondary" label="Request sent. Tap to cancel" onPress={() => cancelJoinRequest(id, user!.userId)} />
            ) : (
              <Button
                label={`Request to join`}
                onPress={() =>
                  requireLogin(() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    requestToJoin(id, user!.userId);
                  })
                }
              />
            )}
            {manager && (
              <Button kind="ghost" label={reqCount ? `Requests and invites (${reqCount})` : 'Requests and invites'} onPress={() => router.push({ pathname: '/club/[id]/requests', params: { id } })} />
            )}
          </View>

          <View style={{ marginTop: space.lg, marginBottom: space.md }}>
            <Segmented value={section} onChange={setSection} options={[{ value: 'posts', label: 'Posts' }, { value: 'people', label: 'People' }]} />
          </View>
        </View>

        {section === 'posts' &&
          (d.posts.length ? <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>{d.posts.map((p) => <PostCard key={p.postId} post={p} />)}</View> : <EmptyState ios="photo" android="photo" title="No posts yet" body={`Posts by ${club.clubName} members show up here.`} />)}

        {section === 'people' && (
          <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
            {d.captain && person('cap', d.captain.name, 'Club captain', d.captain.userId)}
            {d.headCoach && person('hc', d.headCoach.name, 'Head coach', d.headCoach.userId)}
            {d.assistantCoaches.map((a) => person(a.id, a.name, 'Assistant coach', a.userId))}
            {d.players.filter((p) => p.user.userId !== club.captainUserId).map((p) => person(p.membership.id, p.user.name, p.membership.isOwner ? 'Owner' : p.membership.position ?? 'Player', p.user.userId))}
          </View>
        )}
        <View style={{ height: space.xxl * 2 }} />
      </View>
    </Animated.ScrollView>
  );
}
