import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { BoxScore } from '@/components/box-score';
import { Button } from '@/components/button';
import { ClubBadge } from '@/components/club-badges';
import { EmptyState } from '@/components/empty-state';
import { FollowButton } from '@/components/follow-button';
import { Hollow } from '@/components/hollow';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { cancelJoinRequest, canManageClub, getClubDetail, getJoinRequests, getMembership, getPendingMembership, requestToJoin } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { initials } from '@/lib/format';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

type Section = 'posts' | 'people';
const BANNER = 250;
const positionName = { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' } as const;

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

  const d = getClubDetail(id, user?.userId);
  if (!d) return <EmptyState ios="shield" android="shield" title="Club not found" />;
  const { club } = d;
  const member = getMembership(id, user?.userId);
  const pending = getPendingMembership(id, user?.userId);
  const manager = canManageClub(id, user?.userId);
  const reqCount = manager ? getJoinRequests(id).length : 0;
  const ini = initials(club.name);

  const person = (key: string, name: string, role: string, userId?: string) => (
    <PressableScale key={key} scaleTo={0.99} disabled={!userId} onPress={() => userId && router.push({ pathname: '/user/[id]', params: { id: userId } })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <Avatar name={name} size={42} />
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{name}</Text>
        <Tag label={role} />
      </View>
    </PressableScale>
  );
  const group = (title: string) => <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm, fontFamily: fonts.bodyBold }}>{title}</Text>;

  return (
    <Animated.ScrollView ref={ref} scrollEventThrottle={16} style={{ backgroundColor: c.background }}>
      <Animated.View style={[{ height: BANNER, overflow: 'hidden' }, banner]}>
        <Photo fill uri={club.bannerUrl} seed={club.clubId} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={{ position: 'absolute', left: -10, bottom: radius.xl + 6, flexDirection: 'row', gap: 14, opacity: 0.7 }}>
          {[0, 1, 2, 3].map((i) => <Hollow key={i} text={ini} size={92} color="#fff" strokeWidth={1.4} width={ini.length * 80} />)}
        </View>
      </Animated.View>

      <View style={{ backgroundColor: c.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -radius.xl }}>
        <View style={{ paddingHorizontal: space.lg, marginTop: -40, gap: space.sm }}>
          <View style={{ borderRadius: 26, padding: 4, backgroundColor: c.background, alignSelf: 'flex-start' }}>
            <Avatar name={club.name} uri={club.logoUrl} size={80} square />
          </View>
          <Text variant="title">{club.name}</Text>
          {!!club.motto && <Text variant="bodyStrong" color="accentText">{club.motto}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <ClubBadge kind={club.kind} affiliated={club.affiliated} verified={club.verified} />
            {club.districtName && <Tag label={club.districtName} />}
          </View>
          {!!club.description && <Text color="textSecondary" style={{ marginTop: space.xs }}>{club.description}</Text>}

          {club.association && (
            <PressableScale onPress={() => router.push({ pathname: '/association/[id]', params: { id: club.association!.id } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, padding: space.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.scoreboard }}>
                <Icon ios="building.columns.fill" android="account_balance" size={18} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" style={{ color: '#fff', fontFamily: fonts.bodyBold }}>{club.association.name}</Text>
                  {d.affiliation?.validUntil && (
                    <Text variant="micro" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {d.affiliation.tnbaNumber}, valid until {new Date(d.affiliation.validUntil).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Icon ios="chevron.right" android="chevron_right" size={13} color="#fff" />
              </View>
            </PressableScale>
          )}

          <View style={{ marginHorizontal: -space.lg, marginTop: space.lg }}>
            <BoxScore items={[{ value: club.memberCount, label: 'Members' }, { value: d.followers, label: 'Followers' }, { value: d.posts.length, label: 'Posts' }]} />
          </View>

          <View style={{ marginTop: space.lg, flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              {member ? (
                <Button kind="secondary" label="Member" icon={<Icon ios="checkmark.circle.fill" android="check_circle" size={18} color={c.success} />} />
              ) : pending ? (
                <Button kind="secondary" label="Requested" onPress={() => cancelJoinRequest(id, user!.userId)} />
              ) : (
                <Button
                  label="Join"
                  onPress={() =>
                    requireLogin(() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      requestToJoin(id, user!.userId);
                    })
                  }
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <FollowButton type="club" id={id} />
            </View>
          </View>
          {pending && <Text variant="caption" color="textMuted">Waiting for the club owner or an admin to accept. Tap Requested to cancel.</Text>}
          {manager && (
            <Button kind="ghost" label={reqCount ? `Join requests (${reqCount})` : 'Join requests'} onPress={() => router.push({ pathname: '/club/[id]/requests', params: { id } })} />
          )}

          <View style={{ marginTop: space.md, marginBottom: space.md }}>
            <Segmented value={section} onChange={setSection} options={[{ value: 'posts', label: 'Posts' }, { value: 'people', label: 'People' }]} />
          </View>
        </View>

        {section === 'posts' &&
          (d.posts.length ? (
            <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>{d.posts.map((p) => <PostCard key={p.postId} post={p} />)}</View>
          ) : (
            <EmptyState ios="photo" android="photo" title="No posts yet" body={`Posts by ${club.name} members show up here.`} />
          ))}

        {section === 'people' && (
          <View>
            {group('Runs the club')}
            <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
              {d.owners.map((u) => person(`o-${u.userId}`, u.name, 'Owner', u.userId))}
              {d.admins.map((u) => person(`a-${u.userId}`, u.name, 'Admin', u.userId))}
              {d.captain && person('cap', d.captain.name, 'Captain', d.captain.userId)}
              {d.coaches.map((co) => person(co.id, co.name, co.role === 'head' ? 'Head coach' : 'Assistant coach', co.userId))}
            </View>
            {d.players.length > 0 && group(`Plays for the club (${d.players.length})`)}
            <View style={{ borderTopWidth: d.players.length ? 1 : 0, borderTopColor: c.line }}>
              {d.players.map((p) => person(p.membership.id, p.user.name, p.membership.primaryPosition ? positionName[p.membership.primaryPosition] : 'Player', p.user.userId))}
            </View>
            {d.others.length > 0 && group('Other members')}
            <View style={{ borderTopWidth: d.others.length ? 1 : 0, borderTopColor: c.line }}>
              {d.others.map((p) => person(p.membership.id, p.user.name, 'Member', p.user.userId))}
            </View>
          </View>
        )}
        <View style={{ height: space.xxl * 2 }} />
      </View>
    </Animated.ScrollView>
  );
}
