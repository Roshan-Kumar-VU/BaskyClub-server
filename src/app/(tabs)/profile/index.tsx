import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PlayerProfileView } from '@/components/player-profile';
import { PressableScale } from '@/components/pressable-scale';
import { SectionHeader } from '@/components/stat-tile';
import { Text } from '@/components/text';
import { CURRENT_USER_ID, getPlayer } from '@/data/repositories';
import { useData } from '@/hooks/use-data';
import { radius, space, useTheme } from '@/theme';

/** Draft: shows a mock signed-in user. Real sign-in arrives with the API. */
export default function ProfileScreen() {
  const { c } = useTheme();
  const { data } = useData(() => getPlayer(CURRENT_USER_ID), []);

  const rows = [
    { label: 'Log in screen', ios: 'person.badge.key', android: 'login', href: '/login' as const },
    { label: 'Sign up screen', ios: 'person.badge.plus', android: 'person_add', href: '/signup' as const },
  ];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      {data && <PlayerProfileView profile={data} />}
      <SectionHeader title="Preview" />
      <View style={{ marginHorizontal: space.lg, marginBottom: space.xxl, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <PressableScale key={r.label} scaleTo={0.99} onPress={() => router.push(r.href)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Icon ios={r.ios} android={r.android} color={c.accent} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>{r.label}</Text>
              <Icon ios="chevron.right" android="chevron_right" size={14} color={c.textMuted} weight="semibold" />
            </View>
          </PressableScale>
        ))}
      </View>
    </ScrollView>
  );
}
