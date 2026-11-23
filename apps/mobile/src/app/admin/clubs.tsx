'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Card, Page } from '@/components/form';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { getPendingClubs, getSuspendedClubs, reviewClub } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { ago } from '@/lib/format';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

/** Approve new clubs; suspend or reinstate (Basky team). */
export default function AdminClubs() {
  useStoreVersion();
  const [tab, setTab] = useState<'pending' | 'suspended'>('pending');
  const list = tab === 'pending' ? getPendingClubs() : getSuspendedClubs();
  const act = (id: string, d: 'approve' | 'suspend' | 'reinstate') => reviewClub(id, d).catch((e) => notify('Error', errorMessage(e)));
  return (
    <Page>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'pending', label: 'Waiting' }, { value: 'suspended', label: 'Suspended' }]} />
      {!list.length && <EmptyState ios="checkmark.circle" android="check_circle" title="Nothing here" />}
      {list.map((c) => (
        <Card key={c.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Text variant="subheading" onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })}>{c.name}</Text>
            <Text variant="caption" color="textMuted">{c.kind} · {c.districtName} · by {c.createdBy?.name ?? '—'} · {ago(c.createdAt)}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {tab === 'pending' ? (
                <>
                  <View style={{ flex: 1 }}><Button compact label="Approve" onPress={() => act(c.id, 'approve')} /></View>
                  <View style={{ flex: 1 }}><Button compact kind="secondary" label="Suspend" onPress={() => act(c.id, 'suspend')} /></View>
                </>
              ) : (
                <View style={{ flex: 1 }}><Button compact label="Reinstate" onPress={() => act(c.id, 'reinstate')} /></View>
              )}
            </View>
          </View>
        </Card>
      ))}
    </Page>
  );
}
