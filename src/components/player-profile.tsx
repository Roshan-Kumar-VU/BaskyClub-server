import { router } from 'expo-router';
import { View } from 'react-native';

import type { PlayerProfile } from '@/data/repositories';
import { radius, space, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { VerifiedMark } from './badge';
import { MatchCard } from './match-card';
import { PostCard } from './post-card';
import { PressableScale } from './pressable-scale';
import { SectionHeader, StatTile } from './stat-tile';
import { Text } from './text';

const per = (total: number, games: number) => (games ? (total / games).toFixed(1) : '–');

/** Shared by the Profile tab (you) and player pages (others). */
export function PlayerProfileView({ profile }: { profile: PlayerProfile }) {
  const { c } = useTheme();
  const { user, club, stats } = profile;

  return (
    <View style={{ paddingBottom: space.xxl }}>
      <View style={{ alignItems: 'center', paddingTop: space.lg, paddingHorizontal: space.lg, gap: space.sm }}>
        <Avatar name={user.name} uri={user.avatarUrl} size={96} />
        <Text variant="title" style={{ marginTop: space.sm }}>{user.name}</Text>
        <Text color="textSecondary">
          {[profile.position, profile.districtName].filter(Boolean).join('  ·  ') || 'Basketball player'}
        </Text>
        {club && (
          <PressableScale onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.clubId } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: radius.full, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
              <Avatar name={club.clubName} size={24} square />
              <Text variant="caption" style={{ fontFamily: 'Manrope_700Bold' }}>{club.clubName}</Text>
              {club.isVerified && <VerifiedMark size={12} />}
            </View>
          </PressableScale>
        )}
      </View>

      {stats && (
        <>
          <SectionHeader title="Career" />
          <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg }}>
            <StatTile value={stats.matchesPlayed} label="Games" />
            <StatTile value={per(stats.totalPoints, stats.matchesPlayed)} label="Points" />
            <StatTile value={per(stats.totalRebounds, stats.matchesPlayed)} label="Rebounds" />
            <StatTile value={per(stats.totalAssists, stats.matchesPlayed)} label="Assists" />
          </View>
          <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
            Per-game averages across tournament games.
          </Text>
        </>
      )}

      {profile.matches.length > 0 && (
        <>
          <SectionHeader title="Recent games" />
          <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
            {profile.matches.slice(0, 3).map((m) => <MatchCard key={m.id} match={m} />)}
          </View>
        </>
      )}

      {profile.posts.length > 0 && (
        <>
          <SectionHeader title="Posts" />
          {profile.posts.map((p) => <PostCard key={p.postId} post={p} />)}
        </>
      )}
    </View>
  );
}
