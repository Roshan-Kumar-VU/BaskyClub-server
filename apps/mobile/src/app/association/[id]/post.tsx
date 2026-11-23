'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Area, back, Page } from '@/components/form';
import { Text } from '@/components/text';
import { youtubeId } from '@baskyclub/shared';
import { getOrgRaw } from '@/data/repo';
import { officialPost } from '@/data/manage';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';

/** Post as the association (any member of its team). Official posts are public. */
export default function OfficialPost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = getOrgRaw(id);
  const [text, setText] = useState('');
  const [yt, setYt] = useState('');
  const [busy, setBusy] = useState(false);
  const ytOk = !yt.trim() || !!youtubeId(yt.trim());

  const share = async () => {
    setBusy(true);
    try {
      await officialPost(id, text.trim(), yt.trim() || undefined);
      notify('Posted');
      back();
    } catch (e) {
      notify("Couldn't post", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Text variant="heading">Post as {org?.shortName ?? org?.name ?? 'the association'}</Text>
      <Area label="What's the news?" value={text} onChangeText={setText} placeholder="Results, selections, tournament dates…" max={5000} />
      <Field label="YouTube link (optional)" value={yt} onChangeText={setYt} autoCapitalize="none" placeholder="https://youtu.be/…" />
      {!ytOk && <Text variant="caption" color="live">That doesn't look like a YouTube link.</Text>}
      <Button label="Share" loading={busy} disabled={!text.trim() || !ytOk} onPress={share} />
    </Page>
  );
}
