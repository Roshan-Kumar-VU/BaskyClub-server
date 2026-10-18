import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileView } from '@/components/profile-view';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/stat-tile';
import { Text } from '@/components/text';
import { Wordmark } from '@/components/wordmark';
import { getDistrict, getProfile } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import { useSession } from '@/lib/session';
import { radius, space, useTheme } from '@/theme';

/** Profile ignores scope. Visitors see log in / sign up. */
export default function Profile() {
  useStoreVersion();
  const { c } = useTheme();
  const { user, logout } = useSession();

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScreenHeader title="Profile" />
        <View style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg }}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <Wordmark size={30} />
            <Text variant="title" style={{ textAlign: 'center' }}>Your basketball profile</Text>
            <Text color="textSecondary" style={{ textAlign: 'center' }}>Log in to post, join clubs, follow players and score match rooms.</Text>
          </View>
          <Button label="Log in" onPress={() => router.push('/auth/login')} />
          <Button label="Create account" kind="secondary" onPress={() => router.push('/auth/signup')} />
        </View>
      </View>
    );
  }

  const p = getProfile(user.userId);
  const rows = [
    { label: 'Home district', value: getDistrict(user.homeDistrictCode)?.name ?? 'Not set', ios: 'mappin.and.ellipse', android: 'location_on', onPress: () => router.push('/district-picker') },
    { label: 'Edit profile', ios: 'pencil', android: 'edit', onPress: () => Alert.alert('Coming soon', 'Profile editing connects to the server in a later step.') },
    { label: 'Log out', ios: 'rectangle.portrait.and.arrow.right', android: 'logout', onPress: logout, danger: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title="Profile" />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {p && <ProfileView p={p} />}
        <SectionHeader title="Settings" />
        <View style={{ marginHorizontal: space.lg, marginBottom: space.xxl * 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.card, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <PressableScale key={r.label} scaleTo={0.99} onPress={r.onPress}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderTopWidth: i ? 0.5 : 0, borderTopColor: c.line }}>
                <Icon ios={r.ios} android={r.android} color={r.danger ? c.live : c.accent} />
                <Text variant="bodyStrong" style={{ flex: 1, color: r.danger ? c.live : c.text }}>{r.label}</Text>
                {r.value && <Text color="textMuted">{r.value}</Text>}
              </View>
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
