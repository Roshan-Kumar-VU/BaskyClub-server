'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Choice, Page, PersonPicker, Row } from '@/components/form';
import { Text } from '@/components/text';
import { getOrgRaw } from '@/data/repo';
import { endOrgMember, getOrgMembers, grantOrgMember } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

const label = { owner: 'Owner', admin: 'Admin', member: 'Member' } as const;

/** Who can use the association tools. Owners are set by the Basky team; owners add admins; owners and admins add members. */
export default function AssociationTeam() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const org = getOrgRaw(id);
  const rows = getOrgMembers(id);
  const isBasky = !!user?.platformRoles.some((r) => r === 'basky_admin' || r === 'super_admin');
  const mine = org?.viewer?.accessLevel as keyof typeof label | null;
  const allowed: (keyof typeof label)[] = isBasky ? ['owner', 'admin', 'member'] : mine === 'owner' ? ['admin', 'member'] : ['member'];
  const [level, setLevel] = useState<keyof typeof label>('member');
  const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && notify(ok)).catch((e) => notify("Couldn't save", errorMessage(e)));
  const canRemove = (lvl: keyof typeof label, self: boolean) => self || isBasky || (mine === 'owner' && lvl !== 'owner') || (mine === 'admin' && lvl === 'member');

  return (
    <Page>
      <Card title="Team">
        {rows.map((r, i) => (
          <Row key={r.id} first={i === 0} label={r.user.name + (r.user.id === user?.userId ? ' (you)' : '')} sub={label[r.accessLevel]} right={canRemove(r.accessLevel, r.user.id === user?.userId) ? <Button compact kind="secondary" label={r.user.id === user?.userId ? 'Step down' : 'Remove'} onPress={() => confirm(`Remove ${r.user.name}?`, 'They lose access to the association tools.', 'Remove', () => run(endOrgMember(r.id, id)))} /> : undefined} />
        ))}
      </Card>
      <Card title="Add someone">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Choice value={level} onChange={setLevel} options={allowed.map((l) => ({ value: l, label: label[l] }))} />
          <PersonPicker label="Person" exclude={rows.map((r) => r.user.id)} onPick={(p) => run(grantOrgMember(id, p.id, level), `${p.name} added as ${label[level]}`)} />
          <Text variant="caption" color="textMuted">Members can post for the association and send alerts. Admins can also edit the page, office bearers, Media and affiliations.</Text>
        </View>
      </Card>
    </Page>
  );
}
