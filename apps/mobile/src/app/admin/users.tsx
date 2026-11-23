'use no memo';

import { useState } from 'react';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Card, Choice, Page } from '@/components/form';
import { Text } from '@/components/text';
import { type AccountStatus, searchUsers, setUserStatus } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

/** What each change means, shown before it happens (PRD §8: active, limited, suspended, deleted). */
const ACTIONS: Record<Exclude<AccountStatus, 'deleted'> | 'deleted', { button: string; title: (n: string) => string; body: string; reason: string }> = {
  active: { button: 'Restore', title: (n) => `Restore ${n}?`, body: 'They can log in and use BaskyCLub fully again.', reason: 'Restored by the Basky team' },
  limited: {
    button: 'Limit',
    title: (n) => `Limit ${n} to browsing?`,
    body: "They can still log in and look around, but can't post, comment, like, follow or join clubs.",
    reason: 'Limited by the Basky team',
  },
  suspended: { button: 'Suspend', title: (n) => `Suspend ${n}?`, body: 'They will be logged out and their posts hidden.', reason: 'Suspended by the Basky team' },
  deleted: {
    button: 'Delete',
    title: (n) => `Delete ${n}'s account?`,
    body: "They can't log in again and their profile and posts disappear. This can't be undone here.",
    reason: 'Deleted by the Basky team',
  },
};

/** Which changes make sense from each status. */
const NEXT: Record<AccountStatus, AccountStatus[]> = {
  active: ['limited', 'suspended', 'deleted'],
  limited: ['active', 'suspended', 'deleted'],
  suspended: ['active', 'deleted'],
  deleted: [],
};

/** Find accounts; change their status with a reason (logged in the change history). */
export default function AdminUsers() {
  useStoreVersion();
  const { user: me } = useSession();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | AccountStatus>('all');
  const [reason, setReason] = useState('');
  const users = q.length >= 2 || status !== 'all' ? searchUsers(q, status === 'all' ? undefined : status) : [];

  const change = (u: { id: string; name: string }, to: AccountStatus) => {
    const a = ACTIONS[to];
    confirm(a.title(u.name), a.body, a.button, () =>
      setUserStatus(u.id, to, reason.trim() || a.reason).catch((e) => notify("Couldn't change the account", errorMessage(e))),
    );
  };

  return (
    <Page>
      <Field label="Search by name, email or phone" value={q} onChangeText={setQ} placeholder="Type 2+ letters" autoCapitalize="none" />
      <Choice
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'limited', label: 'Limited' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'deleted', label: 'Deleted' },
        ]}
      />
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
            {u.status === 'limited' && <Text variant="caption" color="textMuted">Under-18 accounts waiting for a parent become active only through the parent's link.</Text>}
            {u.id !== me?.userId && NEXT[u.status as AccountStatus]?.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
                {NEXT[u.status as AccountStatus].map((to) => (
                  <Button key={to} compact kind={to === 'active' ? 'primary' : 'secondary'} label={ACTIONS[to].button} onPress={() => change(u, to)} />
                ))}
              </View>
            )}
          </View>
        </Card>
      ))}
    </Page>
  );
}
