import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Text } from '@/components/text';
import { errorMessage, TEST_ACCOUNTS, TEST_PASSWORD, useSession } from '@/lib/session';
import { fonts, radius, space, useTheme } from '@/theme';

/** Log in with email or mobile number + password (shared API). In development, test accounts are one tap away. */
export default function Login() {
  const { c } = useTheme();
  const { login } = useSession();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const go = async (loginId: string, pw: string, key = 'form') => {
    setLoading(key);
    setError('');
    try {
      await login(loginId.trim(), pw);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to post, join clubs and follow players.">
      <Field label="Email or mobile number" value={id} onChangeText={setId} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoComplete="current-password" />
      {!!error && <Text variant="caption" style={{ color: c.live }}>{error}</Text>}
      <Button label="Log in" onPress={() => go(id, password)} loading={loading === 'form'} disabled={!id || !password || !!loading} />
      <Text color="accentText" style={{ fontFamily: fonts.bodyBold, textAlign: 'center' }} onPress={() => router.push('/auth/forgot')}>Forgot password?</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginTop: space.sm }}>
        <Text color="textSecondary">New to BaskyCLub?</Text>
        <Text color="accentText" style={{ fontFamily: fonts.bodyBold }} onPress={() => router.replace('/auth/signup')}>Create an account</Text>
      </View>

      {__DEV__ && (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <Text variant="caption" color="textMuted" style={{ fontFamily: fonts.bodyBold }}>TEST ACCOUNTS (development only)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {TEST_ACCOUNTS.map((a) => (
              <Pressable
                key={a.email}
                accessibilityLabel={`Log in as ${a.label}`}
                disabled={!!loading}
                onPress={() => go(a.email, TEST_PASSWORD, a.email)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: c.line, backgroundColor: loading === a.email ? c.accentSoft : c.card }}>
                <Text variant="caption" style={{ fontFamily: fonts.bodySemi }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </AuthShell>
  );
}
