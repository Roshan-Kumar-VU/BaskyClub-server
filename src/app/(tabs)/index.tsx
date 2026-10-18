import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { DistrictBanner } from '@/components/district-banner';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { MatchCard } from '@/components/match-card';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { TopTabs } from '@/components/top-tabs';
import { Wordmark } from '@/components/wordmark';
import { getAssociationForDistrict, getFeed, getLiveMatches, getOrganization, getTournaments } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { matchTime } from '@/lib/format';
import { useScope } from '@/lib/scope';
import { radius, space, useTheme } from '@/theme';

type HubTab = 'feed' | 'tournaments' | 'association';

/** Home: All India feed, or the district hub (Feed · Tournaments · Association). */
export default function Home() {
  useStoreVersion();
  const { c } = useTheme();
  const s = useScope();
  const [tab, setTab] = useState<HubTab>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const isDistrict = s.scope === 'district' && !!s.districtCode;

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const live = getLiveMatches(s);

  const header = (
    <ScreenHeader
      titleNode={<Wordmark size={22} />}
      scoped
>
      {isDistrict && (
        <View style={{ paddingHorizontal: space.lg }}>
          <TopTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'feed', label: 'Feed' },
              { value: 'tournaments', label: 'Tournaments' },
              { value: 'association', label: 'Association' },
            ]}
          />
        </View>
      )}
    </ScreenHeader>
  );

  const feedHeader = (
    <View>
      <DistrictBanner />
      {live.length > 0 && (
        <View style={{ paddingTop: space.lg, paddingBottom: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.md }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.live }} />
            <Text variant="subheading">Live now</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {live.map((mt) => <MatchCard key={mt.id} match={mt} compactWidth={280} />)}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {header}
      {(!isDistrict || tab === 'feed') && (
        <FlashList
          data={getFeed(s)}
          keyExtractor={(p) => p.postId}
          renderItem={({ item }) => <PostCard post={item} />}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={feedHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
          ListEmptyComponent={<EmptyState ios="photo.on.rectangle" android="photo_library" title={`No posts in ${s.districtName ?? 'this area'} yet`} body="Posts from clubs and players here will show up in this feed." />}
        />
      )}
      {isDistrict && tab === 'tournaments' && <TournamentsTab />}
      {isDistrict && tab === 'association' && <AssociationTab />}
    </View>
  );
}

function TournamentsTab() {
  const { c } = useTheme();
  const s = useScope();
  const list = getTournaments(s);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {list.length === 0 ? (
        <EmptyState ios="trophy" android="emoji_events" title="Tournaments coming soon" body={`Tournaments in ${s.districtName} will be listed here by the BaskyCLub team.`} />
      ) : (
        list.map((t) => (
          <View key={t.id} style={{ backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Tag label={t.status === 'ongoing' ? 'Ongoing' : t.status === 'upcoming' ? 'Upcoming' : 'Completed'} />
              <Tag label={t.gameSize} />
            </View>
            <Text variant="heading">{t.name}</Text>
            <Text variant="caption" color="textMuted">{[t.location, matchTime(t.startDate)].filter(Boolean).join('  ·  ')}</Text>
            {t.organizerOrgId && <Text variant="caption" color="textSecondary">Organised by {getOrganization(t.organizerOrgId)?.name}</Text>}
          </View>
        ))
      )}
      <Text variant="caption" color="textMuted" style={{ textAlign: 'center', marginTop: space.md }}>Listings only. Registration opens in a later version.</Text>
    </ScrollView>
  );
}

function AssociationTab() {
  const { c } = useTheme();
  const s = useScope();
  const assoc = getAssociationForDistrict(s.districtCode);
  const parent = getOrganization(assoc?.parentId);
  if (!assoc) {
    return <EmptyState ios="building.columns" android="account_balance" title="No association listed" body={`We don't have a basketball association for ${s.districtName} yet.`} />;
  }
  const open = (id: string) => router.push({ pathname: '/association/[id]', params: { id } });
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <PressableScale onPress={() => open(assoc.id)}>
        <View style={{ backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Avatar name={assoc.shortName ?? assoc.name} size={56} square />
            <View style={{ flex: 1 }}>
              <Text variant="heading">{assoc.name}</Text>
              <Text variant="caption" color="textMuted">District association covering {s.districtName}</Text>
            </View>
          </View>
          {assoc.isPlaceholder ? <Tag label="Not yet on BaskyCLub" /> : <View style={{ flexDirection: 'row' }}><Tag label="Official page" /></View>}
        </View>
      </PressableScale>
      {parent && (
        <PressableScale onPress={() => open(parent.id)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg }}>
            <Icon ios="arrow.up.circle" android="north" color={c.official} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textMuted">State body</Text>
              <Text variant="bodyStrong">{parent.name}</Text>
            </View>
            <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} />
          </View>
        </PressableScale>
      )}
    </ScrollView>
  );
}
