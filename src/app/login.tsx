import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Text } from '@/components/text';
import { space } from '@/theme';

/** UI only — no API calls yet. */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Preview only', 'Log in connects to the server in a later step.');
    }, 700);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to like, comment and start match rooms.">
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoComplete="current-password" textContentType="password" />
      <Text variant="caption" color="accentText" style={{ alignSelf: 'flex-end', fontFamily: 'Manrope_700Bold' }}>Forgot password?</Text>
      <Button label="Log in" onPress={submit} loading={loading} disabled={!email || !password} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginTop: space.sm }}>
        <Text color="textSecondary">New to BaskyClub?</Text>
        <Text color="accentText" style={{ fontFamily: 'Manrope_700Bold' }} onPress={() => router.replace('/signup')}>Create an account</Text>
      </View>
    </AuthShell>
  );
}
