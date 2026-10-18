import { router } from 'expo-router';
import { View } from 'react-native';

import type { MatchView } from '@/data/repo';
import { timeAgo } from '@/lib/format';
import { radius, space, type, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { LiveBadge, Tag } from './badge';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export const categoryLabel = { tournament: 'Tournament', friendly: 'Friendly', practice: 'Practice' } as const;

/** Scoreboard-style card. Scores use the display face with tabular figures. */
export function MatchCard({ match, compactWidth }: { match: MatchView; compactWidth?: number }) {
  const { c } = useTheme();
  const done = match.status === 'completed';
  const aWon = done && match.scoreA > match.scoreB;
  const bWon = done && match.scoreB > match.scoreA;

  const row = (name: string, score: number, won: boolean, dim: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Avatar name={name} size={28} square />
      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, opacity: dim ? 0.55 : 1 }}>{name}</Text>
      <Text tabular style={[type.stat, { color: dim ? c.textMuted : c.text }]}>{score}</Text>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: won ? c.accent : 'transparent' }} />
    </View>
  );

  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}>
      <View style={{ width: compactWidth, backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {match.status === 'live' && <LiveBadge />}
          <Tag label={categoryLabel[match.category]} />
          <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
            {match.status === 'live' ? `Q${match.quarter}` : `Final · ${timeAgo(match.scheduledAt)}`}
          </Text>
        </View>
        {row(match.sideA.name, match.scoreA, aWon, bWon)}
        {row(match.sideB.name, match.scoreB, bWon, aWon)}
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {[match.tournamentName, match.venueText, match.districtName].filter(Boolean).join('  ·  ')}
        </Text>
      </View>
    </PressableScale>
  );
}
