'use no memo';

import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Card, Page } from '@/components/form';
import { Text } from '@/components/text';
import { getPendingCourts, reviewCourt } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

/** Courts suggested by users wait here before they show on the map. */
export default function AdminCourts() {
  useStoreVersion();
  const list = getPendingCourts();
  const act = (id: string, d: 'approve' | 'reject') => reviewCourt(id, d).catch((e) => notify('Error', errorMessage(e)));
  return (
    <Page>
      {!list.length && <EmptyState ios="checkmark.circle" android="check_circle" title="No courts waiting" />}
      {list.map((c) => (
        <Card key={c.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Text variant="subheading">{c.name}</Text>
            <Text variant="caption" color="textMuted">{c.address ?? c.districtCode} · {c.indoor ? 'Indoor' : 'Outdoor'}{c.surface ? ` · ${c.surface}` : ''} · suggested by {c.createdBy?.name ?? '—'}</Text>
            <Text variant="caption" color="textMuted">{c.latitude}, {c.longitude}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}><Button compact label="Approve" onPress={() => act(c.id, 'approve')} /></View>
              <View style={{ flex: 1 }}><Button compact kind="secondary" label="Reject" onPress={() => act(c.id, 'reject')} /></View>
            </View>
          </View>
        </Card>
      ))}
    </Page>
  );
}
