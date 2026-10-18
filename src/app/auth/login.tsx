import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Text } from '@/components/text';
import { DEMO_USER_ID, useSession } from '@/lib/session';
import { fonts, space } from '@/theme';

/** Mock login. Any email/password signs in as the demo account until the API exists. */
export default function Login() {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const go = () => {
    setLoading(true);
    setTimeout(() => {
      login(DEMO_USER_ID);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }, 500);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to post, join clubs and score match rooms.">
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoComplete="current-password" />
      <Button label="Log in" onPress={go} loading={loading} disabled={!email || !password} />
      <Button label="Use demo account (Roshan)" kind="ghost" onPress={go} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginTop: space.sm }}>
        <Text color="textSecondary">New to BaskyCLub?</Text>
        <Text color="accentText" style={{ fontFamily: fonts.bodyBold }} onPress={() => router.replace('/auth/signup')}>Create an account</Text>
      </View>
    </AuthShell>
  );
}
