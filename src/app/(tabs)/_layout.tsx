import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/theme';

/**
 * Fixed 5-tab bar (APP_NAV section 3). The + tab never opens a screen: it is
 * disabled for native selection and its press opens the create sheet.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <NativeTabs tintColor={c.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="matches">
        <NativeTabs.Trigger.Label>Matches</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sportscourt', selected: 'sportscourt.fill' }} md="scoreboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create" disabled listeners={{ tabPress: () => router.push('/create-sheet') }}>
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clubs">
        <NativeTabs.Trigger.Label>Clubs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shield', selected: 'shield.fill' }} md="shield" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
