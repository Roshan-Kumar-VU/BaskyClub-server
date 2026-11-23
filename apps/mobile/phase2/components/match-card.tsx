import { router } from 'expo-router';
import { View } from 'react-native';

import type { MatchView } from '@/data/repo';
import { ago } from '@/lib/format';
import { fonts, radius, space, useTheme } from '@/theme';

import { MetaLine } from './meta-line';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export const categoryLabel = { tournament: 'Tournament', friendly: 'Friendly', practice: 'Practice' } as const;

/** A small scoreboard: paint-blue strip on top, two rows of big numerals. */
export function MatchCard({ match, compactWidth }: { match: MatchView; compactWidth?: number }) {
  const { c } = useTheme();
  const done = match.status === 'completed';
  const aWon = done && match.scoreA > match.scoreB;
  const bWon = done && match.scoreB > match.scoreA;
  const live = match.status === 'live';

  const row = (name: string, score: number, won: boolean, lost: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, color: lost ? c.textMuted : c.text }}>{name}</Text>
      {won && <View style={{ width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderRightWidth: 7, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: c.accent }} />}
      <Text tabular style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1, color: lost ? c.textMuted : c.text, minWidth: 48, textAlign: 'right' }}>{score}</Text>
    </View>
  );

  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}>
      <View style={{ width: compactWidth, backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 7, backgroundColor: live ? c.scoreboard : c.cardMuted }}>
          {live && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5449' }} />}
          <Text variant="micro" style={{ color: live ? '#fff' : c.textSecondary, flex: 1 }}>
            {live ? `Live, quarter ${match.quarter}` : `Final, ${ago(match.scheduledAt)}`}
          </Text>
          <Text variant="micro" style={{ color: live ? 'rgba(255,255,255,0.75)' : c.textMuted }}>{categoryLabel[match.category]}</Text>
        </View>
        <View style={{ padding: space.lg, paddingTop: space.md, gap: 2 }}>
          {row(match.sideA.name, match.scoreA, aWon, bWon)}
          {row(match.sideB.name, match.scoreB, bWon, aWon)}
          <View style={{ marginTop: space.sm, gap: 3 }}>
            <MetaLine ios="trophy" android="emoji_events" text={match.tournamentName} />
            <MetaLine ios="mappin" android="location_on" text={[match.venueText, match.districtName].filter(Boolean).join(', ')} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}
