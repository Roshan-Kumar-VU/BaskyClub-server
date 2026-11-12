'use no memo';

import { useState } from 'react';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { back, Page } from '@/components/form';
import { Text } from '@/components/text';
import { changePassword } from '@/data/manage';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';

export default function ChangePassword() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = !!again && next !== again;

  const save = async () => {
    setBusy(true);
    try {
      await changePassword(cur, next);
      notify('Password changed');
      back();
    } catch (e) {
      notify("Couldn't change the password", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Field label="Current password" value={cur} onChangeText={setCur} secureTextEntry autoComplete="current-password" />
      <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint="At least 8 characters." />
      <Field label="New password again" value={again} onChangeText={setAgain} secureTextEntry autoComplete="new-password" />
      {mismatch && <Text variant="caption" color="live">The new passwords don't match.</Text>}
      <Button label="Change password" loading={busy} disabled={!cur || next.length < 8 || next !== again} onPress={save} />
    </Page>
  );
}
