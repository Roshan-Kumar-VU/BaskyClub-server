import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { ClubRow } from '@/components/club-row';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { SectionHeader } from '@/components/stat-tile';
import { Text } from '@/components/text';
import { getAssociationDetail } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { radius, space, useTheme } from '@/theme';

const levelLabel = { national: 'National federation', state: 'State association', district: 'District association' } as const;

export default function AssociationPage() {
  useStoreVersion();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = getAssociationDetail(id);
  if (!d) return <EmptyState ios="building.columns" android="account_balance" title="Association not found" />;
  const { org } = d;
  const open = (oid: string) => router.push({ pathname: '/association/[id]', params: { id: oid } });

  return (
    <>
      <Stack.Screen options={{ title: org.shortName ?? '' }} />
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: space.xxl * 2 }}>
        <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
          <Avatar name={org.shortName ?? org.name} size={88} square />
          <Text variant="title" style={{ textAlign: 'center', marginTop: space.sm }}>{org.name}</Text>
          <Text color="textSecondary">{levelLabel[org.level]}</Text>
          {org.isPlaceholder ? <Tag label="Not yet on BaskyCLub" /> : <Tag label="Official page" />}
        </View>

        {org.isPlaceholder && (
          <View style={{ marginHorizontal: space.lg, padding: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.cardMuted, flexDirection: 'row', gap: space.md }}>
            <Icon ios="info.circle" android="info" size={18} color={c.textMuted} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              This page is a placeholder until the association claims it. Club link requests wait here until then.
            </Text>
          </View>
        )}

        {d.parent && (
          <PressableScale onPress={() => open(d.parent!.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, margin: space.lg, marginBottom: 0, padding: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card }}>
              <Icon ios="arrow.up.circle" android="north" color={c.official} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="textMuted">Part of</Text>
                <Text variant="bodyStrong">{d.parent.name}</Text>
              </View>
              <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} />
            </View>
          </PressableScale>
        )}

        {d.coveredDistricts.length > 0 && (
          <>
            <SectionHeader title="Covers" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg }}>
              {d.coveredDistricts.map((x) => <Tag key={x.code} label={x.name} />)}
            </View>
          </>
        )}

        {d.children.length > 0 && (
          <>
            <SectionHeader title={`District associations (${d.children.length})`} />
            <View style={{ marginHorizontal: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card, overflow: 'hidden' }}>
              {d.children.slice(0, 12).map((ch, i) => (
                <PressableScale key={ch.id} scaleTo={0.99} onPress={() => open(ch.id)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderTopWidth: i ? 0.5 : 0, borderTopColor: c.line }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{ch.name}</Text>
                    {!ch.isPlaceholder && <Icon ios="checkmark.seal.fill" android="verified" size={14} color={c.official} />}
                  </View>
                </PressableScale>
              ))}
            </View>
          </>
        )}

        <SectionHeader title="Affiliated clubs" />
        {d.clubs.length ? (
          <View style={{ marginHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden' }}>{d.clubs.map((cl) => <ClubRow key={cl.clubId} club={cl} />)}</View>
        ) : (
          <Text color="textMuted" style={{ paddingHorizontal: space.lg }}>No affiliated clubs on BaskyCLub yet.</Text>
        )}

        {d.posts.length > 0 && (
          <>
            <SectionHeader title="Official updates" />
            {d.posts.map((p) => <PostCard key={p.postId} post={p} />)}
          </>
        )}
      </ScrollView>
    </>
  );
}
