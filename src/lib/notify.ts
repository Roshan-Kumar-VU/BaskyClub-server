/**
 * Messages and confirmations that work on phones AND in the browser.
 * (React Native's Alert does nothing on web, so errors would be silent there.)
 */
import { Alert, Platform } from 'react-native';

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Ask before doing something; calls onYes only if confirmed. */
export function confirm(title: string, message: string, yesLabel: string, onYes: () => void, destructive = true) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesLabel, style: destructive ? 'destructive' : 'default', onPress: onYes },
  ]);
}
