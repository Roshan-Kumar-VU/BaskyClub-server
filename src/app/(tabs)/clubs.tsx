import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Chips } from '@/components/chips';
import { ClubRow } from '@/components/club-row';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { type ClubFilter, getClubs, getMyClubs } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useScope } from '@/lib/scope';
import { useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

const filters: { value: ClubFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'affiliated', label: 'Affiliated clubs' },
  { value: 'community', label: 'Community clubs' },
  { value: 'academy', label: 'Academies' },
];

export default function Clubs() {
  useStoreVersion();
  const { c } = useTheme();
  const s = useScope();
  const { user } = useSession();
  const [filter, setFilter] = useState<ClubFilter>('all');
  const [q, setQ] = useState('');
  const mine = getMyClubs(user?.userId);
  const data = getClubs(s, filter, q);

  const listHeader = (
    <View>
      {mine.length > 0 && (
        <View style={{ paddingTop: space.lg }}>
          <Text variant="subheading" style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>My clubs</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {mine.map((club) => (
              <PressableScale key={club.clubId} onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.clubId } })}>
                <View style={{ width: 120, alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card }}>
                  <Avatar name={club.clubName} size={56} square />
                  <Text variant="caption" numberOfLines={2} style={{ textAlign: 'center', fontFamily: fonts.bodyBold }}>{club.clubName}</Text>
                </View>
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      )}
      <Text variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.sm }}>
        {data.length} {data.length === 1 ? 'result' : 'results'} in {s.scope === 'district' ? s.districtName : 'India'}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title="Clubs" scoped>
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: c.fill }}>
            <Icon ios="magnifyingglass" android="search" size={16} color={c.textMuted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search clubs and academies" placeholderTextColor={c.textMuted} selectionColor={c.accent} style={{ flex: 1, color: c.text, fontFamily: fonts.bodyMedium, fontSize: 15 }} />
          </View>
        </View>
        <View style={{ paddingVertical: space.md }}>
          <Chips options={filters} value={filter} onChange={setFilter} />
        </View>
      </ScreenHeader>
      <FlashList
        data={data}
        keyExtractor={(club) => club.clubId}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={{ height: 0.5, marginLeft: 82, backgroundColor: c.line }} />}
        renderItem={({ item }) => <ClubRow club={item} />}
        ListEmptyComponent={<EmptyState ios="shield" android="shield" title="No clubs found" body={q ? `Nothing matches “${q}”.` : 'Try All India, or another filter.'} />}
      />
    </View>
  );
}
