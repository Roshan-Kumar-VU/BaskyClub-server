'use no memo';

import { View } from 'react-native';

import { Card, Page } from '@/components/form';
import { Text } from '@/components/text';
import { getChangeLog } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { ago } from '@/lib/format';
import { space } from '@/theme';

/** Who changed what (#61). */
export default function History() {
  useStoreVersion();
  const rows = getChangeLog();
  return (
    <Page gap={space.sm}>
      {rows.map((r) => (
        <Card key={r.id}>
          <View style={{ padding: space.md, gap: 2 }}>
            <Text variant="caption" color="textMuted">{ago(r.at)} · {r.actor?.name ?? 'system'}</Text>
            <Text variant="bodyStrong">{r.action} {r.entity}</Text>
            <Text variant="caption" color="textSecondary" numberOfLines={3}>{JSON.stringify(r.afterValue ?? {})}</Text>
          </View>
        </Card>
      ))}
    </Page>
  );
}
