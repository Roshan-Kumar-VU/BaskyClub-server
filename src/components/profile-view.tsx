import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import type { getProfile } from '@/data/repo';
import { fonts, radius, space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { ClubBadge, CreatorBadge } from './club-badges';
import { Icon } from './icon';
import { MetaLine } from './meta-line';
import { Photo } from './photo';
import { PostCard } from './post-card';
import { PressableScale } from './pressable-scale';
import { SectionHeader } from './stat-tile';
import { Text } from './text';

type Profile = NonNullable<ReturnType<typeof getProfile>>;
const positionName = { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' } as const;

/**
 * Phase 1 profile (#72): cover photo, photo, name, bio, Instagram/YouTube
 * (hidden for under-18), one pinned post, clubs with position, posts.
 * Email, phone and date of birth are never shown. No jersey or stats yet.
 */
export function ProfileView({ p, actions }: { p: Profile; actions?: React.ReactNode }) {
  const { c } = useTheme();
  const links = p.minor
    ? []
    : [
        p.user.instagram && { label: `@${p.user.instagram}`, url: `https://instagram.com/${p.user.instagram}`, ios: 'camera', android: 'photo_camera' },
        p.user.youtube && { label: p.user.youtube, url: `https://youtube.com/@${p.user.youtube}`, ios: 'play.rectangle', android: 'smart_display' },
      ].filter(Boolean) as { label: string; url: string; ios: string; android: string }[];

  return (
    <View style={{ paddingBottom: space.xxl }}>
      <View style={{ height: 150, overflow: 'hidden' }}>
        <Photo fill uri={p.user.coverUrl} seed={`cover-${p.user.userId}`} />
      </View>
      <View style={{ paddingHorizontal: space.lg, marginTop: -40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ padding: 4, borderRadius: 48, backgroundColor: c.background }}>
            <Avatar name={p.user.name} uri={p.user.avatarUrl} size={84} />
          </View>
          {actions && <View style={{ paddingBottom: 6 }}>{actions}</View>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: c.text, flexShrink: 1 }}>{p.user.name}</Text>
          {p.creator && <CreatorBadge />}
        </View>
        {!!p.user.bio && <Text color="textSecondary" style={{ marginTop: space.sm }}>{p.user.bio}</Text>}
        <View style={{ marginTop: space.md, gap: 5 }}>
          <MetaLine ios="mappin" android="location_on" text={p.district?.name} />
          {links.map((l) => (
            <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon ios={l.ios} android={l.android} size={13} color={c.accent} />
              <Text variant="caption" style={{ color: c.accentText, fontFamily: fonts.bodyBold }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.md }}>
          <Text variant="caption" color="textMuted"><Text variant="caption" style={{ fontFamily: fonts.bodyBold, color: c.text }}>{p.followers}</Text> followers</Text>
          <Text variant="caption" color="textMuted"><Text variant="caption" style={{ fontFamily: fonts.bodyBold, color: c.text }}>{p.following}</Text> following</Text>
        </View>
      </View>

      {p.clubs.length > 0 && (
        <>
          <SectionHeader title="Clubs" />
          {p.clubs.map((cl, i) => (
            <PressableScale key={cl.clubId} scaleTo={0.99} onPress={() => router.push({ pathname: '/club/[id]', params: { id: cl.clubId } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <Avatar name={cl.name} size={40} square />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>{cl.name}</Text>
                  <Text variant="caption" color="textMuted">
                    {cl.membership.isPlayer ? (cl.membership.primaryPosition ? positionName[cl.membership.primaryPosition] : 'Player') : 'Member'}
                  </Text>
                </View>
                <ClubBadge kind={cl.kind} affiliated={cl.affiliated} verified={cl.verified} small />
              </View>
            </PressableScale>
          ))}
        </>
      )}

      {p.pinned && (
        <>
          <SectionHeader title="Pinned" action={<Icon ios="pin.fill" android="push_pin" size={14} color={c.accent} />} />
          <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
            <PostCard post={p.pinned} />
          </View>
        </>
      )}

      <SectionHeader title="Posts" />
      {p.posts.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>{p.posts.map((post) => <PostCard key={post.postId} post={post} />)}</View>
      ) : (
        <View style={{ marginHorizontal: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.cardMuted }}>
          <Text color="textMuted">No other posts yet.</Text>
        </View>
      )}
    </View>
  );
}
