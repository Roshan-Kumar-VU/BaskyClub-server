import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/theme';

/**
 * Phase 1 tab bar: Home · Clubs · Profile. Matches is hidden until Phase 2
 * (#70–75); the post button and alerts bell live in the Home header.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <NativeTabs tintColor={c.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
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
