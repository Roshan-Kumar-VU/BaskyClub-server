'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Page, Row } from '@/components/form';
import { Text } from '@/components/text';
import { requestCreatorBadge, withdrawCreatorRequest } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Ask the BaskyCLub team for the Creator badge, and see where the request stands. */
export default function CreatorBadge() {
  useStoreVersion();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const b = user.creatorBadge;
  const missing = [!user.bio && 'a bio', !user.instagram && !user.youtube && 'your Instagram or YouTube'].filter(Boolean) as string[];

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      notify(done);
    } catch (e) {
      notify("Couldn't do that", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Card title="What Creators get">
        <View style={{ padding: space.lg, gap: space.sm }}>
          <Text>• A Creator tag on your profile and posts</Text>
          <Text>• Your posts go live straight away, without waiting for review</Text>
          <Text variant="caption" color="textMuted">For people who share basketball content regularly — drills, highlights, coaching tips. The BaskyCLub team looks at your profile and posts before deciding.</Text>
        </View>
      </Card>

      {user.isMinor ? (
        <Text color="textMuted">The Creator badge is for people aged 18 or over.</Text>
      ) : b.status === 'active' ? (
        <Card title="Status">
          <Row first label="You're a BaskyCLub Creator" sub={`Since ${day(b.since)}`} />
        </Card>
      ) : b.status === 'requested' ? (
        <>
          <Card title="Status">
            <Row first label="Waiting for the BaskyCLub team" sub={`Asked on ${day(b.since)}. You'll get an alert when they decide.`} />
          </Card>
          <Button kind="secondary" label="Withdraw request" loading={busy} onPress={() => confirm('Withdraw your request?', 'You can ask again any time.', 'Withdraw', () => run(withdrawCreatorRequest, 'Request withdrawn'))} />
        </>
      ) : b.status === 'declined' ? (
        <Card title="Status">
          <Row first label="Not this time" sub={`You can ask again from ${day(b.canAskFrom)}.`} />
          {!!b.note && <View style={{ padding: space.lg, paddingTop: 0 }}><Text>From the team: {b.note}</Text></View>}
        </Card>
      ) : (
        <>
          {missing.length > 0 && (
            <Card title="Before you ask">
              <Row first label={`Add ${missing.join(' and ')}`} sub="It helps the team see what you make." onPress={() => router.push('/settings/profile')} />
            </Card>
          )}
          <Button label="Request Creator badge" loading={busy} disabled={user.awaitingParent} onPress={() => run(requestCreatorBadge, 'Request sent to the BaskyCLub team')} />
        </>
      )}
    </Page>
  );
}
