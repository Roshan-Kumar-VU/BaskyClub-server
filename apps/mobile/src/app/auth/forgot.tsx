'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Text } from '@/components/text';
import { forgotPassword } from '@/data/manage';
import { errorMessage } from '@/lib/session';

const looksLikeEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

/**
 * Forgot password (PRD §4): we email a reset link to the account's address. The link opens the
 * website, where the new password is set. The answer is the same whether or not the email has an
 * account, so nobody can use this screen to find out who is on BaskyCLub.
 */
export default function Forgot() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await forgotPassword(email);
      setSentTo(email.trim());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your email" subtitle={`If ${sentTo} has a BaskyCLub account, we've sent it a link to set a new password.`}>
        <Text color="textSecondary">The link works for 1 hour. Open it on this phone or on a computer, set the new password, then log in here.</Text>
        <Button label="Back to log in" onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/login'))} />
        <Text variant="caption" color="accentText" style={{ textAlign: 'center' }} onPress={() => setSentTo(null)}>
          Use a different email
        </Text>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter the email on your account and we'll send you a link to set a new password.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      {!!error && <Text variant="caption" color="live">{error}</Text>}
      <Button label="Send reset link" loading={busy} disabled={!looksLikeEmail(email)} onPress={send} />
    </AuthShell>
  );
}
