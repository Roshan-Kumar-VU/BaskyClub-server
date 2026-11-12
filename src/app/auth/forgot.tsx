'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Text } from '@/components/text';
import { recover, resetPassword } from '@/data/manage';
import { notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';

/** DD/MM/YYYY → YYYY-MM-DD */
const iso = (t: string) => {
  const m = t.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
};

/**
 * Forgot password (local/testing version): mobile number + date of birth must match the account,
 * then the person sets a new password straight away (the step is valid for 15 minutes).
 */
export default function Forgot() {
  const { login } = useSession();
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [step, setStep] = useState<{ token: string; name: string } | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = async () => {
    const d = iso(dob);
    if (!d) return setError('Enter your date of birth as DD/MM/YYYY.');
    setBusy(true);
    setError('');
    try {
      const r = await recover(phone, d);
      setStep({ token: r.resetToken, name: r.name });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!step) return;
    setBusy(true);
    setError('');
    try {
      await resetPassword(step.token, pw);
      await login(phone, pw);
      notify('Password changed', 'You are logged in with your new password.');
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (step) {
    return (
      <AuthShell title={`Hi ${step.name.split(' ')[0]}`} subtitle="Choose a new password. You'll be logged in right after.">
        <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" hint="At least 8 characters." />
        <Field label="New password again" value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" />
        {!!error && <Text variant="caption" color="live">{error}</Text>}
        {!!pw2 && pw !== pw2 && <Text variant="caption" color="live">The passwords don't match.</Text>}
        <Button label="Save new password" loading={busy} disabled={pw.length < 8 || pw !== pw2} onPress={save} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter the mobile number and date of birth on your account.">
      <Field label="Mobile number" value={phone} onChangeText={setPhone} placeholder="98765 43210" keyboardType="phone-pad" />
      <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="DD / MM / YYYY" keyboardType="number-pad" />
      {!!error && <Text variant="caption" color="live">{error}</Text>}
      <Button label="Continue" loading={busy} disabled={!phone || !dob} onPress={check} />
      <Text variant="caption" color="textMuted">After 5 wrong tries the number is locked for an hour.</Text>
    </AuthShell>
  );
}
