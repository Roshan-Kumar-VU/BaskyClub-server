'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Area, back, Choice, Page } from '@/components/form';
import { Text } from '@/components/text';
import { report } from '@/data/manage';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';

const reasons = ['Spam', 'Abuse or hate', 'Fake account', 'Unsafe or violent', 'Wrong information', 'Other'] as const;

/** Report a post, comment or person to the BaskyCLub moderators (#25). */
export default function Report() {
  const { type, id } = useLocalSearchParams<{ type: 'post' | 'comment' | 'user'; id: string }>();
  const [why, setWhy] = useState<(typeof reasons)[number]>();
  const [more, setMore] = useState('');
  const [busy, setBusy] = useState(false);
  const what = type === 'user' ? 'this person' : type === 'comment' ? 'this comment' : 'this post';

  const send = async () => {
    setBusy(true);
    try {
      await report(type, id, [why, more.trim()].filter(Boolean).join(': '));
      notify('Thanks for reporting', 'The BaskyCLub moderators will review it.');
      back();
    } catch (e) {
      notify("Couldn't send the report", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text variant="heading">Why are you reporting {what}?</Text>
      <Choice options={reasons.map((r) => ({ value: r, label: r }))} value={why} onChange={setWhy} />
      <Area label="More details (optional)" value={more} onChangeText={setMore} max={400} />
      <Button label="Send report" loading={busy} disabled={!why} onPress={send} />
      <Text variant="caption" color="textMuted">Your report is private. Respectful criticism is allowed; abuse isn't.</Text>
    </Page>
  );
}
