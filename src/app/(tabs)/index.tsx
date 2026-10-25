import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Tag } from '@/components/badge';
import { DistrictBanner } from '@/components/district-banner';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { TopTabs } from '@/components/top-tabs';
import { Wordmark } from '@/components/wordmark';
import { canSeeOrg, getAlerts, getAssociationForDistrict, getFeed, getOrganization } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useScope } from '@/lib/scope';
import { useSession } from '@/lib/session';
import { radius, space, useTheme } from '@/theme';

type HubTab = 'feed' | 'association';

/** Home: All India feed, or the district hub (Feed · Association). Post and Alerts sit in the header. */
export default function Home() {
  useStoreVersion();
  const { c } = useTheme();
  const s = useScope();
  const { user, requireLogin } = useSession();
  const [tab, setTab] = useState<HubTab>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const isDistrict = s.scope === 'district' && !!s.districtCode;
  const alertCount = getAlerts(user?.userId).length;

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader
        titleNode={<Wordmark size={22} />}
        scoped
        right={
          <>
            <Pressable hitSlop={10} onPress={() => requireLogin(() => router.push('/alerts'))}>
              <Icon ios="bell" android="notifications_none" size={23} color={c.text} />
              {!!user && alertCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="micro" style={{ color: '#fff', fontSize: 10 }}>{alertCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable hitSlop={10} onPress={() => requireLogin(() => router.push('/post/new'))}>
              <Icon ios="plus.app" android="add_box" size={25} color={c.text} />
            </Pressable>
          </>
        }>
        {isDistrict && (
          <View style={{ paddingHorizontal: space.lg }}>
            <TopTabs value={tab} onChange={setTab} tabs={[{ value: 'feed', label: 'Feed' }, { value: 'association', label: 'Association' }]} />
          </View>
        )}
      </ScreenHeader>
      {(!isDistrict || tab === 'feed') && (
        <FlashList
          data={getFeed(s)}
          keyExtractor={(p) => p.postId}
          renderItem={({ item }) => <PostCard post={item} />}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={<DistrictBanner />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />}
          ListEmptyComponent={<EmptyState ios="photo.on.rectangle" android="photo_library" title={`No posts in ${s.districtName ?? 'this area'} yet`} body="Posts from clubs and players here will show up in this feed." />}
        />
      )}
      {isDistrict && tab === 'association' && <AssociationTab />}
    </View>
  );
}

function AssociationTab() {
  const { c } = useTheme();
  const s = useScope();
  const { user } = useSession();
  const assoc = getAssociationForDistrict(s.districtCode);
  const visible = canSeeOrg(assoc, user?.userId);
  const parent = getOrganization(assoc?.parentId);
  const open = (id: string) => router.push({ pathname: '/association/[id]', params: { id } });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {!assoc || !visible ? (
        <EmptyState ios="building.columns" android="account_balance" title="Not yet on BaskyCLub" body={`The basketball association for ${s.districtName} isn't on BaskyCLub yet.`} />
      ) : (
        <PressableScale onPress={() => open(assoc.id)}>
          <View style={{ backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: c.line, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <Avatar name={assoc.shortName ?? assoc.name} size={56} square />
              <View style={{ flex: 1 }}>
                <Text variant="heading">{assoc.name}</Text>
                <Text variant="caption" color="textMuted">Covers {s.districtName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Tag label={assoc.pageStatus === 'claimed' ? 'Official page' : assoc.pageStatus === 'published' ? 'Managed by BaskyCLub' : 'Draft (Basky team only)'} />
            </View>
          </View>
        </PressableScale>
      )}
      {parent && canSeeOrg(parent, user?.userId) && (
        <PressableScale onPress={() => open(parent.id)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.card, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: c.line, padding: space.lg }}>
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
