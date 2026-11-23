'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Card, Choice, Page, Toggle } from '@/components/form';
import { Text } from '@/components/text';
import { type ApiMember, getClubMembersRaw, getClubRaw } from '@/data/repo';
import { endClubRole, grantClubRole, removeMember, setMemberDetails } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage, useSession } from '@/lib/session';
import { space } from '@/theme';

const positions = (['PG', 'SG', 'SF', 'PF', 'C'] as const).map((p) => ({ value: p, label: p }));

/**
 * People and roles. Owner: admins + captain + remove anyone but the owner.
 * Admin: captain + remove players (not admins). Everyone sees the same list.
 */
export default function ClubMembers() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const club = getClubRaw(id);
  const members = getClubMembersRaw(id);
  if (!club) return null;
  if (!club.viewer.canManage) return <EmptyState ios="lock.fill" android="lock" title="Owners and admins only" />;
  const isOwner = club.viewer.isOwner;
  const roleRow = (userId: string, role: string) => club.staff.find((s) => s.id === userId && s.role === role);
  const run = (p: Promise<unknown>) => p.catch((e) => notify("Couldn't save", errorMessage(e)));

  const member = (m: ApiMember) => {
    const isAdmin = m.roles.includes('admin');
    const isCaptain = m.roles.includes('captain');
    const isOwnerRow = m.roles.includes('owner');
    const self = m.user.id === user?.userId;
    return (
      <Card key={m.id}>
        <View style={{ padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text variant="subheading" style={{ flexShrink: 1 }}>{m.user.name}{self ? ' (you)' : ''}</Text>
            {m.roles.map((r) => <Tag key={r} label={r} />)}
          </View>
          <Toggle label="Plays for the club" value={m.isPlayer} onChange={(v) => run(setMemberDetails(m.id, id, { isPlayer: v }))} />
          {m.isPlayer && <Choice value={m.primaryPosition ?? undefined} onChange={(v) => run(setMemberDetails(m.id, id, { primaryPosition: v }))} options={positions} />}
          <Toggle label="Coach" value={m.isCoach} onChange={(v) => run(setMemberDetails(m.id, id, { isCoach: v }))} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {isOwner && !isOwnerRow && !isAdmin && <Button compact kind="secondary" label="Make admin" onPress={() => run(grantClubRole(id, m.user.id, 'admin'))} />}
            {isOwner && isAdmin && <Button compact kind="secondary" label="Remove admin" onPress={() => run(endClubRole(roleRow(m.user.id, 'admin')!.roleId, id))} />}
            {!isCaptain && <Button compact kind="secondary" label="Make captain" onPress={() => run(grantClubRole(id, m.user.id, 'captain'))} />}
            {isCaptain && <Button compact kind="secondary" label="Remove captain" onPress={() => run(endClubRole(roleRow(m.user.id, 'captain')!.roleId, id))} />}
            {!isOwnerRow && !self && (isOwner || !isAdmin) && (
              <Button compact kind="ghost" label="Remove from club" onPress={() => confirm(`Remove ${m.user.name}?`, 'Their membership ends; history is kept.', 'Remove', () => run(removeMember(m.id, id)))} />
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Page>
      <Text variant="caption" color="textMuted">{members.length} members · {isOwner ? 'You own this club.' : 'You are an admin: you can choose the captain and remove players.'}</Text>
      {members.map(member)}
    </Page>
  );
}
