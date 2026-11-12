'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { Card, Page } from '@/components/form';
import { Text } from '@/components/text';
import { decideCreatorRequest, getCreatorRequests, type CreatorRequest } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

/** Creator badge requests, oldest first. Declining needs a short reason the person will see. */
export default function AdminCreators() {
  useStoreVersion();
  const { user } = useSession();
  const team = user?.platformRoles.some((r) => r === 'basky_admin' || r === 'super_admin');
  if (!team) return <EmptyState ios="lock.fill" android="lock" title="BaskyCLub team only" />;
  const list = getCreatorRequests();
  return (
    <Page>
      {!list.length && <EmptyState ios="checkmark.circle" android="check_circle" title="No Creator requests waiting" />}
      {list.map((r) => <Request key={r.id} r={r} self={r.person.id === user!.userId} />)}
    </Page>
  );
}

function Request({ r, self }: { r: CreatorRequest; self: boolean }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const p = r.person;
  const act = async (d: 'approve' | 'decline') => {
    setBusy(true);
    try {
      await decideCreatorRequest(r.id, d, note.trim() || undefined);
      notify(d === 'approve' ? `${p.name} is now a Creator` : 'Request declined');
    } catch (e) {
      notify('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <View accessibilityLabel={`Request from ${p.name}`} style={{ padding: space.lg, gap: space.sm }}>
        <Text variant="subheading" onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })}>{p.name} ›</Text>
        <Text variant="caption" color="textMuted">
          {p.followers} {p.followers === 1 ? 'follower' : 'followers'} · {p.posts} {p.posts === 1 ? 'post' : 'posts'} · asked {new Date(r.requestedAt).toLocaleDateString('en-IN')}
        </Text>
        {!!p.bio && <Text>{p.bio}</Text>}
        {!!p.instagram && <Text variant="caption">Instagram: {p.instagram}</Text>}
        {!!p.youtube && <Text variant="caption">YouTube: {p.youtube}</Text>}
        {self ? (
          <Text variant="caption" color="textMuted">This is your own request — someone else in the team decides it.</Text>
        ) : (
          <>
            <Field label="Note to the person" value={note} onChangeText={setNote} placeholder="Needed to decline, e.g. post a few more videos" />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><Button compact label="Approve" loading={busy} onPress={() => act('approve')} /></View>
              <View style={{ flex: 1 }}><Button compact kind="secondary" label="Decline" disabled={busy || !note.trim()} onPress={() => act('decline')} /></View>
            </View>
          </>
        )}
      </View>
    </Card>
  );
}
