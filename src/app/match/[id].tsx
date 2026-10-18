import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { LiveBadge, Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { categoryLabel } from '@/components/match-card';
import { PressableScale } from '@/components/pressable-scale';
import { Text } from '@/components/text';
import { getMatch, handOverScoring, nextQuarter, scorePoints } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

/** Match room: live scoreboard. The scorer's phone gets the +1/+2/+3 pad. */
export default function MatchRoom() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const data = getMatch(id);
  const bumpA = useSharedValue(1);
  const bumpB = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: bumpA.value }] }));
  const bStyle = useAnimatedStyle(() => ({ transform: [{ scale: bumpB.value }] }));
  if (!data) return <EmptyState ios="questionmark" android="help" title="Match not found" />;
  const { match, playersA, playersB, scorer } = data;
  const isScorer = !!user && user.userId === match.scorerUserId && match.status === 'live';

  const score = (side: 'A' | 'B', pts: number) => {
    Haptics.impactAsync(pts > 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    (side === 'A' ? bumpA : bumpB).value = withSequence(withSpring(1.18, { damping: 6, stiffness: 500 }), withSpring(1));
    scorePoints(match.id, side, pts);
  };

  const handOver = () => {
    const others = [...playersA, ...playersB].filter((p) => p.userId !== user?.userId);
    if (!others.length) return Alert.alert('No other players', 'Add players with accounts to hand over scoring.');
    Alert.alert('Hand over scoring', 'Who should score from now on?', [
      ...others.slice(0, 4).map((p) => ({ text: p.name, onPress: () => handOverScoring(match.id, p.userId) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const pad = (side: 'A' | 'B') => (
    <View style={{ flex: 1, gap: space.sm }}>
      {[1, 2, 3].map((p) => (
        <PressableScale key={p} onPress={() => score(side, p)} scaleTo={0.94}>
          <View style={{ height: 52, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: '#fff' }}>+{p}</Text>
          </View>
        </PressableScale>
      ))}
      <PressableScale onPress={() => score(side, -1)} scaleTo={0.94}>
        <View style={{ height: 40, borderRadius: radius.md, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption" color="textSecondary" style={{ fontFamily: fonts.bodyBold }}>Undo 1</Text>
        </View>
      </PressableScale>
    </View>
  );

  const roster = (name: string, players: typeof playersA) => (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.md, gap: space.sm }}>
      <Text variant="subheading" numberOfLines={1}>{name}</Text>
      {players.length === 0 && <Text variant="caption" color="textMuted">No players listed</Text>}
      {players.map((p) => (
        <PressableScale key={p.userId} onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.userId } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Avatar name={p.name} size={28} />
            <Text variant="caption" numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodySemi }}>{p.name}</Text>
          </View>
        </PressableScale>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: categoryLabel[match.category], headerRight: () => (
        <Text variant="bodyStrong" color="accentText" onPress={() => Share.share({ message: `${match.sideA.name} ${match.scoreA}–${match.scoreB} ${match.sideB.name} · live on BaskyCLub` })}>Share</Text>
      ) }} />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 }}>
        <View style={{ backgroundColor: '#1A1C1C', borderRadius: radius.xl, borderCurve: 'continuous', padding: space.xl, gap: space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
            {match.status === 'live' ? <LiveBadge /> : <Tag label="Final" />}
            <View style={{ paddingHorizontal: 10, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' }}>
              <Text variant="micro" style={{ color: '#fff' }}>{match.status === 'live' ? `Quarter ${match.quarter}` : 'Full time'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {[{ n: match.sideA.name, s: match.scoreA, st: aStyle }, null, { n: match.sideB.name, s: match.scoreB, st: bStyle }].map((x, i) =>
              x ? (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
                  <Avatar name={x.n} size={44} square />
                  <Text variant="bodyStrong" numberOfLines={1} style={{ color: '#fff' }}>{x.n}</Text>
                  <Animated.Text style={[{ fontFamily: fonts.display, fontSize: 64, lineHeight: 70, letterSpacing: -2, color: '#fff', fontVariant: ['tabular-nums'] }, x.st]}>{x.s}</Animated.Text>
                </View>
              ) : (
                <Text key={i} style={{ fontFamily: fonts.display, fontSize: 28, color: 'rgba(255,255,255,0.35)' }}>:</Text>
              ),
            )}
          </View>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            {[match.tournamentName, match.venueText, match.districtName].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {isScorer ? (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>{pad('A')}{pad('B')}</View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><Button kind="secondary" label={match.quarter >= 4 ? 'End game' : `End Q${match.quarter}`} onPress={() => nextQuarter(match.id)} /></View>
              <View style={{ flex: 1 }}><Button kind="ghost" label="Hand over" onPress={handOver} /></View>
            </View>
          </View>
        ) : (
          match.status === 'live' && (
            <Text variant="caption" color="textMuted" style={{ textAlign: 'center' }}>Scored live by {scorer?.name ?? 'the room creator'}</Text>
          )
        )}

        <Text variant="heading">Players</Text>
        <View style={{ flexDirection: 'row', gap: space.md, marginTop: -space.sm }}>
          {roster(match.sideA.name, playersA)}
          {roster(match.sideB.name, playersB)}
        </View>
      </ScrollView>
    </>
  );
}
