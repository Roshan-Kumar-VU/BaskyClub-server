import { router } from 'expo-router';
import { View } from 'react-native';

import type { getProfile } from '@/data/repo';
import { fonts, space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { BoxScore } from './box-score';
import { ClubBadge } from './club-badges';
import { Hollow } from './hollow';
import { MatchCard } from './match-card';
import { MetaLine } from './meta-line';
import { PostCard } from './post-card';
import { PressableScale } from './pressable-scale';
import { SectionHeader } from './stat-tile';
import { Text } from './text';

type Profile = NonNullable<ReturnType<typeof getProfile>>;
const per = (t: number, g: number) => (g ? (t / g).toFixed(1) : '–');
const positionName = { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' } as const;

/**
 * Player profile, shared by the Profile tab and player pages. The jersey
 * number sits huge and hollow behind the name — the one bold element.
 */
export function ProfileView({ p, actions }: { p: Profile; actions?: React.ReactNode }) {
  const { c } = useTheme();
  const games = p.matchCounts.tournament + p.matchCounts.friendly + p.matchCounts.practice;
  const club = p.clubs.find((x) => x.category !== 'academy') ?? p.clubs[0];

  return (
    <View style={{ paddingBottom: space.xxl }}>
      {/* Jersey header */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl, overflow: 'hidden' }}>
        {p.jerseyNumber && (
          <View pointerEvents="none" style={{ position: 'absolute', right: -6, top: -14, opacity: 0.55 }}>
            <Hollow text={p.jerseyNumber} size={190} color={c.accent} strokeWidth={2} anchor="end" width={240} />
          </View>
        )}
        <Avatar name={p.user.name} uri={p.user.avatarUrl} size={72} />
        <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: c.text, marginTop: space.lg, maxWidth: '75%' }}>
          {p.user.name}
        </Text>
        <View style={{ marginTop: space.sm, gap: 4 }}>
          {p.position && <MetaLine ios="figure.basketball" android="sports_basketball" text={`${positionName[p.position]}${p.jerseyNumber ? `, number ${p.jerseyNumber}` : ''}`} color={c.accent} />}
          <MetaLine ios="shield" android="shield" text={club?.clubName} />
          <MetaLine ios="mappin" android="location_on" text={p.district?.name} />
        </View>
        {actions && <View style={{ marginTop: space.lg }}>{actions}</View>}
      </View>

      {p.stats && (
        <>
          <SectionHeader title="Per game" />
          <BoxScore
            items={[
              { value: per(p.stats.totalPoints, p.stats.matchesPlayed), label: 'Points' },
              { value: per(p.stats.totalRebounds, p.stats.matchesPlayed), label: 'Rebounds' },
              { value: per(p.stats.totalAssists, p.stats.matchesPlayed), label: 'Assists' },
            ]}
          />
          <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>From tournament games only.</Text>
        </>
      )}

      <SectionHeader title={`${games} ${games === 1 ? 'game' : 'games'} played`} />
      <BoxScore
        items={[
          { value: p.matchCounts.tournament, label: 'Tournament' },
          { value: p.matchCounts.friendly, label: 'Friendly' },
          { value: p.matchCounts.practice, label: 'Practice' },
        ]}
      />

      {p.clubs.length > 0 && (
        <>
          <SectionHeader title="Clubs" />
          {p.clubs.map((cl, i) => (
            <PressableScale key={cl.clubId} scaleTo={0.99} onPress={() => router.push({ pathname: '/club/[id]', params: { id: cl.clubId } })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <Avatar name={cl.clubName} size={40} square />
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{cl.clubName}</Text>
                <ClubBadge category={cl.category} verified={cl.isVerified} small />
              </View>
            </PressableScale>
          ))}
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
          <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>{p.posts.map((post) => <PostCard key={post.postId} post={post} />)}</View>
        </>
      )}
    </View>
  );
}
