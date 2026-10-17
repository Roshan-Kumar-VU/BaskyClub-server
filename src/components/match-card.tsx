import { View } from 'react-native';

import type { MatchView } from '@/data/repositories';
import { matchTime } from '@/lib/format';
import { radius, space, type, useTheme } from '@/theme';

import { Avatar } from './avatar';
import { LiveBadge, Tag } from './badge';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

const categoryLabel = { tournament: 'Tournament', friendly: 'Friendly', practice: 'Practice' } as const;

/** Scoreboard-style card. Scores use the display face with tabular figures. */
export function MatchCard({ match, onPress }: { match: MatchView; onPress?: () => void }) {
  const { c } = useTheme();
  const played = match.status !== 'scheduled';
  const aWins = match.status === 'completed' && match.winnerId === match.teamAId;
  const bWins = match.status === 'completed' && match.winnerId === match.teamBId;

  const side = (name: string, score: number, won: boolean, align: 'left' | 'right') => (
    <View style={{ flex: 1, alignItems: align === 'left' ? 'flex-start' : 'flex-end', gap: space.sm }}>
      <View style={{ flexDirection: align === 'left' ? 'row' : 'row-reverse', alignItems: 'center', gap: space.sm }}>
        <Avatar name={name} size={30} square />
        <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1, textAlign: align }}>
          {name}
        </Text>
      </View>
      {played && (
        <Text
          tabular
          style={[type.score, { color: match.status === 'completed' && !won ? c.textMuted : c.text }]}>
          {score}
        </Text>
      )}
    </View>
  );

  return (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      <View
        style={{
          backgroundColor: c.card,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          padding: space.lg,
          gap: space.md,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {match.status === 'live' ? <LiveBadge /> : <Tag label={categoryLabel[match.category]} />}
          {match.status === 'live' && <Tag label={categoryLabel[match.category]} />}
          <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
            {match.status === 'live' ? `Q${match.quarter}` : match.status === 'scheduled' ? matchTime(match.scheduledAt) : 'Final'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: played ? 'flex-end' : 'center', gap: space.md }}>
          {side(match.teamA.teamName ?? 'Team A', match.scoreA, aWins, 'left')}
          <Text variant="caption" color="textMuted" style={{ paddingBottom: played ? 14 : 0 }}>
            {played ? '–' : 'vs'}
          </Text>
          {side(match.teamB.teamName ?? 'Team B', match.scoreB, bWins, 'right')}
        </View>

        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {[match.tournamentName, match.venueText].filter(Boolean).join('  ·  ')}
        </Text>
      </View>
    </PressableScale>
  );
}
