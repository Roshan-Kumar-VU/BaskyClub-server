import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Tag, VerifiedMark } from '@/components/badge';
import { Button } from '@/components/button';
import { CourtArt } from '@/components/court-art';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { Segmented } from '@/components/segmented';
import { StatTile } from '@/components/stat-tile';
import { Text } from '@/components/text';
import { getClub } from '@/data/repositories';
import { useData } from '@/hooks/use-data';
import { radius, space, useTheme } from '@/theme';

type Section = 'highlights' | 'members' | 'teams';
const BANNER = 260;

export default function ClubScreen() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: club } = useData(() => getClub(id), [id]);
  const [section, setSection] = useState<Section>('highlights');
  const [requested, setRequested] = useState(false);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(scrollRef);
  // Banner stretches when pulled down and parallaxes on scroll up.
  const bannerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(offset.value, [-BANNER, 0, BANNER], [-BANNER / 2, 0, BANNER * 0.5]) },
      { scale: interpolate(offset.value, [-BANNER, 0, BANNER], [2, 1, 1]) },
    ],
  }));

  if (!club) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
    <Animated.ScrollView ref={scrollRef} scrollEventThrottle={16} style={{ backgroundColor: c.background }}>
      <Animated.View style={[{ height: BANNER, overflow: 'hidden' }, bannerStyle]}>
        <CourtArt seed={club.clubId} />
        <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.25)']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={{ backgroundColor: c.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -radius.xl, paddingTop: 0 }}>
        <View style={{ paddingHorizontal: space.lg, marginTop: -40, gap: space.sm }}>
          <View style={{ borderRadius: 26, padding: 4, backgroundColor: c.background, alignSelf: 'flex-start' }}>
            <Avatar name={club.clubName} uri={club.logoUrl} size={80} square />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="title" style={{ flexShrink: 1 }}>{club.clubName}</Text>
            {club.isVerified && <VerifiedMark size={20} />}
          </View>
          {!!club.teamMotto && <Text variant="bodyStrong" color="accentText">{club.teamMotto}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {club.districtName && <Tag label={club.districtName} />}
            {club.organization && <Tag label={club.organization.shortName ?? club.organization.name} />}
            {club.kind === 'creator' && <Tag label="Creator collective" />}
          </View>
          {!!club.description && <Text color="textSecondary" style={{ marginTop: space.xs }}>{club.description}</Text>}

          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <StatTile value={club.memberCount} label="Members" />
            <StatTile value={club.teamCount} label="Teams" />
            <StatTile value={club.highlights.length} label="Posts" />
          </View>

          <View style={{ marginTop: space.md }}>
            <Button
              label={requested ? 'Request sent' : 'Request to join'}
              kind={requested ? 'secondary' : 'primary'}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setRequested((v) => !v);
              }}
            />
          </View>

          <View style={{ marginTop: space.lg, marginBottom: space.md }}>
            <Segmented
              value={section}
              onChange={setSection}
              options={[
                { value: 'highlights', label: 'Highlights' },
                { value: 'members', label: 'Members' },
                { value: 'teams', label: 'Teams' },
              ]}
            />
          </View>
        </View>

        {section === 'highlights' &&
          (club.highlights.length ? (
            club.highlights.map((p) => <PostCard key={p.postId} post={p} />)
          ) : (
            <Text color="textMuted" style={{ textAlign: 'center', padding: space.xxl }}>No highlights yet.</Text>
          ))}

        {section === 'members' && (
          <View style={{ marginHorizontal: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card, overflow: 'hidden' }}>
            {club.members.map((mv, i) => (
              <PressableScale key={mv.membership.id} scaleTo={0.99} onPress={() => router.push({ pathname: '/player/[id]', params: { id: mv.user.userId } })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <Avatar name={mv.user.name} size={40} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>{mv.user.name}</Text>
                  <Tag label={mv.role} />
                </View>
              </PressableScale>
            ))}
          </View>
        )}

        {section === 'teams' && (
          <View style={{ marginHorizontal: space.lg, gap: space.sm }}>
            {club.teams.length === 0 && <Text color="textMuted" style={{ textAlign: 'center', padding: space.xxl }}>No teams yet.</Text>}
            {club.teams.map((t) => (
              <View key={t.teamId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card }}>
                <Avatar name={t.teamName ?? 'Team'} size={44} square />
                <View style={{ flex: 1 }}>
                  <Text variant="subheading">{t.teamName}</Text>
                  <Text variant="caption" color="textMuted">{[t.gameSize, t.ageCategory, t.gender].filter(Boolean).join('  ·  ')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: space.xxl * 2 }} />
      </View>
    </Animated.ScrollView>
  );
}
