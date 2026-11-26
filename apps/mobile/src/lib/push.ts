/**
 * Push alerts (PRD §6, §10): announcements and replies to your comments reach the phone.
 *
 * After login the phone's Expo push token is sent to the API (POST /api/devices); on logout it is
 * removed first, so the next person using this phone doesn't get the previous person's alerts.
 *
 * Needs an EAS project id (app.json → extra.eas.projectId, set by `eas init`) and a development or
 * store build: Expo Go can't receive remote push on Android (SDK 53+). Until then registering
 * quietly does nothing; nothing else in the app depends on it.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { del, post } from '@/data/api';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let registeredToken: string | null = null;

if (supported) {
  // Show alerts that arrive while the app is open
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/** Ask permission, get the token and register it with the API. Returns the token, or null if not possible here. */
export async function registerForPush(): Promise<string | null> {
  if (!supported) return null;
  const id = projectId();
  if (!id) {
    if (__DEV__) console.info('[push] no EAS projectId yet (run `eas init`): skipping push registration');
    return null;
  }
  try {
    if (Platform.OS === 'android') {
      // Android 13+: the permission prompt only appears once a channel exists
      await Notifications.setNotificationChannelAsync('default', { name: 'Alerts', importance: Notifications.AndroidImportance.HIGH });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    await post('/api/devices', { token, platform: Platform.OS });
    registeredToken = token;
    return token;
  } catch (e) {
    // e.g. Expo Go on Android, no network, or no Google Play services: alerts still show in the bell
    if (__DEV__) console.info('[push] registration skipped:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** Remove this phone from the logged-in account (call before the login token is cleared). */
export async function unregisterPush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await del(`/api/devices?token=${encodeURIComponent(token)}`);
  } catch {
    // Offline: the server also moves a token to whoever registers it next
  }
}

/** Where a tapped alert goes: the post it is about (reply, or an announcement's feed card), else the bell. */
function openFromAlert(data: Record<string, unknown> | undefined) {
  const postId = typeof data?.postId === 'string' ? data.postId : null;
  if (postId) router.push({ pathname: '/post/[id]', params: { id: postId } });
  else if (data?.type === 'announcement' || data?.type === 'reply') router.push('/alerts');
}

/**
 * Root layout: open the right screen when an alert is tapped, also when the tap started the app.
 * `ready`: the navigator is on screen (routing before that is lost).
 */
export function useAlertTaps(ready: boolean) {
  useEffect(() => {
    if (!supported || !ready) return;
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        openFromAlert(r.notification.request.content.data);
        Notifications.clearLastNotificationResponseAsync();
      }
    });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openFromAlert(r.notification.request.content.data));
    return () => sub.remove();
  }, [ready]);
}
