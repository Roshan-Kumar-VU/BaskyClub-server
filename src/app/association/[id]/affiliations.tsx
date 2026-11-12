'use no memo';

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Tag } from '@/components/badge';
import { Button } from '@/components/button';
import { Card, Page, Row } from '@/components/form';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { getClubs, getOrgRaw } from '@/data/repo';
import { decideAffiliation, endAffiliation, getOrgAffiliations, inviteClub } from '@/data/manage';
import { useStoreVersion } from '@/data/store';
import { confirm, notify } from '@/lib/notify';
import { errorMessage } from '@/lib/session';
import { space } from '@/theme';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Club affiliations (#58, #69): approve club requests, invite clubs, end links. Valid until 31 March by default. */
export default function OrgAffiliations() {
  useStoreVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = getOrgRaw(id);
  const rows = getOrgAffiliations(id);
  const [tab, setTab] = useState<'pending' | 'active' | 'invite'>('pending');
  const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && notify(ok)).catch((e) => notify("Couldn't save", errorMessage(e)));
  const covered: string[] = (org?.coveredDistricts ?? []).map((d: { code: string }) => d.code);
  const candidates = covered.flatMap((code) => getClubs({ scope: 'district', districtCode: code }, 'all'));
  const linked = new Set(rows.filter((r) => r.status === 'pending' || r.status === 'active').map((r) => r.club.id));
  const shown = rows.filter((r) => (tab === 'pending' ? r.status === 'pending' : r.status === 'active'));

  return (
    <Page>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'pending', label: `Waiting (${rows.filter((r) => r.status === 'pending').length})` }, { value: 'active', label: 'Affiliated' }, { value: 'invite', label: 'Invite' }]} />
      {tab !== 'invite' && !shown.length && <Text color="textMuted">Nothing here.</Text>}
      {tab !== 'invite' && shown.map((r) => (
        <Card key={r.id}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text variant="subheading" style={{ flex: 1 }}>{r.club.name}</Text>
              <Tag label={r.startedBy === 'club' ? 'Club asked' : 'You invited'} />
            </View>
            <Text variant="caption" color="textMuted">{r.tnbaNumber ?? 'No TNBA number yet'}{r.validUntil ? ` · valid until ${fmt(r.validUntil)}` : ''}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {r.status === 'pending' && r.startedBy === 'club' && <Button compact label="Approve" onPress={() => run(decideAffiliation(r.id, 'approve'), `${r.club.name} is affiliated`)} />}
              {r.status === 'pending' && r.startedBy === 'club' && <Button compact kind="secondary" label="Reject" onPress={() => run(decideAffiliation(r.id, 'reject'))} />}
              <Button compact kind="ghost" label={r.status === 'pending' ? 'Withdraw' : 'End'} onPress={() => confirm(`End ${r.club.name}'s affiliation?`, 'Their Affiliated badge goes away.', 'End', () => run(endAffiliation(r.id)))} />
            </View>
          </View>
        </Card>
      ))}
      {tab === 'invite' && (
        <Card title="Clubs in your districts">
          {candidates.map((c, i) => (
            <Row key={c.clubId} first={i === 0} label={c.name} sub={c.districtName} right={linked.has(c.clubId) ? <Tag label="Linked" /> : <Button compact label="Invite" onPress={() => run(inviteClub(id, c.clubId), `Invite sent to ${c.name}`)} />} />
          ))}
        </Card>
      )}
    </Page>
  );
}
