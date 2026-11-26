'use no memo';

import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Card, Choice, Page, PersonPicker, Row } from '@/components/form';
import { Text } from '@/components/text';
import { endPlatformRole, getPlatformRoles, grantPlatformRole } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

const label = { super_admin: 'Super admin', basky_admin: 'Basky team', moderator: 'Moderator' } as const;

/** Super admins give and end BaskyCLub roles (at least one super admin always stays). */
export default function AdminRoles() {
  useStoreVersion();
  const { user } = useSession();
  const [role, setRole] = useState<keyof typeof label>('moderator');
  if (!user?.platformRoles.includes('super_admin')) return <EmptyState ios="lock.fill" android="lock" title="Super admins only" />;
  const roles = getPlatformRoles();
  const run = (p: Promise<unknown>) => p.catch((e) => notify('Error', errorMessage(e)));
  return (
    <Page>
      <Card title="Current roles">
        {roles.map((r, i) => (
          <Row key={r.id} first={i === 0} label={r.user.name} sub={label[r.role as keyof typeof label]} right={<Button compact kind="secondary" label="End" onPress={() => confirm(`End ${r.user.name}'s role?`, `They stop being ${label[r.role as keyof typeof label]} right away.`, 'End role', () => run(endPlatformRole(r.id)))} />} />
        ))}
      </Card>
      <Card title="Give a role">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Choice value={role} onChange={setRole} options={Object.entries(label).map(([value, l]) => ({ value: value as keyof typeof label, label: l }))} />
          <PersonPicker label="Person" onPick={(p) => run(grantPlatformRole(p.id, role).then(() => notify(`${p.name} is now ${label[role]}`)))} />
          <Text variant="caption" color="textMuted">Moderators review posts. The Basky team approves clubs and manages users. Super admins can also give roles.</Text>
        </View>
      </Card>
    </Page>
  );
}
