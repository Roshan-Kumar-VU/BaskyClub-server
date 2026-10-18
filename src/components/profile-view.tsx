import { router } from 'expo-router';
import { View } from 'react-native';

import type { getProfile } from '@/data/repo';
import { radius, space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { ClubBadge } from './club-badges';
import { MatchCard } from './match-card';
import { PostCard } from './post-card';
import { PressableScale } from './pressable-scale';
import { SectionHeader, StatTile } from './stat-tile';
import { Text } from './text';

type Profile = NonNullable<ReturnType<typeof getProfile>>;
const per = (t: number, g: number) => (g ? (t / g).toFixed(1) : '–');

/** Player profile body, shared by the Profile tab and public player pages. */
export function ProfileView({ p, actions }: { p: Profile; actions?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingBottom: space.xxl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.lg }}>
        <Avatar name={p.user.name} uri={p.user.avatarUrl} size={84} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
          {[
            { v: p.matchCounts.tournament + p.matchCounts.friendly + p.matchCounts.practice, l: 'Games' },
            { v: p.posts.length, l: 'Posts' },
            { v: p.clubs.length, l: 'Clubs' },
          ].map((x) => (
            <View key={x.l} style={{ alignItems: 'center' }}>
              <Text variant="heading" tabular>{x.v}</Text>
              <Text variant="caption" color="textMuted">{x.l}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: 2 }}>
        <Text variant="subheading">{p.user.name}</Text>
        <Text color="textSecondary">{[p.position, p.district?.name].filter(Boolean).join('  ·  ') || 'Basketball player'}</Text>
      </View>
      {actions && <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>{actions}</View>}

      <SectionHeader title="Games played" />
      <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg }}>
        <StatTile value={p.matchCounts.tournament} label="Tournament" />
        <StatTile value={p.matchCounts.friendly} label="Friendly" />
        <StatTile value={p.matchCounts.practice} label="Practice" />
      </View>

      {p.stats && (
        <>
          <SectionHeader title="Per game" />
          <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg }}>
            <StatTile value={per(p.stats.totalPoints, p.stats.matchesPlayed)} label="Points" />
            <StatTile value={per(p.stats.totalRebounds, p.stats.matchesPlayed)} label="Rebounds" />
            <StatTile value={per(p.stats.totalAssists, p.stats.matchesPlayed)} label="Assists" />
          </View>
        </>
      )}

      {p.clubs.length > 0 && (
        <>
          <SectionHeader title="Clubs" />
          <View style={{ marginHorizontal: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card, overflow: 'hidden' }}>
            {p.clubs.map((club, i) => (
              <PressableScale key={club.clubId} scaleTo={0.99} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.clubId } })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderTopWidth: i ? 0.5 : 0, borderTopColor: c.line }}>
                  <Avatar name={club.clubName} size={40} square />
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{club.clubName}</Text>
                  <ClubBadge category={club.category} verified={club.isVerified} small />
                </View>
              </PressableScale>
            ))}
          </View>
        </>
      )}

      {p.recentMatches.length > 0 && (
        <>
          <SectionHeader title="Recent games" />
          <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
            {p.recentMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </View>
        </>
      )}

      {p.posts.length > 0 && (
        <>
          <SectionHeader title="Posts" />
          {p.posts.map((post) => <PostCard key={post.postId} post={post} />)}
        </>
      )}
    </View>
  );
}
