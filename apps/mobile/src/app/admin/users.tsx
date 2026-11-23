'use no memo';

import { useState } from 'react';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Card, Choice, Page } from '@/components/form';
import { Text } from '@/components/text';
import { searchUsers, setUserStatus } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

/** Find accounts; suspend or restore with a reason (logged in the change history). */
export default function AdminUsers() {
  useStoreVersion();
  const { user: me } = useSession();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'limited' | 'suspended'>('all');
  const [reason, setReason] = useState('');
  const users = q.length >= 2 || status !== 'all' ? searchUsers(q, status === 'all' ? undefined : status) : [];

  const change = (u: any, to: 'active' | 'suspended') =>
    confirm(to === 'suspended' ? `Suspend ${u.name}?` : `Restore ${u.name}?`, to === 'suspended' ? 'They will be logged out and their posts hidden.' : 'They can log in again.', to === 'suspended' ? 'Suspend' : 'Restore', () =>
      setUserStatus(u.id, to, reason.trim() || (to === 'suspended' ? 'Suspended by the Basky team' : 'Restored by the Basky team')).catch((e) => notify("Couldn't change the account", errorMessage(e))),
    );

  return (
    <Page>
      <Field label="Search by name, email or phone" value={q} onChangeText={setQ} placeholder="Type 2+ letters" autoCapitalize="none" />
      <Choice value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'limited', label: 'Waiting for parent' }, { value: 'suspended', label: 'Suspended' }]} />
      <Field label="Reason (saved in the history)" value={reason} onChangeText={setReason} placeholder="e.g. Fake profile reported twice" />
      {users.map((u) => (
        <Card key={u.id}>
          <View style={{ padding: space.lg, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text variant="subheading" style={{ flex: 1 }}>{u.name}</Text>
              <Tag label={u.status} />
            </View>
            <Text variant="caption" color="textMuted">{u.email} · {u.phone}</Text>
            {u.platformRoles.length > 0 && <Text variant="caption" color="accentText">{u.platformRoles.map((r: any) => r.role).join(', ')}</Text>}
            {u.id !== me?.userId && (
              <View style={{ flexDirection: 'row', marginTop: space.sm }}>
                {u.status === 'suspended' ? <Button compact label="Restore" onPress={() => change(u, 'active')} /> : u.status === 'active' ? <Button compact kind="secondary" label="Suspend" onPress={() => change(u, 'suspended')} /> : null}
              </View>
            )}
          </View>
        </Card>
      ))}
    </Page>
  );
}
